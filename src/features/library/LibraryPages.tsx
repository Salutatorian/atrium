import { ArtworkImage } from "./ArtworkImage";
import { LibraryToolbar } from "./LibraryToolbar";
import { TrackList } from "./TrackList";
import { useLibraryStore } from "../../stores/library-store";

export function SongsPage() {
  return (
    <section className="panel library-page" aria-label="Songs">
      <LibraryToolbar showSearch />
      <TrackList />
    </section>
  );
}

export function AlbumsPage() {
  const albums = useLibraryStore((s) => s.albums);

  return (
    <section className="panel library-page" aria-label="Albums">
      <LibraryToolbar />
      {albums.length === 0 ? (
        <p className="empty-panel__detail">No albums indexed yet.</p>
      ) : (
        <ul className="media-grid">
          {albums.map((album) => (
            <li key={album.id} className="media-card">
              <ArtworkImage
                className="media-card__art"
                cacheKey={album.artworkCacheKey}
                alt=""
              />
              <div className="media-card__meta">
                <strong>{album.title}</strong>
                <span>
                  {album.albumArtist || "Various artists"}
                  {album.year ? ` · ${album.year}` : ""}
                </span>
                <span className="muted">{album.trackCount} tracks</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ArtistsPage() {
  const artists = useLibraryStore((s) => s.artists);

  return (
    <section className="panel library-page" aria-label="Artists">
      <LibraryToolbar />
      {artists.length === 0 ? (
        <p className="empty-panel__detail">No artists indexed yet.</p>
      ) : (
        <ul className="artist-list">
          {artists.map((artist) => (
            <li key={artist.name} className="artist-row">
              <strong>{artist.name}</strong>
              <span className="muted">
                {artist.albumCount} albums · {artist.trackCount} tracks
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function FoldersPage() {
  const folders = useLibraryStore((s) => s.folders);

  return (
    <section className="panel library-page" aria-label="Folders">
      <LibraryToolbar />
      {folders.length === 0 ? (
        <p className="empty-panel__detail">No folders indexed yet.</p>
      ) : (
        <ul className="folder-list">
          {folders.map((folder) => (
            <li key={folder.id} className="folder-row">
              <div>
                <strong>{folder.name}</strong>
                <p className="muted">{folder.path}</p>
              </div>
              <span>{folder.trackCount}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function RecentlyAddedPage() {
  const tracks = useLibraryStore((s) => s.tracks);

  return (
    <section className="panel library-page" aria-label="Recently added">
      <LibraryToolbar />
      <p className="panel__intro">
        Showing the current library window ordered by import. Dedicated recents
        sorting arrives with listening history.
      </p>
      {tracks.length === 0 ? (
        <p className="empty-panel__detail">Nothing imported yet.</p>
      ) : (
        <TrackList />
      )}
    </section>
  );
}
