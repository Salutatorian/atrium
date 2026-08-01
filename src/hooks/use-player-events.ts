import { useEffect } from "react";
import {
  onPlayerError,
  onPlayerPosition,
  onQueueChanged,
  onTrackChanged,
} from "../features/player/api";
import { isTauriRuntime } from "../services/tauri";
import { usePlayerStore } from "../stores/player-store";

export function usePlayerEvents() {
  const hydrate = usePlayerStore((s) => s.hydrate);
  const setPosition = usePlayerStore((s) => s.setPosition);
  const setCurrent = usePlayerStore((s) => s.setCurrent);
  const setQueue = usePlayerStore((s) => s.setQueue);
  const setError = usePlayerStore((s) => s.setError);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isTauriRuntime()) return;

    const unsubs: Array<() => void> = [];
    let cancelled = false;

    void onPlayerPosition((event) => {
      setPosition(event.positionMs, event.durationMs, event.status);
    }).then((fn) => {
      if (cancelled) fn();
      else unsubs.push(fn);
    });

    void onTrackChanged((event) => {
      setCurrent(event.track, event.queueIndex);
      void hydrate();
    }).then((fn) => {
      if (cancelled) fn();
      else unsubs.push(fn);
    });

    void onQueueChanged((queue) => {
      setQueue(queue);
      void hydrate();
    }).then((fn) => {
      if (cancelled) fn();
      else unsubs.push(fn);
    });

    void onPlayerError((message) => {
      setError(message);
    }).then((fn) => {
      if (cancelled) fn();
      else unsubs.push(fn);
    });

    return () => {
      cancelled = true;
      for (const unsub of unsubs) unsub();
    };
  }, [hydrate, setCurrent, setError, setPosition, setQueue]);
}
