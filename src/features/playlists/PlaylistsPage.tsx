import { useEffect, useState } from "react";
import { playTracks } from "../player/api";
import { fetchTracks, formatDuration } from "../library/api";
import type { TrackSummary } from "../library/types";
import { usePlayerStore } from "../../stores/player-store";
import {
  addTracksToPlaylist,
  createPlaylist,
  deletePlaylist,
  listPlaylistTracks,
  listPlaylists,
  removeTrackFromPlaylist,
} from "./api";
import type { PlaylistSummary } from "./types";

export function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tracks, setTracks] = useState<TrackSummary[]>([]);
  const [name, setName] = useState("");
  const [addQuery, setAddQuery] = useState("");
  const [addResults, setAddResults] = useState<TrackSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [listVersion, setListVersion] = useState(0);
  const applySnapshot = usePlayerStore((s) => s.applySnapshot);
  const current = usePlayerStore((s) => s.current);
  const trimmedQuery = addQuery.trim();
  const visibleAddResults = trimmedQuery ? addResults : [];

  function reloadPlaylists() {
    setListVersion((v) => v + 1);
  }

  async function openPlaylist(id: string) {
    setSelectedId(id);
    setTracks(await listPlaylistTracks(id));
  }

  useEffect(() => {
    let cancelled = false;
    void listPlaylists()
      .then((items) => {
        if (cancelled) return;
        setPlaylists(items);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [listVersion]);

  useEffect(() => {
    if (!trimmedQuery) return;
    let cancelled = false;
    const handle = window.setTimeout(() => {
      void fetchTracks(0, 12, trimmedQuery)
        .then((page) => {
          if (!cancelled) setAddResults(page.items);
        })
        .catch(() => {
          if (!cancelled) setAddResults([]);
        });
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [trimmedQuery]);

  return (
    <section className="panel library-page" aria-label="Playlists">
      <p className="panel__intro">
        Manual playlists for curating sets. Add library tracks by search, or pull
        in whatever is playing.
      </p>

      <form
        className="playlist-create"
        onSubmit={(event) => {
          event.preventDefault();
          void createPlaylist(name)
            .then(async (created) => {
              setName("");
              reloadPlaylists();
              await openPlaylist(created.id);
            })
            .catch((err: unknown) => {
              setError(err instanceof Error ? err.message : String(err));
            });
        }}
      >
        <label className="settings-field">
          <span>New playlist</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Late night jazz"
            required
          />
        </label>
        <button type="submit" className="button-primary">
          Create
        </button>
      </form>

      {error ? <p className="settings-note">{error}</p> : null}

      <div className="playlist-layout">
        <ul className="playlist-list" aria-label="Playlist list">
          {playlists.length === 0 ? (
            <li className="muted">No playlists yet.</li>
          ) : (
            playlists.map((playlist) => (
              <li key={playlist.id}>
                <button
                  type="button"
                  className={
                    selectedId === playlist.id
                      ? "playlist-list__item playlist-list__item--active"
                      : "playlist-list__item"
                  }
                  onClick={() => {
                    void openPlaylist(playlist.id);
                  }}
                >
                  <strong>{playlist.name}</strong>
                  <span className="muted">{playlist.trackCount} tracks</span>
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    void deletePlaylist(playlist.id).then(() => {
                      if (selectedId === playlist.id) {
                        setSelectedId(null);
                        setTracks([]);
                      }
                      reloadPlaylists();
                    });
                  }}
                >
                  Delete
                </button>
              </li>
            ))
          )}
        </ul>

        <div className="playlist-detail">
          {!selectedId ? (
            <p className="empty-panel__detail">Select or create a playlist.</p>
          ) : (
            <>
              <div className="playlist-detail__actions">
                <button
                  type="button"
                  className="button-primary"
                  disabled={!current || current.trackId <= 0}
                  onClick={() => {
                    if (!current || current.trackId <= 0 || !selectedId) return;
                    void addTracksToPlaylist(selectedId, [current.trackId]).then(
                      () => {
                        reloadPlaylists();
                        return openPlaylist(selectedId);
                      },
                    );
                  }}
                >
                  Add now playing
                </button>
                <label className="settings-field playlist-detail__search">
                  <span>Add from library</span>
                  <input
                    value={addQuery}
                    onChange={(event) => setAddQuery(event.target.value)}
                    placeholder="Search title or artist"
                  />
                </label>
              </div>

              {visibleAddResults.length > 0 ? (
                <ul className="playlist-add-results">
                  {visibleAddResults.map((track) => (
                    <li key={track.id}>
                      <span>
                        {track.title || "Unknown"} · {track.artist || "Unknown"}
                      </span>
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => {
                          if (!selectedId) return;
                          void addTracksToPlaylist(selectedId, [track.id]).then(
                            () => {
                              reloadPlaylists();
                              return openPlaylist(selectedId);
                            },
                          );
                        }}
                      >
                        Add
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              {tracks.length === 0 ? (
                <p className="empty-panel__detail">This playlist is empty.</p>
              ) : (
                <ul className="playlist-tracks">
                  {tracks.map((track, index) => (
                    <li key={track.id} className="playlist-track-row">
                      <button
                        type="button"
                        className="playlist-track-row__play"
                        onDoubleClick={() => {
                          void playTracks(
                            tracks.map((t) => t.id),
                            index,
                          ).then(applySnapshot);
                        }}
                      >
                        <strong>{track.title || "Unknown title"}</strong>
                        <span className="muted">
                          {track.artist || "Unknown artist"} ·{" "}
                          {formatDuration(track.durationMs)}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => {
                          if (!selectedId) return;
                          void removeTrackFromPlaylist(
                            selectedId,
                            track.id,
                          ).then(() => {
                            reloadPlaylists();
                            return openPlaylist(selectedId);
                          });
                        }}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
