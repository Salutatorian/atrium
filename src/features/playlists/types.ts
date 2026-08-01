export type PlaylistSummary = {
  id: string;
  name: string;
  description?: string | null;
  trackCount: number;
  updatedAt: string;
};

export type SmartRule = {
  field: "title" | "artist" | "album" | "albumArtist" | "genre" | "year";
  op: "contains" | "equals" | "startsWith" | "gte" | "lte";
  value: string;
};

export type SmartPlaylistRules = {
  matchMode: "all" | "any";
  rules: SmartRule[];
};

export type SmartPlaylistSummary = {
  id: string;
  name: string;
  rulesJson: string;
  updatedAt: string;
};
