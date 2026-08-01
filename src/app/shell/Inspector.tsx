import { useEffect, useRef, useState } from "react";
import { TagEditor } from "../../features/library/TagEditor";
import { LyricsPanel } from "../../features/lyrics/LyricsPanel";
import { QueuePanel } from "../../features/player/QueuePanel";
import { usePlayerStore } from "../../stores/player-store";
import { useShellStore, type DrawerTab } from "../../stores/shell-store";
import { cn } from "../../utils/cn";

const tabs: { id: DrawerTab; label: string }[] = [
  { id: "queue", label: "Queue" },
  { id: "lyrics", label: "Lyrics" },
  { id: "info", label: "Info" },
];

/** Context drawer (Queue / Lyrics / Info). Closed by default; overlays content. */
export function Inspector() {
  const open = useShellStore((s) => s.inspectorOpen);
  const width = useShellStore((s) => s.inspectorWidth);
  const tab = useShellStore((s) => s.inspectorTab);
  const setTab = useShellStore((s) => s.setInspectorTab);
  const setOpen = useShellStore((s) => s.setInspectorOpen);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="context-drawer__scrim"
        aria-label="Close panel"
        onClick={() => setOpen(false)}
      />
      <aside
        ref={panelRef}
        className="context-drawer"
        style={{ width }}
        aria-label="Context"
      >
        <div className="context-drawer__header">
          <div
            className="context-drawer__tabs"
            role="tablist"
            aria-label="Context panels"
          >
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                className={cn(
                  "context-drawer__tab",
                  tab === item.id && "context-drawer__tab--active",
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
            aria-label="Close"
            onClick={() => setOpen(false)}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="context-drawer__body" role="tabpanel">
          {tab === "queue" ? <QueuePanel /> : null}
          {tab === "lyrics" ? <LyricsPanel /> : null}
          {tab === "info" ? <TrackInfoPanel /> : null}
        </div>
      </aside>
    </>
  );
}

function TrackInfoPanel() {
  const current = usePlayerStore((s) => s.current);
  const [editing, setEditing] = useState(false);

  if (!current) {
    return (
      <p className="inspector__empty">
        Nothing playing. Start a song to see details.
      </p>
    );
  }

  if (editing && current.trackId > 0) {
    return (
      <div className="track-info">
        <button
          type="button"
          className="text-button"
          onClick={() => setEditing(false)}
        >
          Done
        </button>
        <TagEditor trackId={current.trackId} />
      </div>
    );
  }

  return (
    <div className="track-info">
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
      </dl>
      {current.trackId > 0 ? (
        <button
          type="button"
          className="button-primary"
          onClick={() => setEditing(true)}
        >
          Edit tags
        </button>
      ) : (
        <p className="settings-note">
          Tag editing is available for indexed library tracks.
        </p>
      )}
    </div>
  );
}
