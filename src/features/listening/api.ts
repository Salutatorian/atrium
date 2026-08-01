import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "../../services/tauri";
import type { TrackSummary } from "../library/types";

export type HistoryEntry = {
  id: number;
  playedAt: string;
  durationListenedMs?: number | null;
  completed: boolean;
  track?: TrackSummary | null;
};

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

export async function clearHistory(): Promise<void> {
  await invoke("history_clear");
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
