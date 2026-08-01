import { useEffect, useState, type ReactNode } from "react";
import {
  fetchScrobbles,
  fetchStatsOverview,
  fetchTopAlbums,
  fetchTopArtists,
  fetchTopTracks,
  formatListenDuration,
  type AlbumStat,
  type ArtistStat,
  type ScrobbleEntry,
  type StatsOverview,
  type StatsRange,
  type TrackStat,
} from "./api";
import {
  isYearLookbackSeason,
  markYearLookbackSeen,
  yearLookbackTargetYear,
  YearLookback,
} from "./YearLookback";
import { DayListeningDiary } from "./DayListeningDiary";
import { cn } from "../../utils/cn";

const ranges: { id: StatsRange; label: string }[] = [
  { id: "week", label: "7 days" },
  { id: "month", label: "30 days" },
  { id: "year", label: "This year" },
  { id: "all", label: "All time" },
];

export function StatsView() {
  const [range, setRange] = useState<StatsRange>("all");
  const [overview, setOverview] = useState<StatsOverview | null>(null);
  const [tracks, setTracks] = useState<TrackStat[]>([]);
  const [artists, setArtists] = useState<ArtistStat[]>([]);
  const [albums, setAlbums] = useState<AlbumStat[]>([]);
  const [scrobbles, setScrobbles] = useState<ScrobbleEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lookbackYear, setLookbackYear] = useState<number | null>(null);
  const season = isYearLookbackSeason();
  const featuredYear = yearLookbackTargetYear();

  useEffect(() => {
    if (!season) setLookbackYear(null);
  }, [season]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      fetchStatsOverview(range),
      fetchTopTracks(range, 20),
      fetchTopArtists(range, 15),
      fetchTopAlbums(range, 15),
      fetchScrobbles(40),
    ])
      .then(([ov, topTracks, topArtists, topAlbums, recent]) => {
        if (cancelled) return;
        setOverview(ov);
        setTracks(topTracks);
        setArtists(topArtists);
        setAlbums(topAlbums);
        setScrobbles(recent);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  return (
    <section className="stats-view" aria-label="Listening stats">
      <header className="stats-view__header">
        <div>
          <h1 className="view-title">Stats</h1>
          <p className="stats-view__lead">
            Every listen counts — finished or not — and is permanent. Use{" "}
            <em>This year</em> for the calendar year, or <em>All time</em> for
            everything since you started. There&apos;s no erase button.
          </p>
        </div>
        <div className="stats-range" role="tablist" aria-label="Time range">
          {ranges.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={range === item.id}
              className={cn(
                "stats-range__item",
                range === item.id && "stats-range__item--active",
              )}
              onClick={() => setRange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {season ? (
        <div className="stats-lookback-entry">
          <div>
            <p className="stats-lookback-entry__label">Year lookback</p>
            <p className="stats-lookback-entry__copy">
              A quiet story of your room — not a social flex.
            </p>
          </div>
          <div className="stats-lookback-entry__actions">
            <button
              type="button"
              className="button-primary"
              onClick={() => setLookbackYear(featuredYear)}
            >
              Your {featuredYear} lookback
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="settings-note">{error}</p> : null}

      <DayListeningDiary />

      {overview ? (
        <div className="stats-grid">
          <StatCard
            label="Listening time"
            value={formatListenDuration(overview.totalListenMs)}
          />
          <StatCard label="Scrobbles" value={String(overview.totalScrobbles)} />
          <StatCard label="Tracks" value={String(overview.uniqueTracks)} />
          <StatCard label="Artists" value={String(overview.uniqueArtists)} />
          <StatCard label="Completed" value={String(overview.completedPlays)} />
          <StatCard label="Skips" value={String(overview.skips)} />
        </div>
      ) : null}

      <div className="stats-columns">
        <StatsSection title="Top tracks">
          {tracks.length === 0 ? (
            <p className="empty-panel__detail">
              Play some music — listens will show up here.
            </p>
          ) : (
            <ol className="stats-rank">
              {tracks.map((track, index) => (
                <li key={track.identityKey}>
                  <span className="stats-rank__n">{index + 1}</span>
                  <div className="stats-rank__meta">
                    <strong>{track.title}</strong>
                    <span>
                      {track.artist || "Unknown artist"}
                      {track.album ? ` · ${track.album}` : ""}
                    </span>
                  </div>
                  <div className="stats-rank__nums">
                    <span>{formatListenDuration(track.totalListenMs)}</span>
                    <span className="muted">{track.playCount} plays</span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </StatsSection>

        <StatsSection title="Top artists">
          {artists.length === 0 ? (
            <p className="empty-panel__detail">No artist stats yet.</p>
          ) : (
            <ol className="stats-rank">
              {artists.map((artist, index) => (
                <li key={artist.artist}>
                  <span className="stats-rank__n">{index + 1}</span>
                  <div className="stats-rank__meta">
                    <strong>{artist.artist}</strong>
                    <span>{artist.trackCount} tracks</span>
                  </div>
                  <div className="stats-rank__nums">
                    <span>{formatListenDuration(artist.totalListenMs)}</span>
                    <span className="muted">{artist.playCount} plays</span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </StatsSection>

        <StatsSection title="Top albums">
          {albums.length === 0 ? (
            <p className="empty-panel__detail">No album stats yet.</p>
          ) : (
            <ol className="stats-rank">
              {albums.map((album, index) => (
                <li key={`${album.artist}-${album.album}`}>
                  <span className="stats-rank__n">{index + 1}</span>
                  <div className="stats-rank__meta">
                    <strong>{album.album}</strong>
                    <span>{album.artist}</span>
                  </div>
                  <div className="stats-rank__nums">
                    <span>{formatListenDuration(album.totalListenMs)}</span>
                    <span className="muted">{album.playCount} plays</span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </StatsSection>
      </div>

      <StatsSection title="Recent listens">
        {scrobbles.length === 0 ? (
          <p className="empty-panel__detail">No scrobbles yet.</p>
        ) : (
          <ul className="stats-scrobbles">
            {scrobbles.map((item) => (
              <li key={item.id}>
                <div className="stats-rank__meta">
                  <strong>{item.title}</strong>
                  <span>
                    {item.artist || "Unknown artist"}
                    {item.album ? ` · ${item.album}` : ""}
                  </span>
                </div>
                <div className="stats-rank__nums">
                  <span>{formatListenDuration(item.listenedMs)}</span>
                  <span className="muted">
                    {item.completed ? "Completed" : item.skipped ? "Skip" : "Partial"}
                    {" · "}
                    {formatPlayedAt(item.playedAt)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </StatsSection>

      {season && lookbackYear !== null ? (
        <YearLookback
          year={lookbackYear}
          onClose={() => {
            markYearLookbackSeen(lookbackYear);
            setLookbackYear(null);
          }}
        />
      ) : null}
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-card">
      <span className="stat-card__label">{label}</span>
      <strong className="stat-card__value">{value}</strong>
    </div>
  );
}

function StatsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="stats-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function formatPlayedAt(value: string): string {
  const date = new Date(value.includes("T") ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
