import { useEffect, useState } from "react";
import { playTracks } from "../player/api";
import { formatDuration } from "../library/api";
import type { TrackSummary } from "../library/types";
import { usePlayerStore } from "../../stores/player-store";
import { IconHeart } from "../../components/icons";
import {
  listFavorites,
  listHistory,
  listRecentlyPlayed,
  toggleFavorite,
} from "./api";
import type { HistoryEntry } from "./api";
import { cn } from "../../utils/cn";

export function FavoritesPage() {
  const [tracks, setTracks] = useState<TrackSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [busyId, setBusyId] = useState<number | null>(null);
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

  const playable = tracks.filter((t) => !t.missing && t.id > 0);

  return (
    <section className="panel library-page liked-page" aria-label="Liked">
      <header className="liked-page__header">
        <div>
          <h1 className="view-title">Liked</h1>
          <p className="library-view__lead">
            Hearts keep title, artist, album, and art forever — even if you
            remove the folder or delete the file. Unlike to drop a song.
          </p>
        </div>
        <button
          type="button"
          className="text-button"
          onClick={() => setVersion((v) => v + 1)}
        >
          Refresh
        </button>
      </header>
      {error ? <p className="settings-note">{error}</p> : null}
      {tracks.length === 0 ? (
        <p className="empty-panel__detail">
          No liked songs yet. Tap the heart on the player bar while a library
          track is playing.
        </p>
      ) : (
        <TrackRows
          tracks={tracks}
          busyId={busyId}
          onUnlike={async (track) => {
            setBusyId(track.id);
            try {
              await toggleFavorite(track.id);
              setVersion((v) => v + 1);
            } catch (err: unknown) {
              setError(err instanceof Error ? err.message : String(err));
            } finally {
              setBusyId(null);
            }
          }}
          onPlay={(track) => {
            if (track.missing) return;
            const index = playable.findIndex((t) => t.id === track.id);
            if (index < 0) return;
            void playTracks(
              playable.map((t) => t.id),
              index,
            ).then(applySnapshot);
          }}
        />
      )}
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
          onPlay={(track) => {
            const playable = tracks.filter((t) => !t.missing);
            const index = playable.findIndex((t) => t.id === track.id);
            if (index < 0) return;
            void playTracks(
              playable.map((t) => t.id),
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
        Full listening log from your durable stats. It stays forever — across
        downtime, closed windows, and the years.
      </p>
      <div className="playlist-detail__actions">
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
                    {entry.title || track?.title || "Removed track"}
                  </strong>
                  <span className="muted">
                    {entry.artist || track?.artist || "—"} · {entry.playedAt}
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
  onUnlike,
  busyId,
}: {
  tracks: TrackSummary[];
  onPlay: (track: TrackSummary) => void;
  onUnlike?: (track: TrackSummary) => void;
  busyId?: number | null;
}) {
  return (
    <ul className="playlist-tracks">
      {tracks.map((track) => {
        const gone = Boolean(track.missing);
        return (
          <li
            key={`${track.id}-${track.trackUid || track.path}`}
            className={cn(
              "playlist-track-row",
              gone && "playlist-track-row--missing",
            )}
          >
            <button
              type="button"
              className="playlist-track-row__play"
              disabled={gone}
              onDoubleClick={() => {
                if (!gone) onPlay(track);
              }}
            >
              <strong>{track.title || "Unknown title"}</strong>
              <span className="muted">
                {track.artist || "Unknown artist"}
                {track.album ? ` · ${track.album}` : ""}
                {gone
                  ? " · file gone — metadata kept"
                  : ` · ${formatDuration(track.durationMs)}`}
              </span>
            </button>
            {onUnlike ? (
              <button
                type="button"
                className="icon-button icon-button--active playlist-track-row__heart"
                aria-label="Unlike"
                disabled={busyId === track.id}
                onClick={() => onUnlike(track)}
              >
                <IconHeart filled />
              </button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
