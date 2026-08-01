import { useEffect, useRef } from "react";
import { usePlayerStore } from "../../stores/player-store";
import { recordPlay } from "./api";

/** Records library listens when the current track changes. */
export function useListeningRecorder() {
  const current = usePlayerStore((s) => s.current);
  const positionMs = usePlayerStore((s) => s.positionMs);
  const lastId = useRef<number | null>(null);
  const lastPosition = useRef(0);

  useEffect(() => {
    lastPosition.current = positionMs;
  }, [positionMs]);

  useEffect(() => {
    const previousId = lastId.current;
    const nextId = current?.trackId ?? null;

    if (previousId && previousId > 0 && previousId !== nextId) {
      void recordPlay(previousId, lastPosition.current, false);
    }

    if (nextId && nextId > 0 && nextId !== previousId) {
      void recordPlay(nextId, 0, false);
    }

    lastId.current = nextId;
  }, [current?.trackId]);
}
