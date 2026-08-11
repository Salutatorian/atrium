export type PlayerStatus = "stopped" | "playing" | "paused";
export type RepeatMode = "off" | "track" | "queue";

export type QueueTrack = {
  trackId: number;
  path: string;
  title?: string | null;
  artist?: string | null;
  album?: string | null;
  durationMs?: number | null;
  artworkCacheKey?: string | null;
  replaygainTrackGain?: number | null;
  replaygainAlbumGain?: number | null;
};

export type PlayerSnapshot = {
  status: PlayerStatus;
  current?: QueueTrack | null;
  positionMs: number;
  durationMs: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  queue: QueueTrack[];
  queueIndex?: number | null;
};

export type SpectrumEvent = {
  bands: number[];
  bass: number;
  beat: number;
  energy: number;
};

export type PositionEvent = {
  positionMs: number;
  durationMs: number;
  status: PlayerStatus;
};

export type TrackChangedEvent = {
  track?: QueueTrack | null;
  queueIndex?: number | null;
};
