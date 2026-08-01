export type LyricLine = {
  timeMs: number;
  text: string;
};

export type LyricsPayload = {
  trackId?: number | null;
  plainText?: string | null;
  syncedLrc?: string | null;
  lines: LyricLine[];
  source: string;
  providerId: string;
  offsetMs: number;
  attribution: string;
  userEdited: boolean;
  sourceUrl?: string | null;
};

export type LyricsSearchQuery = {
  title: string;
  artist?: string;
  album?: string;
  durationMs?: number;
};

export type LyricsSearchResult = {
  id: string;
  title: string;
  artist?: string;
  synced: boolean;
};
