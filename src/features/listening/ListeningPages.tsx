import { useEffect, useState } from "react";
import { playTracks } from "../player/api";
import { formatDuration } from "../library/api";
import type { TrackSummary } from "../library/types";
import { usePlayerStore } from "../../stores/player-store";
import { listFavorites, listHistory, listRecentlyPlayed, clearHistory } from "./api";
import type { HistoryEntry } from "./api";

export function FavoritesPage() {
  const [tracks, setTracks] = useState<TrackSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const applySnapshot = usePlayerStore((s) => s.applySnapshot);

  useEffect(() => {
    let cancelled = false;
    void listFavorites()
      .then((items) => {
        if (!cancelled) setTracks(items);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [version]);

  return (
    <section className="panel library-page" aria-label="Favorites">
      <p className="panel__intro">
        Tracks you heart from the player bar. Double-click to play.
      </p>
      {error ? <p className="settings-note">{error}</p> : null}
      {tracks.length === 0 ? (
        <p className="empty-panel__detail">
          No favorites yet. Tap the heart on the player bar while a library
          track is playing.
        </p>
      ) : (
        <TrackRows
          tracks={tracks}
          onPlay={(index) => {
            void playTracks(
              tracks.map((t) => t.id),
              index,
            ).then(applySnapshot);
          }}
        />
      )}
      <button
        type="button"
        className="text-button"
        onClick={() => setVersion((v) => v + 1)}
      >
        Refresh
      </button>
    </section>
  );
}

export function RecentlyPlayedPage() {
  const [tracks, setTracks] = useState<TrackSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const applySnapshot = usePlayerStore((s) => s.applySnapshot);

  useEffect(() => {
    let cancelled = false;
    void listRecentlyPlayed(100)
      .then((items) => {
        if (!cancelled) setTracks(items);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="panel library-page" aria-label="Recently played">
      <p className="panel__intro">
        Unique tracks ordered by last play time from your listening stats.
      </p>
      {error ? <p className="settings-note">{error}</p> : null}
      {tracks.length === 0 ? (
        <p className="empty-panel__detail">
          Nothing played yet. Start a song and it will appear here.
        </p>
      ) : (
        <TrackRows
          tracks={tracks}
          onPlay={(index) => {
            void playTracks(
              tracks.map((t) => t.id),
              index,
            ).then(applySnapshot);
          }}
        />
      )}
    </section>
  );
}

export function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const applySnapshot = usePlayerStore((s) => s.applySnapshot);

  useEffect(() => {
    let cancelled = false;
    void listHistory(100)
      .then((items) => {
        if (!cancelled) setEntries(items);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [version]);

  const playable = entries
    .map((e) => e.track)
    .filter((t): t is TrackSummary => Boolean(t));

  return (
    <section className="panel library-page" aria-label="History">
      <p className="panel__intro">
        Full listening log. Clear anytime — favorites and library stay intact.
      </p>
      <div className="playlist-detail__actions">
        <button
          type="button"
          className="text-button"
          onClick={() => {
            void clearHistory().then(() => setVersion((v) => v + 1));
          }}
        >
          Clear history
        </button>
        <button
          type="button"
          className="text-button"
          onClick={() => setVersion((v) => v + 1)}
        >
          Refresh
        </button>
      </div>
      {error ? <p className="settings-note">{error}</p> : null}
      {entries.length === 0 ? (
        <p className="empty-panel__detail">No listening history yet.</p>
      ) : (
        <ul className="playlist-tracks">
          {entries.map((entry) => {
            const track = entry.track;
            const playIndex = track
              ? playable.findIndex((t) => t.id === track.id)
              : -1;
            return (
              <li key={entry.id} className="playlist-track-row">
                <button
                  type="button"
                  className="playlist-track-row__play"
                  disabled={!track || playIndex < 0}
                  onDoubleClick={() => {
                    if (!track || playIndex < 0) return;
                    void playTracks(
                      playable.map((t) => t.id),
                      playIndex,
                    ).then(applySnapshot);
                  }}
                >
                  <strong>
                    {track?.title || "Removed track"}
                  </strong>
                  <span className="muted">
                    {track?.artist || "—"} · {entry.playedAt}
                    {entry.completed ? " · completed" : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function TrackRows({
  tracks,
  onPlay,
}: {
  tracks: TrackSummary[];
  onPlay: (index: number) => void;
}) {
  return (
    <ul className="playlist-tracks">
      {tracks.map((track, index) => (
        <li key={track.id} className="playlist-track-row">
          <button
            type="button"
            className="playlist-track-row__play"
            onDoubleClick={() => onPlay(index)}
          >
            <strong>{track.title || "Unknown title"}</strong>
            <span className="muted">
              {track.artist || "Unknown artist"} ·{" "}
              {formatDuration(track.durationMs)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
