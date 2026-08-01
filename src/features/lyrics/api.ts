import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "../../services/tauri";
import type {
  LyricsPayload,
  LyricsSearchQuery,
  LyricsSearchResult,
} from "./types";

const emptyLyrics: LyricsPayload = {
  trackId: null,
  plainText: null,
  syncedLrc: null,
  lines: [],
  source: "none",
  providerId: "none",
  offsetMs: 0,
  attribution: "",
  userEdited: false,
  sourceUrl: null,
};

export async function resolveLyrics(args: {
  trackId?: number | null;
  path: string;
  preferSynchronized?: boolean;
}): Promise<LyricsPayload> {
  if (!isTauriRuntime()) return emptyLyrics;
  return invoke<LyricsPayload>("lyrics_resolve", {
    trackId: args.trackId ?? null,
    path: args.path,
    preferSynchronized: args.preferSynchronized,
  });
}

export async function saveLyrics(args: {
  trackId: number;
  plainText?: string | null;
  syncedLrc?: string | null;
  offsetMs?: number;
}): Promise<LyricsPayload> {
  return invoke<LyricsPayload>("lyrics_save", {
    trackId: args.trackId,
    plainText: args.plainText ?? null,
    syncedLrc: args.syncedLrc ?? null,
    offsetMs: args.offsetMs,
  });
}

export async function setLyricsOffset(
  trackId: number,
  offsetMs: number,
): Promise<LyricsPayload> {
  return invoke<LyricsPayload>("lyrics_set_offset", { trackId, offsetMs });
}

export async function searchLrclib(
  query: LyricsSearchQuery,
): Promise<LyricsSearchResult[]> {
  return invoke<LyricsSearchResult[]>("lyrics_search_lrclib", { query });
}

export async function fetchLrclib(args: {
  trackId?: number | null;
  query: LyricsSearchQuery;
  resultId?: string;
}): Promise<LyricsPayload> {
  return invoke<LyricsPayload>("lyrics_fetch_lrclib", {
    trackId: args.trackId ?? null,
    query: args.query,
    resultId: args.resultId,
  });
}
