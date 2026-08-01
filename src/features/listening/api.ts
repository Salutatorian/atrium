import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "../../services/tauri";
import type { TrackSummary } from "../library/types";

export type HistoryEntry = {
  id: number;
  playedAt: string;
  durationListenedMs?: number | null;
  completed: boolean;
  track?: TrackSummary | null;
  title?: string | null;
  artist?: string | null;
  album?: string | null;
};

export type ScrobbleInput = {
  trackId?: number | null;
  title: string;
  artist?: string | null;
  album?: string | null;
  durationMs?: number | null;
  listenedMs: number;
  completed: boolean;
  clientEventId?: string | null;
};

export type StatsOverview = {
  totalScrobbles: number;
  uniqueTracks: number;
  uniqueArtists: number;
  totalListenMs: number;
  completedPlays: number;
  skips: number;
};

export type TrackStat = {
  identityKey: string;
  title: string;
  artist: string;
  album: string;
  trackId?: number | null;
  playCount: number;
  skipCount: number;
  totalListenMs: number;
  lastPlayedAt?: string | null;
  firstPlayedAt?: string | null;
};

export type ArtistStat = {
  artist: string;
  playCount: number;
  totalListenMs: number;
  trackCount: number;
};

export type AlbumStat = {
  album: string;
  artist: string;
  playCount: number;
  totalListenMs: number;
  trackCount: number;
};

export type ScrobbleEntry = {
  id: number;
  playedAt: string;
  title: string;
  artist: string;
  album: string;
  listenedMs: number;
  durationMs?: number | null;
  completed: boolean;
  skipped: boolean;
  trackId?: number | null;
};

export type StoryMoment = {
  title: string;
  artist: string;
  playedAt: string;
};

export type StoryDay = {
  day: string;
  totalListenMs: number;
  scrobbles: number;
};

export type StoryMonth = {
  month: number;
  totalListenMs: number;
  scrobbles: number;
};

export type YearStory = {
  year: number;
  totalListenMs: number;
  totalScrobbles: number;
  uniqueTracks: number;
  uniqueArtists: number;
  unfinishedListens: number;
  topTracks: TrackStat[];
  topArtists: ArtistStat[];
  firstListen?: StoryMoment | null;
  lastListen?: StoryMoment | null;
  deepestDay?: StoryDay | null;
  months: StoryMonth[];
};

export type StatsRange = "week" | "month" | "year" | "all";

export async function listFavorites(): Promise<TrackSummary[]> {
  if (!isTauriRuntime()) return [];
  return invoke<TrackSummary[]>("favorites_list");
}

export async function isFavorite(trackId: number): Promise<boolean> {
  if (!isTauriRuntime() || trackId <= 0) return false;
  return invoke<boolean>("favorites_is_favorite", { trackId });
}

export async function toggleFavorite(trackId: number): Promise<boolean> {
  const result = await invoke<{ favorited: boolean }>("favorites_toggle", {
    trackId,
  });
  return result.favorited;
}

export async function listHistory(limit = 100): Promise<HistoryEntry[]> {
  if (!isTauriRuntime()) return [];
  return invoke<HistoryEntry[]>("history_list", { limit });
}

export async function listRecentlyPlayed(limit = 100): Promise<TrackSummary[]> {
  if (!isTauriRuntime()) return [];
  return invoke<TrackSummary[]>("history_recently_played", { limit });
}

export async function recordPlay(
  trackId: number,
  durationListenedMs?: number | null,
  completed = false,
): Promise<void> {
  if (!isTauriRuntime() || trackId <= 0) return;
  await invoke("history_record_play", {
    trackId,
    durationListenedMs: durationListenedMs ?? null,
    completed,
  });
}

export async function recordScrobble(scrobble: ScrobbleInput): Promise<void> {
  if (!isTauriRuntime()) return;
  await invoke("stats_record_scrobble", { scrobble });
}

export async function fetchStatsOverview(
  range: StatsRange = "all",
): Promise<StatsOverview> {
  if (!isTauriRuntime()) {
    return {
      totalScrobbles: 0,
      uniqueTracks: 0,
      uniqueArtists: 0,
      totalListenMs: 0,
      completedPlays: 0,
      skips: 0,
    };
  }
  return invoke<StatsOverview>("stats_get_overview", { range });
}

export async function fetchTopTracks(
  range: StatsRange = "all",
  limit = 25,
): Promise<TrackStat[]> {
  if (!isTauriRuntime()) return [];
  return invoke<TrackStat[]>("stats_get_top_tracks", { range, limit });
}

export async function fetchTopArtists(
  range: StatsRange = "all",
  limit = 25,
): Promise<ArtistStat[]> {
  if (!isTauriRuntime()) return [];
  return invoke<ArtistStat[]>("stats_get_top_artists", { range, limit });
}

export async function fetchTopAlbums(
  range: StatsRange = "all",
  limit = 25,
): Promise<AlbumStat[]> {
  if (!isTauriRuntime()) return [];
  return invoke<AlbumStat[]>("stats_get_top_albums", { range, limit });
}

export async function fetchScrobbles(limit = 100): Promise<ScrobbleEntry[]> {
  if (!isTauriRuntime()) return [];
  return invoke<ScrobbleEntry[]>("stats_list_scrobbles", { limit });
}

export async function fetchDayScrobbles(day: string): Promise<ScrobbleEntry[]> {
  if (!isTauriRuntime()) return [];
  return invoke<ScrobbleEntry[]>("stats_list_day_scrobbles", { day });
}

export async function fetchStoryYears(): Promise<number[]> {
  if (!isTauriRuntime()) return [];
  return invoke<number[]>("stats_list_story_years");
}

export async function fetchYearStory(year: number): Promise<YearStory> {
  return invoke<YearStory>("stats_get_year_story", { year });
}

export function formatListenDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
