import { useEffect } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import {
  classifyDrop,
  onLibraryUpdated,
  onScanProgress,
  parentFolder,
  startLibraryScan,
} from "../features/library/api";
import { isTauriRuntime } from "../services/tauri";
import { useLibraryStore } from "../stores/library-store";

export function useLibraryEvents() {
  const upsertScanEvent = useLibraryStore((s) => s.upsertScanEvent);
  const refreshAll = useLibraryStore((s) => s.refreshAll);
  const setDropHover = useLibraryStore((s) => s.setDropHover);
  const setSingleFilePrompt = useLibraryStore((s) => s.setSingleFilePrompt);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    if (!isTauriRuntime()) return;

    let unlistenProgress: (() => void) | undefined;
    let unlistenLibrary: (() => void) | undefined;
    let unlistenDrop: (() => void) | undefined;

    void onScanProgress((event) => {
      upsertScanEvent(event);
      if (
        event.status === "complete" ||
        event.status === "completed_with_errors"
      ) {
        void refreshAll();
      }
    }).then((fn) => {
      unlistenProgress = fn;
    });

    void onLibraryUpdated(() => {
      void refreshAll();
    }).then((fn) => {
      unlistenLibrary = fn;
    });

    void getCurrentWebview()
      .onDragDropEvent(async (event) => {
        switch (event.payload.type) {
          case "enter":
          case "over":
            setDropHover(true);
            return;
          case "leave":
            setDropHover(false);
            return;
          case "drop": {
            setDropHover(false);
            const paths = event.payload.paths;
            const classified = await classifyDrop(paths);

            if (
              classified.audioFiles.length === 1 &&
              classified.folders.length === 0
            ) {
              const filePath = classified.audioFiles[0];
              if (!filePath) return;
              setSingleFilePrompt({
                filePath,
                parentFolder: parentFolder(filePath),
              });
              return;
            }

            const scanPaths = [
              ...classified.folders,
              ...classified.audioFiles,
            ];
            if (scanPaths.length > 0) {
              await startLibraryScan(scanPaths);
            }
            return;
          }
          default: {
            const _exhaustive: never = event.payload;
            return _exhaustive;
          }
        }
      })
      .then((fn) => {
        unlistenDrop = fn;
      });

    return () => {
      unlistenProgress?.();
      unlistenLibrary?.();
      unlistenDrop?.();
    };
  }, [
    refreshAll,
    setDropHover,
    setSingleFilePrompt,
    upsertScanEvent,
  ]);
}
