import { useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { playTracks } from "../player/api";
import { formatDuration } from "./api";
import { ArtworkImage } from "./ArtworkImage";
import { TrackContextMenu } from "./TrackContextMenu";
import type { TrackSummary } from "./types";
import { useLibraryStore } from "../../stores/library-store";
import { usePlayerStore } from "../../stores/player-store";
import { useSettingsStore } from "../../stores/settings-store";
import { cn } from "../../utils/cn";

function trackTitle(track: TrackSummary): string {
  return track.title?.trim() || "Unknown title";
}

function trackArtist(track: TrackSummary): string {
  return track.artist?.trim() || "Unknown artist";
}

function trackCopyLine(track: TrackSummary): string {
  return `${trackTitle(track)} – ${trackArtist(track)}`;
}

function compactDuration(ms?: number | null): string {
  const raw = formatDuration(ms);
  if (raw === "—:—") return raw;
  const [minutes = "0", seconds = "00"] = raw.split(":");
  return `${minutes.padStart(2, "0")}:${seconds}`;
}

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback for restricted clipboard contexts
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    document.body.removeChild(area);
  }
}

function clearTextSelection(): void {
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    selection.removeAllRanges();
  }
}

type CopyMenuState = {
  track: TrackSummary;
  x: number;
  y: number;
};

export function TrackList() {
  const tracks = useLibraryStore((s) => s.tracks);
  const trackTotal = useLibraryStore((s) => s.trackTotal);
  const loading = useLibraryStore((s) => s.loading);
  const loadMoreTracks = useLibraryStore((s) => s.loadMoreTracks);
  const currentId = usePlayerStore((s) => s.current?.trackId);
  const applySnapshot = usePlayerStore((s) => s.applySnapshot);
  const density = useSettingsStore((s) => s.settings.appearance.density);
  const compact = density === "compact";
  const rowSize = compact ? 24 : density === "spacious" ? 84 : 68;
  const parentRef = useRef<HTMLDivElement>(null);
  const scrolledToPlayingRef = useRef(false);
  const [copyMenu, setCopyMenu] = useState<CopyMenuState | null>(null);
  const [textSelectMode, setTextSelectMode] = useState(false);

  const virtualizer = useVirtualizer({
    count: tracks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowSize,
    overscan: compact ? 28 : 12,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const lastIndex = virtualItems[virtualItems.length - 1]?.index ?? -1;

  useEffect(() => {
    if (lastIndex >= tracks.length - 8 && tracks.length < trackTotal) {
      void loadMoreTracks();
    }
  }, [lastIndex, tracks.length, trackTotal, loadMoreTracks]);

  // Jump to the playing song when opening Library → Songs (paginated load if needed).
  useEffect(() => {
    if (!currentId || currentId <= 0 || scrolledToPlayingRef.current) return;

    const index = tracks.findIndex((track) => track.id === currentId);
    if (index >= 0) {
      scrolledToPlayingRef.current = true;
      const id = requestAnimationFrame(() => {
        virtualizer.scrollToIndex(index, { align: "center", behavior: "auto" });
      });
      return () => cancelAnimationFrame(id);
    }

    if (!loading && tracks.length < trackTotal) {
      void loadMoreTracks();
    }
  }, [currentId, tracks, trackTotal, loading, loadMoreTracks, virtualizer]);

  useEffect(() => {
    if (!copyMenu) return;
    function close() {
      setCopyMenu(null);
    }
    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest(".track-copy-menu, .modal-scrim")
      ) {
        return;
      }
      close();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [copyMenu]);

  useEffect(() => {
    virtualizer.measure();
  }, [rowSize, virtualizer]);

  useEffect(() => {
    function onKeyUp(event: KeyboardEvent) {
      if (event.key === "Alt") setTextSelectMode(false);
    }
    function onBlur() {
      setTextSelectMode(false);
    }
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  if (tracks.length === 0 && !loading) {
    return (
      <p className="empty-panel__detail">
        No songs yet. Drop a folder or choose Add music to begin.
        Songs stay on your computer — Atrium only finds them.
      </p>
    );
  }

  return (
    <div
      className={cn("track-list", textSelectMode && "track-list--text-select")}
      ref={parentRef}
    >
      <div
        className="track-list__inner"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualItems.map((item) => {
          const track = tracks[item.index];
          if (!track) return null;
          const active = track.id === currentId;
          return (
            <div
              key={track.id}
              data-track-id={track.id}
              className={cn(
                "track-row",
                compact && "track-row--compact",
                active && "track-row--active",
              )}
              role="button"
              tabIndex={0}
              aria-current={active ? "true" : undefined}
              aria-label={`Play ${trackTitle(track)}. Right-click for queue, like, and playlists.`}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${item.size}px`,
                transform: `translateY(${item.start}px)`,
              }}
              onMouseDown={(event) => {
                // Alt+drag = intentional text select/copy; otherwise keep rows unselectable.
                setTextSelectMode(event.altKey);
                if (!event.altKey) {
                  // Avoid sticky leftover highlights from a prior Alt select.
                  clearTextSelection();
                }
              }}
              onDoubleClick={() => {
                clearTextSelection();
                void playTracks(
                  tracks.map((t) => t.id),
                  item.index,
                ).then(applySnapshot);
              }}
              onContextMenu={(event) => {
                event.preventDefault();
                setCopyMenu({
                  track,
                  x: event.clientX,
                  y: event.clientY,
                });
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  clearTextSelection();
                  void playTracks(
                    tracks.map((t) => t.id),
                    item.index,
                  ).then(applySnapshot);
                  return;
                }
                if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
                  event.preventDefault();
                  void copyText(trackCopyLine(track));
                }
              }}
            >
              {compact ? (
                <>
                  <div className="track-row__meta track-row__meta--inline">
                    <span className="track-row__artist">{trackArtist(track)}</span>
                    <span className="track-row__title">{trackTitle(track)}</span>
                  </div>
                  <span className="track-row__duration">
                    {compactDuration(track.durationMs)}
                  </span>
                </>
              ) : (
                <>
                  <ArtworkImage
                    className="track-row__art"
                    cacheKey={track.artworkCacheKey}
                    alt=""
                  />
                  <div className="track-row__meta">
                    <span className="track-row__title">{trackTitle(track)}</span>
                    <span className="track-row__sub">
                      {trackArtist(track)}
                      {track.album ? ` · ${track.album}` : ""}
                    </span>
                  </div>
                  <span className="track-row__duration">
                    {formatDuration(track.durationMs)}
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>
      {loading ? <p className="list-status">Loading…</p> : null}

      {copyMenu ? (
        <TrackContextMenu
          track={copyMenu.track}
          x={copyMenu.x}
          y={copyMenu.y}
          onClose={() => setCopyMenu(null)}
        />
      ) : null}
    </div>
  );
}
