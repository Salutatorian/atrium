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
  listSmartPlaylists,
  removeTrackFromPlaylist,
} from "./api";
import type { PlaylistSummary, SmartPlaylistSummary } from "./types";
import { SmartPlaylistsPage } from "./SmartPlaylistsPage";

type LandingItem =
  | { kind: "manual"; playlist: PlaylistSummary }
  | { kind: "smart"; playlist: SmartPlaylistSummary };

export function PlaylistsPage() {
  const [mode, setMode] = useState<"library" | "smart-studio">("library");
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [smart, setSmart] = useState<SmartPlaylistSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tracks, setTracks] = useState<TrackSummary[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [addQuery, setAddQuery] = useState("");
  const [addResults, setAddResults] = useState<TrackSummary[]>([]);
  const [moreOpen, setMoreOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listVersion, setListVersion] = useState(0);
  const applySnapshot = usePlayerStore((s) => s.applySnapshot);
  const trimmedQuery = addQuery.trim();

  function reloadPlaylists() {
    setListVersion((v) => v + 1);
  }

  async function openPlaylist(id: string) {
    setSelectedId(id);
    setTracks(await listPlaylistTracks(id));
    setMoreOpen(false);
  }

  useEffect(() => {
    let cancelled = false;
    void Promise.all([listPlaylists(), listSmartPlaylists()])
      .then(([manual, smartItems]) => {
        if (cancelled) return;
        setPlaylists(manual);
        setSmart(smartItems);
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
    if (!trimmedQuery || !addOpen) return;
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
  }, [trimmedQuery, addOpen]);

  if (mode === "smart-studio") {
    return (
      <section className="playlists-view" aria-label="Playlists">
        <header className="playlists-view__header">
          <button
            type="button"
            className="text-button"
            onClick={() => setMode("library")}
          >
            ← Playlists
          </button>
          <h1 className="view-title">Smart playlists</h1>
        </header>
        <SmartPlaylistsPage />
      </section>
    );
  }

  const landing: LandingItem[] = [
    ...playlists.map((playlist) => ({ kind: "manual" as const, playlist })),
    ...smart.map((playlist) => ({ kind: "smart" as const, playlist })),
  ];

  const selected = playlists.find((p) => p.id === selectedId) ?? null;

  return (
    <section className="playlists-view" aria-label="Playlists">
      {!selectedId ? (
        <>
          <header className="playlists-view__header">
            <h1 className="view-title">Playlists</h1>
            <div className="playlists-view__actions">
              <button
                type="button"
                className="text-button"
                onClick={() => setMode("smart-studio")}
              >
                Smart studio
              </button>
              <button
                type="button"
                className="button-primary"
                onClick={() => setCreateOpen(true)}
              >
                New playlist
              </button>
            </div>
          </header>

          {error ? <p className="settings-note">{error}</p> : null}

          {landing.length === 0 ? (
            <p className="empty-panel__detail">
              No playlists yet. Create one to start collecting songs.
            </p>
          ) : (
            <ul className="playlist-landing">
              {landing.map((item) => {
                if (item.kind === "smart") {
                  return (
                    <li key={`smart-${item.playlist.id}`}>
                      <button
                        type="button"
                        className="playlist-landing__item"
                        onClick={() => setMode("smart-studio")}
                      >
                        <span className="playlist-landing__cover" aria-hidden>
                          {(item.playlist.name.trim().charAt(0) || "S").toUpperCase()}
                        </span>
                        <span className="playlist-landing__meta">
                          <strong>
                            {item.playlist.name}
                            <span className="playlist-badge">Smart</span>
                          </strong>
                          <span className="muted">Rule-based</span>
                        </span>
                      </button>
                    </li>
                  );
                }
                return (
                  <li key={item.playlist.id}>
                    <button
                      type="button"
                      className="playlist-landing__item"
                      onClick={() => {
                        void openPlaylist(item.playlist.id);
                      }}
                    >
                      <span className="playlist-landing__cover" aria-hidden>
                        {(item.playlist.name.trim().charAt(0) || "P").toUpperCase()}
                      </span>
                      <span className="playlist-landing__meta">
                        <strong>{item.playlist.name}</strong>
                        <span className="muted">
                          {item.playlist.trackCount} songs
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      ) : (
        <div className="playlist-detail-view">
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setSelectedId(null);
              setTracks([]);
              setAddOpen(false);
            }}
          >
            ← All playlists
          </button>
          <header className="playlist-detail-view__hero">
            <span className="playlist-landing__cover playlist-landing__cover--lg" aria-hidden>
              {(selected?.name.trim().charAt(0) || "P").toUpperCase()}
            </span>
            <div>
              <h1 className="view-title">{selected?.name || "Playlist"}</h1>
              <p className="muted">
                {tracks.length} songs
                {selected ? ` · ${selected.trackCount} indexed` : ""}
              </p>
              <div className="playlist-detail-view__actions">
                <button
                  type="button"
                  className="button-primary"
                  disabled={tracks.length === 0}
                  onClick={() => {
                    void playTracks(
                      tracks.map((t) => t.id),
                      0,
                    ).then(applySnapshot);
                  }}
                >
                  Play
                </button>
                <button
                  type="button"
                  onClick={() => setAddOpen(true)}
                >
                  Add songs
                </button>
                <div className="playlist-more">
                  <button
                    type="button"
                    className="text-button"
                    aria-expanded={moreOpen}
                    onClick={() => setMoreOpen((open) => !open)}
                  >
                    More
                  </button>
                  {moreOpen ? (
                    <div className="player-more-menu" role="menu">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          if (!selectedId) return;
                          void deletePlaylist(selectedId).then(() => {
                            setSelectedId(null);
                            setTracks([]);
                            reloadPlaylists();
                          });
                        }}
                      >
                        Delete playlist
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </header>

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
                    onClick={() => {
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
                    className="icon-button playlist-track-row__remove"
                    aria-label="Remove from playlist"
                    onClick={() => {
                      if (!selectedId) return;
                      void removeTrackFromPlaylist(selectedId, track.id).then(
                        () => {
                          reloadPlaylists();
                          return openPlaylist(selectedId);
                        },
                      );
                    }}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {createOpen ? (
        <div className="modal-scrim" role="presentation">
          <form
            className="modal-card"
            aria-label="New playlist"
            onSubmit={(event) => {
              event.preventDefault();
              void createPlaylist(name)
                .then(async (created) => {
                  setName("");
                  setCreateOpen(false);
                  reloadPlaylists();
                  await openPlaylist(created.id);
                })
                .catch((err: unknown) => {
                  setError(err instanceof Error ? err.message : String(err));
                });
            }}
          >
            <h2>New playlist</h2>
            <label className="settings-field">
              <span>Name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Late night"
                required
                autoFocus
              />
            </label>
            <div className="modal-card__actions">
              <button
                type="button"
                className="text-button"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="button-primary">
                Create
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {addOpen && selectedId ? (
        <div className="modal-scrim" role="presentation">
          <div className="modal-card" aria-label="Add songs">
            <h2>Add songs</h2>
            <label className="settings-field">
              <span>Search library</span>
              <input
                value={addQuery}
                onChange={(event) => setAddQuery(event.target.value)}
                placeholder="Title or artist"
                autoFocus
              />
            </label>
            <ul className="playlist-add-results">
              {addResults.map((track) => (
                <li key={track.id}>
                  <span>
                    {track.title || "Unknown"} · {track.artist || "Unknown"}
                  </span>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
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
            <div className="modal-card__actions">
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setAddOpen(false);
                  setAddQuery("");
                  setAddResults([]);
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
