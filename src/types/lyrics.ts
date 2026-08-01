/** Frontend mirror of the lyrics provider contract (Phase 5). */

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

export type LyricsDocument = {
  plainText?: string;
  syncedLrc?: string;
  source: string;
  providerId: string;
};

export type LyricsProviderInfo = {
  providerId: string;
  displayName: string;
  supportsPlain: boolean;
  supportsSynced: boolean;
  requiresApiKey: boolean;
  termsNotice: string;
  attributionRequirements: string;
  cachingPolicy: "local" | "session" | "none";
};
