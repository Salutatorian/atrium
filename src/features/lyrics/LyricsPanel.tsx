import { useEffect, useState } from "react";
import { usePlayerStore } from "../../stores/player-store";
import { useSettingsStore } from "../../stores/settings-store";
import {
  fetchLrclib,
  resolveLyrics,
  saveLyrics,
  searchLrclib,
  setLyricsOffset,
} from "./api";
import { SyncedLyrics } from "./SyncedLyrics";
import type { LyricsPayload, LyricsSearchResult } from "./types";

export function LyricsPanel() {
  const current = usePlayerStore((s) => s.current);
  const positionMs = usePlayerStore((s) => s.positionMs);
  const settings = useSettingsStore((s) => s.settings);
  const [lyrics, setLyrics] = useState<LyricsPayload | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<LyricsSearchResult[]>([]);
  const [busy, setBusy] = useState(false);

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
  const networkEnabled =
    settings.privacy.allowNetwork && settings.privacy.allowLyricsProviders;

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
        setEditing(false);
        setError(null);
        setResults([]);
        setLoadedKey(requestKey);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load lyrics");
        setLoadedKey(requestKey);
      });

    return () => {
      cancelled = true;
    };
  }, [path, trackId, preferSynchronized, requestKey]);

  if (!current || !path) {
    return (
      <p className="inspector__empty">
        Nothing playing. Start a song to load lyrics.
      </p>
    );
  }

  const hasSynced = Boolean(activeLyrics?.lines?.length);
  const hasPlain = Boolean(activeLyrics?.plainText?.trim());

  return (
    <div className="lyrics-panel">
      <div className="lyrics-panel__meta">
        <p className="lyrics-panel__source">
          {loading
            ? "Looking for lyrics…"
            : hasSynced || hasPlain
              ? activeLyrics?.attribution || activeLyrics?.source
              : "No lyrics found locally"}
        </p>
        {activeLyrics?.sourceUrl ? (
          <p className="lyrics-panel__attr muted">{activeLyrics.sourceUrl}</p>
        ) : null}
      </div>

      {error ? <p className="lyrics-panel__error">{error}</p> : null}
      {status ? <p className="lyrics-panel__status">{status}</p> : null}

      {!editing && hasSynced ? (
        <SyncedLyrics
          lines={activeLyrics?.lines ?? []}
          positionMs={positionMs}
          offsetMs={combinedOffset}
          fontSize={settings.lyrics.fontSize}
          alignment={settings.lyrics.alignment}
        />
      ) : null}

      {!editing && !hasSynced && hasPlain ? (
        <pre
          className={`plain-lyrics plain-lyrics--${settings.lyrics.alignment}`}
          style={{ fontSize: `${settings.lyrics.fontSize}px` }}
        >
          {activeLyrics?.plainText}
        </pre>
      ) : null}

      {editing ? (
        <textarea
          className="lyrics-editor"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={14}
          aria-label="Edit lyrics"
        />
      ) : null}

      <div className="lyrics-panel__controls">
        <label className="settings-field">
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

        <div className="lyrics-panel__actions">
          <button
            type="button"
            onClick={() => {
              setEditing((value) => !value);
              if (!editing) {
                setDraft(
                  activeLyrics?.syncedLrc || activeLyrics?.plainText || "",
                );
              }
            }}
          >
            {editing ? "Cancel edit" : "Edit"}
          </button>
          {editing ? (
            <button
              type="button"
              className="button-primary"
              disabled={!trackId || trackId <= 0}
              onClick={() => {
                if (!trackId || trackId <= 0) return;
                const looksSynced = draft.includes("[") && draft.includes("]");
                void saveLyrics({
                  trackId,
                  plainText: looksSynced ? null : draft,
                  syncedLrc: looksSynced ? draft : null,
                  offsetMs: trackOffset,
                })
                  .then((payload) => {
                    setLyrics(payload);
                    setEditing(false);
                    setStatus("Lyrics saved");
                    setError(null);
                  })
                  .catch((err: unknown) => {
                    setError(
                      err instanceof Error ? err.message : "Save failed",
                    );
                  });
              }}
            >
              Save
            </button>
          ) : null}
          <button
            type="button"
            disabled={!networkEnabled || busy}
            title={
              networkEnabled
                ? "Fetch from LRCLIB"
                : "Enable Network + Lyrics providers in Settings"
            }
            onClick={() => {
              setBusy(true);
              setError(null);
              const query = {
                title: current.title || "Unknown",
                artist: current.artist ?? undefined,
                album: current.album ?? undefined,
                durationMs: current.durationMs ?? undefined,
              };
              void fetchLrclib({
                trackId,
                query,
              })
                .then((payload) => {
                  setLyrics(payload);
                  setDraft(payload.syncedLrc || payload.plainText || "");
                  if (requestKey) setLoadedKey(requestKey);
                  setStatus("Fetched from LRCLIB");
                })
                .catch((err: unknown) => {
                  setError(
                    err instanceof Error ? err.message : "LRCLIB fetch failed",
                  );
                })
                .finally(() => setBusy(false));
            }}
          >
            Fetch LRCLIB
          </button>
          <button
            type="button"
            disabled={!networkEnabled || busy}
            onClick={() => {
              setBusy(true);
              setError(null);
              void searchLrclib({
                title: current.title || "Unknown",
                artist: current.artist ?? undefined,
                album: current.album ?? undefined,
                durationMs: current.durationMs ?? undefined,
              })
                .then((items) => {
                  setResults(items);
                  setStatus(
                    items.length
                      ? `${items.length} LRCLIB results`
                      : "No LRCLIB results",
                  );
                })
                .catch((err: unknown) => {
                  setError(
                    err instanceof Error ? err.message : "LRCLIB search failed",
                  );
                })
                .finally(() => setBusy(false));
            }}
          >
            Search LRCLIB
          </button>
        </div>
      </div>

      {results.length > 0 ? (
        <ul className="lyrics-results">
          {results.map((result) => (
            <li key={result.id}>
              <button
                type="button"
                className="lyrics-results__item"
                onClick={() => {
                  setBusy(true);
                  void fetchLrclib({
                    trackId,
                    query: {
                      title: result.title,
                      artist: result.artist,
                    },
                    resultId: result.id,
                  })
                    .then((payload) => {
                      setLyrics(payload);
                      setDraft(payload.syncedLrc || payload.plainText || "");
                      if (requestKey) setLoadedKey(requestKey);
                      setResults([]);
                      setStatus(`Applied “${result.title}” from LRCLIB`);
                    })
                    .catch((err: unknown) => {
                      setError(
                        err instanceof Error
                          ? err.message
                          : "Failed to apply result",
                      );
                    })
                    .finally(() => setBusy(false));
                }}
              >
                <span>
                  {result.title}
                  {result.artist ? ` — ${result.artist}` : ""}
                </span>
                <span className="muted">
                  {result.synced ? "Synced" : "Plain"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
