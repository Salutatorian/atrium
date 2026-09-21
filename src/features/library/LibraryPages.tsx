import { useEffect, useState } from "react";
import {
  pickMusicFiles,
  pickMusicFolder,
  removeIndexedFolder,
  startLibraryScan,
} from "./api";
import { ArtworkImage } from "./ArtworkImage";
import { LibraryToolbar } from "./LibraryToolbar";
import { TrackList } from "./TrackList";
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
  const folders = useLibraryStore((s) => s.folders);
  const loadFolders = useLibraryStore((s) => s.loadFolders);
  const refreshAll = useLibraryStore((s) => s.refreshAll);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    void loadFolders().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : String(err));
    });
  }, [loadFolders, version]);

  const visible = folders.filter((folder) => folder.trackCount > 0);

  return (
    <section className="library-page" aria-label="Folders">
      {embedded ? null : <LibraryToolbar />}
      <p className="panel__intro">
        Each folder lists only the songs sitting in it — songs in a subfolder
        stay on that subfolder.{" "}
        <strong>Remove from library</strong> clears Atrium&apos;s index for this
        folder; your files stay on disk. Liked songs stay in Liked.
      </p>

      {error ? <p className="settings-note">{error}</p> : null}

      {visible.length === 0 ? (
        <p className="empty-panel__detail">
          No folders yet. Use Add folder or Add songs above to start a new library.
        </p>
      ) : (
        <ul className="library-roots">
          {visible.map((folder) => (
            <li key={folder.id} className="library-root-row">
              <div className="library-root-row__meta">
                <strong>{folder.name}</strong>
                <p className="muted folder-row__path" title={folder.path}>
                  {folder.path}
                </p>
                <span className="muted">
                  {folder.trackCount}{" "}
                  {folder.trackCount === 1 ? "song" : "songs"}
                </span>
              </div>
              <button
                type="button"
                className="button-danger"
                disabled={!isTauriRuntime() || busyId === folder.id}
                onClick={() => {
                  const ok = window.confirm(
                    `Remove “${folder.name}” from your library?\n\nYour music files stay on disk. Only songs in this folder are cleared — songs in other folders are left alone. Liked songs from this folder stay in Liked.`,
                  );
                  if (!ok) return;
                  setBusyId(folder.id);
                  void removeIndexedFolder(folder.id)
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
                {busyId === folder.id ? "Removing…" : "Remove from library"}
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
