import { useEffect, useRef, useState } from "react";
import { ArtworkImage } from "../library/ArtworkImage";
import { LyricsPanel } from "../lyrics/LyricsPanel";
import {
  playerNext,
  playerPrevious,
  playerToggle,
} from "./api";
import { formatPlaybackTime } from "./format";
import { SeekSlider } from "./SeekSlider";
import { usePlayerStore } from "../../stores/player-store";
import { useShellStore } from "../../stores/shell-store";
import { cn } from "../../utils/cn";

export function NowPlayingOverlay() {
  const open = useShellStore((s) => s.nowPlayingOpen);
  const setOpen = useShellStore((s) => s.setNowPlayingOpen);
  const openDrawer = useShellStore((s) => s.openDrawer);
  const current = usePlayerStore((s) => s.current);
  const status = usePlayerStore((s) => s.status);
  const positionMs = usePlayerStore((s) => s.positionMs);
  const durationMs = usePlayerStore((s) => s.durationMs);
  const applySnapshot = usePlayerStore((s) => s.applySnapshot);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const lyricsRef = useRef<HTMLDivElement | null>(null);

  const playing = status === "playing";
  const scrubMax = Math.max(durationMs, positionMs, 1);
  const progress =
    durationMs > 0
      ? Math.min(100, (positionMs / durationMs) * 100)
      : Math.min(100, (positionMs / scrubMax) * 100);

  useEffect(() => {
    if (!open) {
      setLyricsOpen(false);
      return;
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  useEffect(() => {
    if (!lyricsOpen) return;
    lyricsRef.current?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [lyricsOpen]);

  if (!open) return null;

  return (
    <div
      className={cn("now-playing", lyricsOpen && "now-playing--lyrics")}
      role="dialog"
      aria-label="Now playing"
    >
      <button
        type="button"
        className="now-playing__close"
        aria-label="Close now playing"
        onClick={() => setOpen(false)}
      >
        Close
      </button>
      <div className="now-playing__content">
        <div className="now-playing__stage">
          <ArtworkImage
            className="now-playing__art"
            cacheKey={current?.artworkCacheKey}
            alt=""
          />
          <div className="now-playing__meta">
            <h2>{current?.title || "Nothing playing"}</h2>
            <p>{current?.artist || "—"}</p>
            <p className="muted">{current?.album || ""}</p>
            <div className="now-playing__scrub">
              <SeekSlider
                max={scrubMax}
                positionMs={positionMs}
                progress={progress}
                disabled={!current}
              />
              <span className="now-playing__times">
                {formatPlaybackTime(positionMs)}
                <span>
                  {durationMs > 0 ? formatPlaybackTime(durationMs) : "…"}
                </span>
              </span>
            </div>
            <div className="now-playing__transport">
              <button
                type="button"
                className="icon-button"
                aria-label="Previous"
                disabled={!current}
                onClick={() => {
                  void playerPrevious().then(applySnapshot);
                }}
              >
                ‹
              </button>
              <button
                type="button"
                className="play-button"
                aria-label={playing ? "Pause" : "Play"}
                disabled={!current}
                onClick={() => {
                  void playerToggle().then(applySnapshot);
                }}
              >
                {playing ? "❚❚" : "▶"}
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label="Next"
                disabled={!current}
                onClick={() => {
                  void playerNext().then(applySnapshot);
                }}
              >
                ›
              </button>
            </div>
            <div className="now-playing__actions">
              <button
                type="button"
                className="text-button"
                aria-expanded={lyricsOpen}
                aria-controls="now-playing-lyrics"
                onClick={() => setLyricsOpen((v) => !v)}
              >
                {lyricsOpen ? "Hide lyrics" : "Show lyrics"}
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setOpen(false);
                  openDrawer("queue");
                }}
              >
                Queue
              </button>
            </div>
          </div>
        </div>

        {lyricsOpen ? (
          <section
            id="now-playing-lyrics"
            ref={lyricsRef}
            className="now-playing__lyrics"
            aria-label="Lyrics"
          >
            <LyricsPanel className="lyrics-panel--stage" />
          </section>
        ) : null}
      </div>
    </div>
  );
}
