import { useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { playTracks } from "../player/api";
import { formatDuration } from "./api";
import { ArtworkImage } from "./ArtworkImage";
import { useLibraryStore } from "../../stores/library-store";
import { usePlayerStore } from "../../stores/player-store";
import { cn } from "../../utils/cn";

export function TrackList() {
  const tracks = useLibraryStore((s) => s.tracks);
  const trackTotal = useLibraryStore((s) => s.trackTotal);
  const loading = useLibraryStore((s) => s.loading);
  const loadMoreTracks = useLibraryStore((s) => s.loadMoreTracks);
  const currentId = usePlayerStore((s) => s.current?.trackId);
  const applySnapshot = usePlayerStore((s) => s.applySnapshot);
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: tracks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 12,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const lastIndex = virtualItems[virtualItems.length - 1]?.index ?? -1;

  useEffect(() => {
    if (lastIndex >= tracks.length - 8 && tracks.length < trackTotal) {
      void loadMoreTracks();
    }
  }, [lastIndex, tracks.length, trackTotal, loadMoreTracks]);

  if (tracks.length === 0 && !loading) {
    return (
      <p className="empty-panel__detail">
        No songs yet. Drop a folder or choose Import folder to begin.
      </p>
    );
  }

  return (
    <div className="track-list" ref={parentRef}>
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
              className={cn("track-row", active && "track-row--active")}
              role="button"
              tabIndex={0}
              aria-label={`Play ${track.title || "track"}`}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${item.size}px`,
                transform: `translateY(${item.start}px)`,
              }}
              onDoubleClick={() => {
                void playTracks(
                  tracks.map((t) => t.id),
                  item.index,
                ).then(applySnapshot);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void playTracks(
                    tracks.map((t) => t.id),
                    item.index,
                  ).then(applySnapshot);
                }
              }}
            >
              <ArtworkImage
                className="track-row__art"
                cacheKey={track.artworkCacheKey}
                alt=""
              />
              <div className="track-row__meta">
                <span className="track-row__title">
                  {track.title || "Unknown title"}
                </span>
                <span className="track-row__sub">
                  {track.artist || "Unknown artist"}
                  {track.album ? ` · ${track.album}` : ""}
                </span>
              </div>
              <span className="track-row__duration">
                {formatDuration(track.durationMs)}
              </span>
            </div>
          );
        })}
      </div>
      {loading ? <p className="list-status">Loading…</p> : null}
    </div>
  );
}
