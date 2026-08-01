import { useEffect, useRef, useState } from "react";
import { usePlayerStore } from "../../stores/player-store";
import { useSettingsStore } from "../../stores/settings-store";
import { cn } from "../../utils/cn";
import {
  fetchLrclib,
  resolveLyrics,
  saveLyrics,
  searchLrclib,
  setLyricsOffset,
} from "./api";
import { SyncedLyrics } from "./SyncedLyrics";
import type { LyricsPayload, LyricsSearchResult } from "./types";

type PanelMode = "read" | "find" | "edit";

function emptyPayload(trackId?: number | null): LyricsPayload {
  return {
    trackId: trackId && trackId > 0 ? trackId : null,
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
}

type LyricsPanelProps = {
  className?: string;
};

export function LyricsPanel({ className }: LyricsPanelProps) {
  const current = usePlayerStore((s) => s.current);
  const positionMs = usePlayerStore((s) => s.positionMs);
  const settings = useSettingsStore((s) => s.settings);
  const patchPrivacy = useSettingsStore((s) => s.patchPrivacy);
  const [lyrics, setLyrics] = useState<LyricsPayload | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [mode, setMode] = useState<PanelMode>("find");
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<LyricsSearchResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [followPlayback, setFollowPlayback] = useState(true);
  const autoOnlineKey = useRef<string | null>(null);

  const path = current?.path ?? null;
  const trackId = current?.trackId;
  const preferSynchronized = settings.lyrics.preferSynchronized;
  const requestKey =
    path == null ? null : `${path}::${trackId ?? ""}::${preferSynchronized}`;
  const loading = Boolean(requestKey && loadedKey !== requestKey) || busy;

  const globalOffset = settings.lyrics.globalOffsetMs;
  const activeLyrics = loadedKey === requestKey ? lyrics : null;
  const trackOffset = activeLyrics?.offsetMs ?? 0;
  const combinedOffset = globalOffset + trackOffset;

  const hasSynced = Boolean(activeLyrics?.lines?.length);
  const hasPlain = Boolean(activeLyrics?.plainText?.trim());
  const hasRawSynced = Boolean(activeLyrics?.syncedLrc?.trim());
  const hasLyrics = hasSynced || hasPlain || hasRawSynced;

  useEffect(() => {
    setFollowPlayback(true);
  }, [requestKey]);

  async function ensureOnlineAccess() {
    const privacy = useSettingsStore.getState().settings.privacy;
    if (privacy.allowNetwork && privacy.allowLyricsProviders) return;
    await patchPrivacy({
      allowNetwork: true,
      allowLyricsProviders: true,
    });
    setStatus("Online lyrics enabled (LRCLIB).");
  }

  function applyPayload(payload: LyricsPayload, note: string) {
    setLyrics(payload);
    setDraft(payload.syncedLrc || payload.plainText || "");
    if (requestKey) setLoadedKey(requestKey);
    setMode("read");
    setResults([]);
    setError(null);
    setStatus(note);
  }

  function applyPastedDraft() {
    const text = draft.trim();
    if (!text) {
      setError("Paste lyrics first.");
      return;
    }
    const looksSynced = text.includes("[") && text.includes("]");
    if (trackId && trackId > 0) {
      void saveLyrics({
        trackId,
        plainText: looksSynced ? null : text,
        syncedLrc: looksSynced ? text : null,
        offsetMs: trackOffset,
      })
        .then((payload) => applyPayload(payload, "Lyrics saved"))
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "Save failed");
        });
      return;
    }

    const base = emptyPayload(trackId);
    if (looksSynced) {
      applyPayload(
        {
          ...base,
          syncedLrc: text,
          plainText: text,
          source: "manual",
          providerId: "manual",
          attribution: "Pasted lyrics",
          userEdited: true,
          lines: [],
        },
        "Applied pasted lyrics for this session",
      );
    } else {
      applyPayload(
        {
          ...base,
          plainText: text,
          source: "manual",
          providerId: "manual",
          attribution: "Pasted lyrics",
          userEdited: true,
        },
        "Applied pasted lyrics for this session",
      );
    }
  }

  async function searchLrclibCatalog(fromUser = false) {
    if (!current || !path) return;
    const q =
      searchQuery.trim() ||
      [current.title, current.artist].filter(Boolean).join(" ").trim();
    if (!q) {
      setError("Type a song or artist to search.");
      setMode("find");
      return;
    }
    if (searchQuery.trim() !== q) setSearchQuery(q);

    setBusy(true);
    setError(null);
    setResults([]);
    setMode("find");
    try {
      await ensureOnlineAccess();
      const items = await searchLrclib({
        title: current.title || q,
        artist: current.artist ?? undefined,
        q,
      });
      setResults(items);
      if (items.length === 0) {
        setStatus(
          fromUser
            ? "No matches. Try different words, or paste lyrics."
            : "No LRCLIB matches for this track yet.",
        );
      } else {
        setStatus(`${items.length} matches — pick one`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "LRCLIB search failed");
    } finally {
      setBusy(false);
    }
  }

  function applyResult(result: LyricsSearchResult) {
    setBusy(true);
    void ensureOnlineAccess()
      .then(() =>
        fetchLrclib({
          trackId,
          query: {
            title: result.title,
            artist: result.artist,
            album: result.album,
          },
          resultId: result.id,
        }),
      )
      .then((payload) => {
        applyPayload(payload, `Applied “${result.title}”`);
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : "Failed to apply result",
        );
      })
      .finally(() => setBusy(false));
  }

  useEffect(() => {
    if (!current) return;
    setSearchQuery(
      [current.title, current.artist].filter(Boolean).join(" "),
    );
    setResults([]);
    setStatus(null);
    setError(null);
  }, [current?.path, current?.trackId, current?.title, current?.artist]);

  useEffect(() => {
    if (!path || !requestKey) return;

    let cancelled = false;

    void resolveLyrics({
      trackId,
      path,
      preferSynchronized,
    })
      .then((payload) => {
        if (cancelled) return;
        setLyrics(payload);
        setDraft(payload.syncedLrc || payload.plainText || "");
        setError(null);
        setLoadedKey(requestKey);

        const empty =
          !(payload.lines?.length) &&
          !payload.plainText?.trim() &&
          !payload.syncedLrc?.trim();
        setMode(empty ? "find" : "read");

        const privacy = useSettingsStore.getState().settings.privacy;
        const canAuto =
          privacy.allowNetwork && privacy.allowLyricsProviders;
        if (empty && canAuto && autoOnlineKey.current !== requestKey) {
          autoOnlineKey.current = requestKey;
          void searchLrclibCatalog(false);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load lyrics");
        setLoadedKey(requestKey);
        setMode("find");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, trackId, preferSynchronized, requestKey]);

  if (!current || !path) {
    return (
      <p className="inspector__empty">
        Nothing playing. Start a song to load lyrics.
      </p>
    );
  }

  return (
    <div className={cn("lyrics-panel", className)}>
      <header className="lyrics-panel__header">
        <p className="lyrics-panel__source">
          {loading
            ? "Looking for lyrics…"
            : hasLyrics && mode === "read"
              ? activeLyrics?.attribution || activeLyrics?.source
              : mode === "find"
                ? "Find lyrics"
                : mode === "edit"
                  ? "Paste or edit"
                  : "No lyrics yet"}
        </p>
        {error ? <p className="lyrics-panel__error">{error}</p> : null}
        {status && mode === "find" ? (
          <p className="lyrics-panel__status">{status}</p>
        ) : null}
      </header>

      <div className="lyrics-panel__body">
        {mode === "find" ? (
          <div className="lyrics-finder">
            <form
              className="lyrics-search"
              onSubmit={(event) => {
                event.preventDefault();
                void searchLrclibCatalog(true);
              }}
            >
              <label className="lyrics-search__field">
                <span className="sr-only">Search lyrics</span>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Song, artist, or album…"
                  autoComplete="off"
                />
              </label>
              <div className="lyrics-search__row">
                <button
                  type="submit"
                  className="button-primary"
                  disabled={busy || !searchQuery.trim()}
                >
                  {busy ? "Searching…" : "Search"}
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setMode("edit");
                    setDraft("");
                    setStatus(null);
                  }}
                >
                  Paste instead
                </button>
                {hasLyrics ? (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      setMode("read");
                      setResults([]);
                      setStatus(null);
                    }}
                  >
                    Back
                  </button>
                ) : null}
              </div>
            </form>

            {results.length > 0 ? (
              <ul className="lyrics-results" aria-label="Search results">
                {results.map((result) => (
                  <li key={result.id}>
                    <button
                      type="button"
                      className="lyrics-results__item"
                      disabled={busy}
                      onClick={() => applyResult(result)}
                    >
                      <span className="lyrics-results__meta">
                        <strong>{result.title}</strong>
                        <span className="muted">
                          {[result.artist, result.album]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                      <span className="lyrics-results__kind muted">
                        {result.synced ? "Synced" : "Plain"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {!busy && results.length === 0 && status ? (
              <p className="lyrics-finder__empty muted">{status}</p>
            ) : null}
          </div>
        ) : null}

        {mode === "edit" ? (
          <div className="lyrics-editor-wrap">
            <textarea
              className="lyrics-editor"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={14}
              aria-label="Edit lyrics"
              placeholder="Paste plain lyrics or synced LRC here…"
            />
            <div className="lyrics-search__row">
              <button
                type="button"
                className="button-primary"
                disabled={!draft.trim()}
                onClick={() => applyPastedDraft()}
              >
                {trackId && trackId > 0 ? "Save" : "Apply"}
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => setMode(hasLyrics ? "read" : "find")}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {mode === "read" && hasSynced ? (
          <>
            <div className="lyrics-follow-bar">
              <button
                type="button"
                className={cn(
                  "text-button lyrics-follow-bar__toggle",
                  !followPlayback && "lyrics-follow-bar__toggle--paused",
                )}
                aria-pressed={!followPlayback}
                onClick={() => setFollowPlayback((v) => !v)}
              >
                {followPlayback ? "Pause follow" : "Follow song"}
              </button>
              <span className="lyrics-follow-bar__hint muted">
                {followPlayback
                  ? "Scrolling with the song"
                  : "Scroll freely — good for covers with off timing"}
              </span>
            </div>
            <SyncedLyrics
              lines={activeLyrics?.lines ?? []}
              positionMs={positionMs}
              offsetMs={combinedOffset}
              fontSize={settings.lyrics.fontSize}
              alignment={settings.lyrics.alignment}
              followPlayback={followPlayback}
            />
          </>
        ) : null}

        {mode === "read" && !hasSynced && hasPlain ? (
          <pre
            className={`plain-lyrics plain-lyrics--${settings.lyrics.alignment}`}
            style={{ fontSize: `${settings.lyrics.fontSize}px` }}
          >
            {activeLyrics?.plainText}
          </pre>
        ) : null}

        {mode === "read" && !hasSynced && !hasPlain && hasRawSynced ? (
          <pre
            className={`plain-lyrics plain-lyrics--${settings.lyrics.alignment}`}
            style={{ fontSize: `${settings.lyrics.fontSize}px` }}
          >
            {activeLyrics?.syncedLrc}
          </pre>
        ) : null}
      </div>

      {mode === "read" ? (
        <footer className="lyrics-panel__footer">
          {hasSynced ? (
            <label className="settings-field lyrics-panel__offset">
              <span>Track offset {trackOffset}ms</span>
              <input
                type="range"
                min={-5000}
                max={5000}
                step={50}
                value={trackOffset}
                disabled={!trackId || trackId <= 0}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (!trackId || trackId <= 0) return;
                  void setLyricsOffset(trackId, next)
                    .then((payload) => {
                      setLyrics(payload);
                      setStatus(`Offset set to ${next}ms`);
                    })
                    .catch((err: unknown) => {
                      setError(
                        err instanceof Error ? err.message : "Offset failed",
                      );
                    });
                }}
              />
            </label>
          ) : null}
          <div className="lyrics-panel__actions">
            <button
              type="button"
              className="text-button"
              disabled={busy}
              onClick={() => {
                setMode("find");
                setStatus(null);
                setSearchQuery(
                  [current.title, current.artist].filter(Boolean).join(" "),
                );
              }}
            >
              Find lyrics
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setMode("edit");
                setDraft(
                  activeLyrics?.syncedLrc || activeLyrics?.plainText || "",
                );
                setStatus(null);
              }}
            >
              Paste / Edit
            </button>
          </div>
        </footer>
      ) : null}
    </div>
  );
}
