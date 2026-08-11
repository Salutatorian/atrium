import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { isTauriRuntime } from "../../services/tauri";
import type {
  PlayerSnapshot,
  PositionEvent,
  QueueTrack,
  RepeatMode,
  SpectrumEvent,
  TrackChangedEvent,
} from "./types";

const emptySnapshot: PlayerSnapshot = {
  status: "stopped",
  current: null,
  positionMs: 0,
  durationMs: 0,
  volume: 0.8,
  muted: false,
  shuffle: false,
  repeat: "off",
  queue: [],
  queueIndex: null,
};

export async function getPlayerState(): Promise<PlayerSnapshot> {
  if (!isTauriRuntime()) return emptySnapshot;
  return invoke<PlayerSnapshot>("player_get_state");
}

export async function playerPlay(): Promise<PlayerSnapshot> {
  return invoke<PlayerSnapshot>("player_play");
}

export async function playerPause(): Promise<PlayerSnapshot> {
  return invoke<PlayerSnapshot>("player_pause");
}

export async function playerToggle(): Promise<PlayerSnapshot> {
  return invoke<PlayerSnapshot>("player_toggle");
}

export async function playerStop(): Promise<PlayerSnapshot> {
  return invoke<PlayerSnapshot>("player_stop");
}

export async function playerNext(): Promise<PlayerSnapshot> {
  return invoke<PlayerSnapshot>("player_next");
}

export async function playerPrevious(): Promise<PlayerSnapshot> {
  return invoke<PlayerSnapshot>("player_previous");
}

export async function playerSeek(positionMs: number): Promise<PlayerSnapshot> {
  return invoke<PlayerSnapshot>("player_seek", { positionMs });
}

export async function playerSetVolume(volume: number): Promise<PlayerSnapshot> {
  return invoke<PlayerSnapshot>("player_set_volume", { volume });
}

export async function playerSetMuted(muted: boolean): Promise<PlayerSnapshot> {
  return invoke<PlayerSnapshot>("player_set_muted", { muted });
}

export async function playerSetShuffle(enabled: boolean): Promise<PlayerSnapshot> {
  return invoke<PlayerSnapshot>("player_set_shuffle", { enabled });
}

export async function playerSetRepeat(mode: RepeatMode): Promise<PlayerSnapshot> {
  return invoke<PlayerSnapshot>("player_set_repeat", { mode });
}

export async function playTracks(
  trackIds: number[],
  startIndex = 0,
): Promise<PlayerSnapshot> {
  return invoke<PlayerSnapshot>("player_play_tracks", {
    trackIds,
    startIndex,
  });
}

export async function playPaths(
  paths: string[],
  startIndex = 0,
): Promise<PlayerSnapshot> {
  return invoke<PlayerSnapshot>("player_play_paths", {
    paths,
    startIndex,
  });
}

export async function addToQueue(
  trackIds: number[],
  next = false,
): Promise<PlayerSnapshot> {
  return invoke<PlayerSnapshot>("player_add_to_queue", { trackIds, next });
}

export async function removeFromQueue(index: number): Promise<PlayerSnapshot> {
  return invoke<PlayerSnapshot>("player_remove_from_queue", { index });
}

export async function clearQueue(): Promise<PlayerSnapshot> {
  return invoke<PlayerSnapshot>("player_clear_queue");
}

export async function onPlayerPosition(
  handler: (event: PositionEvent) => void,
): Promise<UnlistenFn> {
  if (!isTauriRuntime()) return () => undefined;
  return listen<PositionEvent>("player://position", (event) => {
    handler(event.payload);
  });
}

export async function onTrackChanged(
  handler: (event: TrackChangedEvent) => void,
): Promise<UnlistenFn> {
  if (!isTauriRuntime()) return () => undefined;
  return listen<TrackChangedEvent>("player://track-changed", (event) => {
    handler(event.payload);
  });
}

export async function onQueueChanged(
  handler: (queue: QueueTrack[]) => void,
): Promise<UnlistenFn> {
  if (!isTauriRuntime()) return () => undefined;
  return listen<QueueTrack[]>("player://queue-changed", (event) => {
    handler(event.payload);
  });
}

export async function onPlayerError(
  handler: (message: string) => void,
): Promise<UnlistenFn> {
  if (!isTauriRuntime()) return () => undefined;
  return listen<string>("player://error", (event) => {
    handler(event.payload);
  });
}

export async function onPlayerSpectrum(
  handler: (frame: SpectrumEvent) => void,
): Promise<UnlistenFn> {
  if (!isTauriRuntime()) return () => undefined;
  return listen<SpectrumEvent>("player://spectrum", (event) => {
    handler(event.payload);
  });
}
