import { useEffect, useState } from "react";
import {
  fetchLibraryRoots,
  pickMusicFiles,
  pickMusicFolder,
  removeLibraryFolder,
  startLibraryScan,
} from "./api";
import { ArtworkImage } from "./ArtworkImage";
import { LibraryToolbar } from "./LibraryToolbar";
import { TrackList } from "./TrackList";
import type { LibraryRootSummary } from "./types";
import { useLibraryStore } from "../../stores/library-store";
import { isTauriRuntime } from "../../services/tauri";

type EmbeddedProps = {
  /** When true, parent LibraryView owns the toolbar. */
  embedded?: boolean;
};

export function SongsPage({ embedded = false }: EmbeddedProps) {
  return (
    <section className="library-page" aria-label="Songs">
      {embedded ? null : <LibraryToolbar showSearch />}
      <TrackList />
    </section>
  );
}

export function AlbumsPage({ embedded = false }: EmbeddedProps) {
  const albums = useLibraryStore((s) => s.albums);

  return (
    <section className="library-page" aria-label="Albums">
      {embedded ? null : <LibraryToolbar />}
      {albums.length === 0 ? (
        <p className="empty-panel__detail">No albums indexed yet.</p>
      ) : (
        <ul className="media-grid media-grid--art-led">
          {albums.map((album) => (
            <li key={album.id} className="media-tile">
              <ArtworkImage
                className="media-tile__art"
                cacheKey={album.artworkCacheKey}
                alt=""
              />
              <div className="media-tile__meta">
                <strong>{album.title}</strong>
                <span>
                  {album.albumArtist || "Various artists"}
                  {album.year ? ` · ${album.year}` : ""}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ArtistsPage({ embedded = false }: EmbeddedProps) {
  const artists = useLibraryStore((s) => s.artists);

  return (
    <section className="library-page" aria-label="Artists">
      {embedded ? null : <LibraryToolbar />}
      {artists.length === 0 ? (
        <p className="empty-panel__detail">No artists indexed yet.</p>
      ) : (
        <ul className="artist-list artist-list--refined">
          {artists.map((artist) => (
            <li key={artist.name} className="artist-row">
              <span className="artist-row__avatar" aria-hidden>
                {(artist.name.trim().charAt(0) || "?").toUpperCase()}
              </span>
              <div className="artist-row__meta">
                <strong>{artist.name}</strong>
                <span className="muted">
                  {artist.albumCount} albums · {artist.trackCount} tracks
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function FoldersPage({ embedded = false }: EmbeddedProps) {
  const refreshAll = useLibraryStore((s) => s.refreshAll);
  const [roots, setRoots] = useState<LibraryRootSummary[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void fetchLibraryRoots()
      .then((items) => {
        if (!cancelled) {
          setRoots(items);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [version]);

  return (
    <section className="library-page" aria-label="Folders">
      {embedded ? null : <LibraryToolbar />}
      <p className="panel__intro">
        Folders you add are indexed in place. To drop one, use{" "}
        <strong>Remove from library</strong> on that row — your files stay on
        disk; only Atrium&apos;s index clears. Liked songs from that folder stay
        in Liked.
      </p>

      {error ? <p className="settings-note">{error}</p> : null}

      {roots.length === 0 ? (
        <p className="empty-panel__detail">
          No folders yet. Use Add folder or Add songs above to start a new library.
        </p>
      ) : (
        <ul className="library-roots">
          {roots.map((root) => (
            <li key={root.id} className="library-root-row">
              <div className="library-root-row__meta">
                <strong>{root.label}</strong>
                <p className="muted folder-row__path" title={root.path}>
                  {root.path}
                </p>
                <span className="muted">
                  {root.trackCount} {root.trackCount === 1 ? "song" : "songs"}
                </span>
              </div>
              <button
                type="button"
                className="button-danger"
                disabled={!isTauriRuntime() || busyId === root.id}
                onClick={() => {
                  const ok = window.confirm(
                    `Remove “${root.label}” from your library?\n\nYour music files stay on disk. Only Atrium’s index for this folder is cleared. Liked songs from this folder stay in Liked.`,
                  );
                  if (!ok) return;
                  setBusyId(root.id);
                  void removeLibraryFolder(root.id)
                    .then(async () => {
                      await refreshAll();
                      setVersion((v) => v + 1);
                    })
                    .catch((err: unknown) => {
                      setError(err instanceof Error ? err.message : String(err));
                    })
                    .finally(() => setBusyId(null));
                }}
              >
                {busyId === root.id ? "Removing…" : "Remove from library"}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="library-roots__add">
        <button
          type="button"
          className="button-primary"
          disabled={!isTauriRuntime()}
          onClick={() => {
            void (async () => {
              const folder = await pickMusicFolder();
              if (!folder) return;
              await startLibraryScan([folder]);
              setVersion((v) => v + 1);
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
              if (files.length === 0) return;
              await startLibraryScan(files);
              setVersion((v) => v + 1);
            })();
          }}
        >
          Add songs
        </button>
      </div>
    </section>
  );
}

export function RecentlyAddedPage() {
  const tracks = useLibraryStore((s) => s.tracks);

  return (
    <section className="library-page" aria-label="Recently added">
      <LibraryToolbar />
      {tracks.length === 0 ? (
        <p className="empty-panel__detail">Nothing imported yet.</p>
      ) : (
        <TrackList />
      )}
    </section>
  );
}
