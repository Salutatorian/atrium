import { useEffect, useRef } from "react";
import { TagEditor } from "../../features/library/TagEditor";
import { LyricsPanel } from "../../features/lyrics/LyricsPanel";
import { QueuePanel } from "../../features/player/QueuePanel";
import {
  useShellStore,
  type InspectorTab,
} from "../../stores/shell-store";
import { usePlayerStore } from "../../stores/player-store";
import { useSettingsStore } from "../../stores/settings-store";
import { cn } from "../../utils/cn";

const tabs: { id: InspectorTab; label: string }[] = [
  { id: "queue", label: "Queue" },
  { id: "lyrics", label: "Lyrics" },
  { id: "track", label: "Track" },
  { id: "album", label: "Album" },
  { id: "file", label: "File" },
  { id: "history", label: "History" },
  { id: "audio", label: "Audio" },
];

export function Inspector() {
  const open = useShellStore((s) => s.inspectorOpen);
  const width = useShellStore((s) => s.inspectorWidth);
  const tab = useShellStore((s) => s.inspectorTab);
  const setTab = useShellStore((s) => s.setInspectorTab);
  const setWidth = useShellStore((s) => s.setInspectorWidth);
  const setOpen = useShellStore((s) => s.setInspectorOpen);
  const patchAppearance = useSettingsStore((s) => s.patchAppearance);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    function onMove(event: PointerEvent) {
      if (!dragRef.current) return;
      const delta = dragRef.current.startX - event.clientX;
      setWidth(dragRef.current.startWidth + delta);
    }
    function onUp() {
      if (!dragRef.current) return;
      dragRef.current = null;
      const nextWidth = useShellStore.getState().inspectorWidth;
      void patchAppearance({ inspectorWidth: nextWidth });
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [patchAppearance, setWidth]);

  if (!open) return null;

  return (
    <aside
      className="inspector"
      style={{ width }}
      aria-label="Inspector"
    >
      <div
        className="inspector__resize"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize inspector"
        onPointerDown={(event) => {
          dragRef.current = {
            startX: event.clientX,
            startWidth: width,
          };
        }}
      />
      <div className="inspector__header">
        <div className="inspector__tabs" role="tablist" aria-label="Inspector panels">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={cn(
                "inspector__tab",
                tab === item.id && "inspector__tab--active",
              )}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Close inspector"
          onClick={() => {
            setOpen(false);
            void patchAppearance({ inspectorOpen: false });
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="inspector__body" role="tabpanel">
        {tab === "queue" ? (
          <QueuePanel />
        ) : tab === "lyrics" ? (
          <LyricsPanel />
        ) : tab === "track" ? (
          <TrackDetailsPanel />
        ) : (
          <p className="inspector__empty">
            No selection yet. Import a library and play a track to inspect
            details.
          </p>
        )}
      </div>
    </aside>
  );
}

function TrackDetailsPanel() {
  const current = usePlayerStore((s) => s.current);
  if (!current) {
    return (
      <p className="inspector__empty">
        Nothing playing. Double-click a song to inspect it here.
      </p>
    );
  }
  if (current.trackId > 0) {
    return <TagEditor trackId={current.trackId} />;
  }
  return (
    <dl className="track-details">
      <div>
        <dt>Title</dt>
        <dd>{current.title || "Unknown title"}</dd>
      </div>
      <div>
        <dt>Artist</dt>
        <dd>{current.artist || "Unknown artist"}</dd>
      </div>
      <div>
        <dt>Album</dt>
        <dd>{current.album || "—"}</dd>
      </div>
      <div>
        <dt>Path</dt>
        <dd className="track-details__path">{current.path}</dd>
      </div>
      <p className="settings-note">
        Tag editing is available for indexed library tracks.
      </p>
    </dl>
  );
}
