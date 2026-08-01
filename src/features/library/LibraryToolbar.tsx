import { useEffect, useState, useTransition } from "react";
import {
  pickMusicFiles,
  pickMusicFolder,
  rescanLibrary,
  startLibraryScan,
} from "./api";
import { useLibraryStore } from "../../stores/library-store";
import { isTauriRuntime } from "../../services/tauri";
import { cn } from "../../utils/cn";

type LibraryToolbarProps = {
  showSearch?: boolean;
  sticky?: boolean;
  compact?: boolean;
  /** Softer actions for the listening-room Library header. */
  quiet?: boolean;
};

export function LibraryToolbar({
  showSearch = false,
  sticky = false,
  compact = false,
  quiet = false,
}: LibraryToolbarProps) {
  const stats = useLibraryStore((s) => s.stats);
  const searchQuery = useLibraryStore((s) => s.searchQuery);
  const setSearchQuery = useLibraryStore((s) => s.setSearchQuery);
  const loadTracks = useLibraryStore((s) => s.loadTracks);
  const [draft, setDraft] = useState(searchQuery);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const handle = window.setTimeout(() => {
      startTransition(() => {
        setSearchQuery(draft);
        void loadTracks(true);
      });
    }, 220);
    return () => window.clearTimeout(handle);
  }, [draft, loadTracks, setSearchQuery]);

  return (
    <div
      className={cn(
        "library-toolbar",
        sticky && "library-toolbar--sticky",
        quiet && "library-toolbar--quiet",
      )}
    >
      {compact || quiet ? null : (
        <div className="library-toolbar__stats" aria-live="polite">
          <span>{stats.trackCount} songs</span>
          <span>{stats.albumCount} albums</span>
          <span>{stats.artistCount} artists</span>
        </div>
      )}
      <div className="library-toolbar__actions">
        {showSearch ? (
          <label className={cn("search-field", quiet && "search-field--quiet")}>
            <span className="sr-only">Search library</span>
            <input
              type="search"
              placeholder="Search…"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
          </label>
        ) : null}
        <button
          type="button"
          className={quiet ? "text-button" : "button-primary"}
          disabled={!isTauriRuntime()}
          onClick={() => {
            void (async () => {
              const folder = await pickMusicFolder();
              if (folder) await startLibraryScan([folder]);
            })();
          }}
        >
          Add folder
        </button>
        <button
          type="button"
          className="text-button"
          disabled={!isTauriRuntime()}
          onClick={() => {
            void (async () => {
              const files = await pickMusicFiles();
              if (files.length > 0) await startLibraryScan(files);
            })();
          }}
        >
          Add songs
        </button>
        <button
          type="button"
          className={quiet ? "text-button" : undefined}
          disabled={!isTauriRuntime() || stats.trackCount === 0}
          onClick={() => {
            void rescanLibrary();
          }}
        >
          Rescan
        </button>
      </div>
    </div>
  );
}
