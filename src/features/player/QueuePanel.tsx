import { clearQueue, removeFromQueue } from "./api";
import { formatPlaybackTime } from "./format";
import { usePlayerStore } from "../../stores/player-store";
import { cn } from "../../utils/cn";

export function QueuePanel() {
  const queue = usePlayerStore((s) => s.queue);
  const queueIndex = usePlayerStore((s) => s.queueIndex);
  const applySnapshot = usePlayerStore((s) => s.applySnapshot);

  if (queue.length === 0) {
    return (
      <p className="inspector__empty">
        Queue is empty. Double-click a song to start playback.
      </p>
    );
  }

  return (
    <div className="queue-panel">
      <div className="queue-panel__toolbar">
        <span>
          {queue.length} track{queue.length === 1 ? "" : "s"}
        </span>
        <button
          type="button"
          className="text-button"
          onClick={() => {
            void clearQueue().then(applySnapshot);
          }}
        >
          Clear
        </button>
      </div>
      <ul className="queue-panel__list">
        {queue.map((track, index) => (
          <li
            key={`${track.trackId}-${index}`}
            className={cn(
              "queue-panel__row",
              index === queueIndex && "queue-panel__row--active",
            )}
          >
            <div className="queue-panel__meta">
              <span className="queue-panel__title">
                {track.title || "Unknown title"}
              </span>
              <span className="queue-panel__sub">
                {track.artist || "Unknown artist"}
              </span>
            </div>
            <span className="queue-panel__duration">
              {formatPlaybackTime(track.durationMs)}
            </span>
            <button
              type="button"
              className="icon-button"
              aria-label={`Remove ${track.title || "track"} from queue`}
              onClick={() => {
                void removeFromQueue(index).then(applySnapshot);
              }}
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
          </li>
        ))}
      </ul>
    </div>
  );
}
