import { create } from "zustand";
import { getPlayerState } from "../features/player/api";
import type {
  PlayerSnapshot,
  PlayerStatus,
  QueueTrack,
  RepeatMode,
} from "../features/player/types";

type PlayerState = PlayerSnapshot & {
  error?: string | null;
  hydrate: () => Promise<void>;
  applySnapshot: (snapshot: PlayerSnapshot) => void;
  setPosition: (positionMs: number, durationMs: number, status: PlayerStatus) => void;
  setCurrent: (track?: QueueTrack | null, queueIndex?: number | null) => void;
  setQueue: (queue: QueueTrack[]) => void;
  setError: (message: string | null) => void;
};

export const usePlayerStore = create<PlayerState>((set) => ({
  status: "stopped",
  current: null,
  positionMs: 0,
  durationMs: 0,
  volume: 0.8,
  muted: false,
  shuffle: false,
  repeat: "off" as RepeatMode,
  queue: [],
  queueIndex: null,
  error: null,
  hydrate: async () => {
    const snapshot = await getPlayerState();
    set({ ...snapshot, error: null });
  },
  applySnapshot: (snapshot) => set({ ...snapshot }),
  setPosition: (positionMs, durationMs, status) =>
    set((state) => {
      // Skip no-op ticks so long tracks don't thrash the whole UI every 200ms
      if (
        state.status === status &&
        state.durationMs === durationMs &&
        Math.floor(state.positionMs / 250) === Math.floor(positionMs / 250)
      ) {
        return state;
      }
      return { positionMs, durationMs, status };
    }),
  setCurrent: (current, queueIndex) =>
    set({
      current: current ?? null,
      queueIndex: queueIndex ?? null,
    }),
  setQueue: (queue) => set({ queue }),
  setError: (error) => set({ error }),
}));
