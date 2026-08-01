import { useEffect, useState, type ReactNode } from "react";
import { pickMusicFolder, startLibraryScan } from "../library/api";
import { ArtworkImage } from "../library/ArtworkImage";
import { formatDuration } from "../library/api";
import {
  playerNext,
  playerPrevious,
  playerToggle,
  playTracks,
} from "../player/api";
import { formatPlaybackTime } from "../player/format";
import { SeekSlider } from "../player/SeekSlider";
import { listPlaylists } from "../playlists/api";
import type { PlaylistSummary } from "../playlists/types";
import {
  fetchStatsOverview,
  formatListenDuration,
  listRecentlyPlayed,
  type StatsOverview,
} from "../listening/api";
import type { TrackSummary } from "../library/types";
import { useLibraryStore } from "../../stores/library-store";
import { usePlayerStore } from "../../stores/player-store";
import { useShellStore } from "../../stores/shell-store";
import { isTauriRuntime } from "../../services/tauri";
import { cn } from "../../utils/cn";
import { UpdatesShowcase } from "../updates/UpdatesShowcase";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function HomeView() {
  const stats = useLibraryStore((s) => s.stats);
  const tracks = useLibraryStore((s) => s.tracks);
  const current = usePlayerStore((s) => s.current);
  const status = usePlayerStore((s) => s.status);
  const positionMs = usePlayerStore((s) => s.positionMs);
  const durationMs = usePlayerStore((s) => s.durationMs);
  const applySnapshot = usePlayerStore((s) => s.applySnapshot);
  const setActiveNav = useShellStore((s) => s.setActiveNav);
  const setNowPlayingOpen = useShellStore((s) => s.setNowPlayingOpen);
  const toggleDrawer = useShellStore((s) => s.toggleDrawer);

  const [recent, setRecent] = useState<TrackSummary[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [listenStats, setListenStats] = useState<StatsOverview | null>(null);

  const playing = status === "playing";
  const hasTrack = Boolean(current);
  const scrubMax = Math.max(durationMs, positionMs, 1);
  const progress =
    durationMs > 0
      ? Math.min(100, (positionMs / durationMs) * 100)
      : Math.min(100, (positionMs / scrubMax) * 100);

  useEffect(() => {
    let cancelled = false;
    void listRecentlyPlayed(12)
      .then((items) => {
        if (!cancelled) setRecent(items);
      })
      .catch(() => {
        if (!cancelled) setRecent([]);
      });
    void listPlaylists()
      .then((items) => {
        if (!cancelled) setPlaylists(items.slice(0, 6));
      })
      .catch(() => {
        if (!cancelled) setPlaylists([]);
      });
    void fetchStatsOverview("all")
      .then((overview) => {
        if (!cancelled) setListenStats(overview);
      })
      .catch(() => {
        if (!cancelled) setListenStats(null);
      });
    return () => {
      cancelled = true;
    };
  }, [stats.trackCount]);

  const recentlyAdded = tracks.slice(0, 8);
  const emptyLibrary = stats.trackCount === 0;

  return (
    <section className="home-view" aria-label="Home">
      <header className="home-view__top">
        <div>
          <p className="home-view__greeting">{greeting()}</p>
          <h1 className="view-title">Home</h1>
        </div>
        <button
          type="button"
          className="text-button"
          onClick={() => setActiveNav("search")}
        >
          Search
        </button>
      </header>

      <UpdatesShowcase />

      {emptyLibrary ? (
        <div className="home-empty">
          <p className="home-empty__title">Drop music anywhere</p>
          <p className="home-empty__detail">
            Or choose a folder to start your library. Songs stay where they are —
            Atrium only indexes the folder.
          </p>
          <button
            type="button"
            className="button-primary"
            disabled={!isTauriRuntime()}
            onClick={() => {
              void (async () => {
                const folder = await pickMusicFolder();
                if (folder) await startLibraryScan([folder]);
              })();
            }}
          >
            Choose music folder
          </button>
        </div>
      ) : (
        <>
          <section
            className={cn("home-hero", !hasTrack && "home-hero--quiet")}
            aria-label="Now playing"
          >
            {hasTrack ? (
              <>
                <button
                  type="button"
                  className="home-hero__art-button"
                  aria-label="Open now playing"
                  onClick={() => setNowPlayingOpen(true)}
                >
                  <ArtworkImage
                    className="home-hero__art"
                    cacheKey={current?.artworkCacheKey}
                    alt=""
                  />
                </button>
                <div className="home-hero__meta">
                  <p className="home-hero__title">
                    {current?.title || "Unknown title"}
                  </p>
                  <p className="home-hero__subtitle">
                    {current?.artist || "Unknown artist"}
                    {current?.album ? ` · ${current.album}` : ""}
                  </p>
                  <div className="home-hero__transport">
                    <button
                      type="button"
                      className="icon-button"
                      aria-label="Previous"
                      onClick={() => {
                        void playerPrevious().then(applySnapshot);
                      }}
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      className="play-button"
                      aria-label={playing ? "Pause" : "Play"}
                      onClick={() => {
                        void playerToggle().then(applySnapshot);
                      }}
                    >
                      {playing ? "❚❚" : "▶"}
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label="Next"
                      onClick={() => {
                        void playerNext().then(applySnapshot);
                      }}
                    >
                      ›
                    </button>
                  </div>
                  <div className="home-hero__scrub">
                    <SeekSlider
                      max={scrubMax}
                      positionMs={positionMs}
                      progress={progress}
                    />
                    <span className="home-hero__times">
                      {formatPlaybackTime(positionMs)}
                      <span>
                        {durationMs > 0
                          ? formatPlaybackTime(durationMs)
                          : "…"}
                      </span>
                    </span>
                  </div>
                  <div className="home-hero__actions">
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setNowPlayingOpen(true)}
                    >
                      Now playing
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => toggleDrawer("lyrics")}
                    >
                      Lyrics
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="home-hero__welcome">
                <p className="home-hero__title">Ready when you are</p>
                <p className="home-hero__subtitle">
                  Pick something from recently played, or open your library.
                </p>
                <button
                  type="button"
                  className="button-primary"
                  onClick={() => setActiveNav("library")}
                >
                  Browse library
                </button>
              </div>
            )}
          </section>

          {listenStats && listenStats.totalScrobbles > 0 ? (
            <button
              type="button"
              className="home-stats-teaser"
              onClick={() => setActiveNav("stats")}
            >
              <div>
                <p className="home-stats-teaser__label">Listening</p>
                <p className="home-stats-teaser__value">
                  {formatListenDuration(listenStats.totalListenMs)}
                </p>
              </div>
              <div>
                <p className="home-stats-teaser__label">Scrobbles</p>
                <p className="home-stats-teaser__value">
                  {listenStats.totalScrobbles}
                </p>
              </div>
              <div>
                <p className="home-stats-teaser__label">Tracks</p>
                <p className="home-stats-teaser__value">
                  {listenStats.uniqueTracks}
                </p>
              </div>
              <span className="home-stats-teaser__action">Open stats</span>
            </button>
          ) : null}

          {recent.length > 0 ? (
            <HomeStrip
              title="Recently played"
              actionLabel="See stats"
              onAction={() => setActiveNav("stats")}
            >
              <ul className="home-strip__rail">
                {recent.slice(0, 6).map((track) => (
                  <li key={track.id}>
                    <button
                      type="button"
                      className="home-tile"
                      onClick={() => {
                        void playTracks([track.id], 0).then(applySnapshot);
                      }}
                    >
                      <ArtworkImage
                        className="home-tile__art"
                        cacheKey={track.artworkCacheKey}
                        alt=""
                      />
                      <strong>{track.title || "Unknown"}</strong>
                      <span>{track.artist || "Unknown artist"}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </HomeStrip>
          ) : null}

          {playlists.length > 0 ? (
            <HomeStrip
              title="Your playlists"
              actionLabel="See all"
              onAction={() => setActiveNav("playlists")}
            >
              <ul className="home-strip__rail">
                {playlists.map((playlist) => (
                  <li key={playlist.id}>
                    <button
                      type="button"
                      className="home-tile home-tile--playlist"
                      onClick={() => setActiveNav("playlists")}
                    >
                      <span className="home-tile__cover" aria-hidden>
                        {(playlist.name.trim().charAt(0) || "P").toUpperCase()}
                      </span>
                      <strong>{playlist.name}</strong>
                      <span>{playlist.trackCount} songs</span>
                    </button>
                  </li>
                ))}
              </ul>
            </HomeStrip>
          ) : null}

          {recentlyAdded.length > 0 ? (
            <HomeStrip title="Recently added">
              <ul className="home-added">
                {recentlyAdded.map((track, index) => (
                  <li key={track.id}>
                    <button
                      type="button"
                      className="home-added__row"
                      onDoubleClick={() => {
                        void playTracks(
                          recentlyAdded.map((t) => t.id),
                          index,
                        ).then(applySnapshot);
                      }}
                      onClick={() => {
                        void playTracks(
                          recentlyAdded.map((t) => t.id),
                          index,
                        ).then(applySnapshot);
                      }}
                    >
                      <ArtworkImage
                        className="home-added__art"
                        cacheKey={track.artworkCacheKey}
                        alt=""
                      />
                      <span className="home-added__meta">
                        <strong>{track.title || "Unknown"}</strong>
                        <span>
                          {track.artist || "Unknown"} ·{" "}
                          {formatDuration(track.durationMs)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </HomeStrip>
          ) : null}
        </>
      )}
    </section>
  );
}

function HomeStrip({
  title,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
}) {
  return (
    <section className="home-strip">
      <div className="home-strip__header">
        <h2>{title}</h2>
        {actionLabel && onAction ? (
          <button type="button" className="text-button" onClick={onAction}>
            {actionLabel}
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}
