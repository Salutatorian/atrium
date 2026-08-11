import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArtworkImage } from "../library/ArtworkImage";
import { fetchTracks } from "../library/api";
import type { TrackSummary } from "../library/types";
import { playTracks } from "../player/api";
import { listPlaylists } from "../playlists/api";
import type { PlaylistSummary } from "../playlists/types";
import { useLibraryStore } from "../../stores/library-store";
import { usePlayerStore } from "../../stores/player-store";
import { useShellStore } from "../../stores/shell-store";

type FlatResult =
  | { kind: "song"; track: TrackSummary }
  | { kind: "album"; id: number; title: string; artist: string; artworkCacheKey?: string | null }
  | { kind: "artist"; name: string; albumCount: number; trackCount: number }
  | { kind: "playlist"; playlist: PlaylistSummary };

export function SearchView() {
  const albums = useLibraryStore((s) => s.albums);
  const artists = useLibraryStore((s) => s.artists);
  const setActiveNav = useShellStore((s) => s.setActiveNav);
  const setLibraryTab = useShellStore((s) => s.setLibraryTab);
  const applySnapshot = usePlayerStore((s) => s.applySnapshot);

  const [query, setQuery] = useState("");
  const [songs, setSongs] = useState<TrackSummary[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const trimmed = query.trim().toLowerCase();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!trimmed) return;
    let cancelled = false;
    const handle = window.setTimeout(() => {
      void fetchTracks(0, 24, trimmed)
        .then((page) => {
          if (!cancelled) setSongs(page.items);
        })
        .catch(() => {
          if (!cancelled) setSongs([]);
        });
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [trimmed]);

  useEffect(() => {
    let cancelled = false;
    void listPlaylists()
      .then((items) => {
        if (!cancelled) setPlaylists(items);
      })
      .catch(() => {
        if (!cancelled) setPlaylists([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const songHits = useMemo(
    () => (trimmed ? songs : []),
    [songs, trimmed],
  );

  const albumHits = useMemo(() => {
    if (!trimmed) return [];
    return albums
      .filter(
        (a) =>
          a.title.toLowerCase().includes(trimmed) ||
          (a.albumArtist || "").toLowerCase().includes(trimmed),
      )
      .slice(0, 8);
  }, [albums, trimmed]);

  const artistHits = useMemo(() => {
    if (!trimmed) return [];
    return artists
      .filter((a) => a.name.toLowerCase().includes(trimmed))
      .slice(0, 8);
  }, [artists, trimmed]);

  const playlistHits = useMemo(() => {
    if (!trimmed) return [];
    return playlists
      .filter((p) => p.name.toLowerCase().includes(trimmed))
      .slice(0, 8);
  }, [playlists, trimmed]);

  const flat: FlatResult[] = useMemo(() => {
    const items: FlatResult[] = [];
    for (const track of songHits.slice(0, 8)) {
      items.push({ kind: "song", track });
    }
    for (const album of albumHits) {
      items.push({
        kind: "album",
        id: album.id,
        title: album.title,
        artist: album.albumArtist || "Various artists",
        artworkCacheKey: album.artworkCacheKey,
      });
    }
    for (const artist of artistHits) {
      items.push({
        kind: "artist",
        name: artist.name,
        albumCount: artist.albumCount,
        trackCount: artist.trackCount,
      });
    }
    for (const playlist of playlistHits) {
      items.push({ kind: "playlist", playlist });
    }
    return items;
  }, [albumHits, artistHits, playlistHits, songHits]);
  function activate(item: FlatResult) {
    switch (item.kind) {
      case "song":
        void playTracks([item.track.id], 0).then(applySnapshot);
        break;
      case "album":
        setLibraryTab("albums");
        setActiveNav("library");
        break;
      case "artist":
        setLibraryTab("artists");
        setActiveNav("library");
        break;
      case "playlist":
        setActiveNav("playlists");
        break;
      default: {
        const _exhaustive: never = item;
        return _exhaustive;
      }
    }
  }

  return (
    <section className="search-view" aria-label="Search">
      <h1 className="view-title">Search</h1>
      <p className="search-view__hint">Search your library</p>
      <label className="search-view__field">
        <span className="sr-only">Search your library</span>
        <input
          ref={inputRef}
          type="search"
          value={query}
          placeholder="Songs, albums, artists, playlists…"
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((i) => Math.min(flat.length - 1, i + 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((i) => Math.max(0, i - 1));
            } else if (event.key === "Enter" && flat[activeIndex]) {
              event.preventDefault();
              activate(flat[activeIndex]);
            }
          }}
        />
      </label>

      {!trimmed ? (
        <p className="empty-panel__detail">
          Start typing, or press Ctrl+F (⌘F on Mac) anytime to jump here.
        </p>
      ) : flat.length === 0 ? (
        <p className="empty-panel__detail">No matches for “{query.trim()}”.</p>
      ) : (
        <div className="search-groups">
          {songHits.length > 0 ? (
            <SearchGroup title="Songs">
              {songHits.slice(0, 8).map((track) => {
                const index = flat.findIndex(
                  (item) => item.kind === "song" && item.track.id === track.id,
                );
                return (
                  <button
                    key={track.id}
                    type="button"
                    className={
                      index === activeIndex
                        ? "search-result search-result--active"
                        : "search-result"
                    }
                    onClick={() => activate({ kind: "song", track })}
                    onMouseEnter={() => setActiveIndex(index)}
                  >
                    <ArtworkImage
                      className="search-result__art"
                      cacheKey={track.artworkCacheKey}
                      alt=""
                    />
                    <span>
                      <strong>{track.title || "Unknown"}</strong>
                      <span className="muted">
                        {track.artist || "Unknown artist"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </SearchGroup>
          ) : null}

          {albumHits.length > 0 ? (
            <SearchGroup title="Albums">
              {albumHits.map((album) => {
                const index = flat.findIndex(
                  (item) => item.kind === "album" && item.id === album.id,
                );
                return (
                  <button
                    key={album.id}
                    type="button"
                    className={
                      index === activeIndex
                        ? "search-result search-result--active"
                        : "search-result"
                    }
                    onClick={() =>
                      activate({
                        kind: "album",
                        id: album.id,
                        title: album.title,
                        artist: album.albumArtist || "Various artists",
                        artworkCacheKey: album.artworkCacheKey,
                      })
                    }
                    onMouseEnter={() => setActiveIndex(index)}
                  >
                    <ArtworkImage
                      className="search-result__art"
                      cacheKey={album.artworkCacheKey}
                      alt=""
                    />
                    <span>
                      <strong>{album.title}</strong>
                      <span className="muted">
                        {album.albumArtist || "Various artists"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </SearchGroup>
          ) : null}

          {artistHits.length > 0 ? (
            <SearchGroup title="Artists">
              {artistHits.map((artist) => {
                const index = flat.findIndex(
                  (item) =>
                    item.kind === "artist" && item.name === artist.name,
                );
                return (
                  <button
                    key={artist.name}
                    type="button"
                    className={
                      index === activeIndex
                        ? "search-result search-result--active"
                        : "search-result"
                    }
                    onClick={() =>
                      activate({
                        kind: "artist",
                        name: artist.name,
                        albumCount: artist.albumCount,
                        trackCount: artist.trackCount,
                      })
                    }
                    onMouseEnter={() => setActiveIndex(index)}
                  >
                    <span className="search-result__avatar" aria-hidden>
                      {(artist.name.trim().charAt(0) || "?").toUpperCase()}
                    </span>
                    <span>
                      <strong>{artist.name}</strong>
                      <span className="muted">
                        {artist.albumCount} albums · {artist.trackCount} tracks
                      </span>
                    </span>
                  </button>
                );
              })}
            </SearchGroup>
          ) : null}

          {playlistHits.length > 0 ? (
            <SearchGroup title="Playlists">
              {playlistHits.map((playlist) => {
                const index = flat.findIndex(
                  (item) =>
                    item.kind === "playlist" &&
                    item.playlist.id === playlist.id,
                );
                return (
                  <button
                    key={playlist.id}
                    type="button"
                    className={
                      index === activeIndex
                        ? "search-result search-result--active"
                        : "search-result"
                    }
                    onClick={() => activate({ kind: "playlist", playlist })}
                    onMouseEnter={() => setActiveIndex(index)}
                  >
                    <span className="search-result__avatar" aria-hidden>
                      {(playlist.name.trim().charAt(0) || "P").toUpperCase()}
                    </span>
                    <span>
                      <strong>{playlist.name}</strong>
                      <span className="muted">{playlist.trackCount} songs</span>
                    </span>
                  </button>
                );
              })}
            </SearchGroup>
          ) : null}
        </div>
      )}
    </section>
  );
}

function SearchGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="search-group">
      <h2>{title}</h2>
      <div className="search-group__list">{children}</div>
    </section>
  );
}
