import { useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauriRuntime } from "../../services/tauri";
import { usePlayerStore } from "../../stores/player-store";
import { useSettingsStore } from "../../stores/settings-store";
import { recordScrobble, type ScrobbleInput } from "./api";

const PENDING_KEY = "atrium.pending-listen";

type Session = {
  eventId: string;
  path: string;
  trackId: number | null;
  title: string;
  artist: string;
  album: string;
  durationMs: number;
  listenedMs: number;
  lastPositionMs: number;
};

type PendingPayload = {
  eventId: string;
  trackId: number | null;
  title: string;
  artist: string;
  album: string;
  durationMs: number;
  listenedMs: number;
};

function newEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `listen-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function toInput(session: Session | PendingPayload, completed: boolean): ScrobbleInput {
  return {
    trackId: session.trackId,
    title: session.title || "Unknown title",
    artist: session.artist || null,
    album: session.album || null,
    durationMs: session.durationMs > 0 ? session.durationMs : null,
    listenedMs: session.listenedMs,
    completed,
    clientEventId: session.eventId,
  };
}

function isCompleted(session: Session | PendingPayload): boolean {
  if (session.durationMs > 0) {
    return (
      session.listenedMs >=
      Math.max(30_000, Math.min(Math.floor(session.durationMs / 2), 240_000))
    );
  }
  return session.listenedMs >= 30_000;
}

function writePending(session: Session) {
  if (session.listenedMs < 3_000) {
    localStorage.removeItem(PENDING_KEY);
    return;
  }
  const payload: PendingPayload = {
    eventId: session.eventId,
    trackId: session.trackId,
    title: session.title,
    artist: session.artist,
    album: session.album,
    durationMs: session.durationMs,
    listenedMs: session.listenedMs,
  };
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(payload));
  } catch {
    // Ignore quota / private-mode failures; SQLite flush still runs when possible.
  }
}

function clearPending() {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    // ignore
  }
}

async function flushSession(session: Session): Promise<void> {
  if (session.listenedMs < 3_000) {
    clearPending();
    return;
  }
  writePending(session);
  try {
    await recordScrobble(toInput(session, isCompleted(session)));
    clearPending();
  } catch {
    // Keep pending so the next launch can recover.
  }
}

async function recoverPending(): Promise<void> {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(PENDING_KEY);
  } catch {
    return;
  }
  if (!raw) return;

  let payload: PendingPayload;
  try {
    payload = JSON.parse(raw) as PendingPayload;
  } catch {
    clearPending();
    return;
  }

  if (!payload?.eventId || typeof payload.listenedMs !== "number") {
    clearPending();
    return;
  }
  if (payload.listenedMs < 3_000) {
    clearPending();
    return;
  }

  try {
    await recordScrobble(toInput(payload, isCompleted(payload)));
    clearPending();
  } catch {
    // Leave pending for a later attempt.
  }
}

/**
 * Records durable listen stats with metadata snapshots (survive file deletion).
 * Checkpoints to localStorage so downtime / abrupt exit cannot wipe the listen.
 */
export function useListeningRecorder() {
  const current = usePlayerStore((s) => s.current);
  const positionMs = usePlayerStore((s) => s.positionMs);
  const durationMs = usePlayerStore((s) => s.durationMs);
  const status = usePlayerStore((s) => s.status);
  const session = useRef<Session | null>(null);

  useEffect(() => {
    void recoverPending();
  }, []);

  useEffect(() => {
    const active = session.current;
    if (!active) return;
    if (durationMs > 0) active.durationMs = durationMs;
    if (status !== "playing") {
      active.lastPositionMs = positionMs;
      writePending(active);
      return;
    }
    if (positionMs > active.lastPositionMs) {
      active.listenedMs += positionMs - active.lastPositionMs;
    }
    active.lastPositionMs = positionMs;
    writePending(active);
  }, [positionMs, durationMs, status]);

  useEffect(() => {
    const nextPath = current?.path ?? null;
    const previous = session.current;

    if (previous && previous.path !== nextPath) {
      void flushSession(previous);
      session.current = null;
    }

    if (current?.path && (!session.current || session.current.path !== current.path)) {
      session.current = {
        eventId: newEventId(),
        path: current.path,
        trackId: current.trackId > 0 ? current.trackId : null,
        title: current.title || "Unknown title",
        artist: current.artist || "",
        album: current.album || "",
        durationMs: durationMs > 0 ? durationMs : current.durationMs || 0,
        listenedMs: 0,
        lastPositionMs: positionMs,
      };
      writePending(session.current);
    }

    if (!nextPath) {
      session.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.path, current?.trackId, current?.title]);

  useEffect(() => {
    const persist = () => {
      if (session.current) writePending(session.current);
    };
    const flush = () => {
      if (session.current) void flushSession(session.current);
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
      else persist();
    };

    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", persist);
    document.addEventListener("visibilitychange", onVisibility);

    const checkpoint = window.setInterval(() => {
      if (session.current && session.current.listenedMs >= 3_000) {
        writePending(session.current);
      }
    }, 15_000);

    let unlistenClose: (() => void) | undefined;
    if (isTauriRuntime()) {
      void getCurrentWindow()
        .onCloseRequested(async (event) => {
          // Flush listen data, then honor close-to-tray (do not always destroy).
          event.preventDefault();
          try {
            if (session.current) {
              await flushSession(session.current);
            } else {
              await recoverPending();
            }
          } finally {
            const closeToTray =
              useSettingsStore.getState().settings.general.closeToTray;
            const win = getCurrentWindow();
            if (closeToTray) {
              await win.hide();
            } else {
              unlistenClose?.();
              unlistenClose = undefined;
              await win.destroy();
            }
          }
        })
        .then((fn) => {
          unlistenClose = fn;
        })
        .catch(() => {
          // Window close hook unavailable — pagehide/pending still cover most cases.
        });
    }

    return () => {
      window.clearInterval(checkpoint);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", persist);
      document.removeEventListener("visibilitychange", onVisibility);
      unlistenClose?.();
      flush();
    };
  }, []);
}
