import { useEffect, useRef, useState } from "react";
import { usePlayerStore } from "../../stores/player-store";
import { playerSeek } from "./api";

/**
 * Fixed step count for <input type="range">.
 * Binding max to raw duration ms (millions of steps on long tracks)
 * makes WebView range thumbs jitter like a live video.
 */
const SLIDER_STEPS = 10_000;

type SeekSliderProps = {
  className?: string;
  /** Track duration in ms (or position+buffer when duration unknown). */
  max: number;
  positionMs: number;
  progress: number;
  disabled?: boolean;
};

function msToStep(ms: number, durationMs: number): number {
  if (durationMs <= 0) return 0;
  return Math.round(
    Math.min(1, Math.max(0, ms / durationMs)) * SLIDER_STEPS,
  );
}

function stepToMs(step: number, durationMs: number): number {
  if (durationMs <= 0) return 0;
  return Math.round((step / SLIDER_STEPS) * durationMs);
}

export function SeekSlider({
  className,
  max,
  positionMs,
  progress,
  disabled,
}: SeekSliderProps) {
  const applySnapshot = usePlayerStore((s) => s.applySnapshot);
  const [dragging, setDragging] = useState(false);
  const [draftStep, setDraftStep] = useState(0);
  const lastSentAt = useRef(0);
  const durationMs = Math.max(0, max);

  useEffect(() => {
    if (dragging) return;
    setDraftStep(msToStep(positionMs, durationMs));
  }, [dragging, positionMs, durationMs]);

  const value = dragging ? draftStep : msToStep(positionMs, durationMs);
  const fillPct = dragging
    ? (draftStep / SLIDER_STEPS) * 100
    : Math.min(100, Math.max(0, progress));
  // Integer percent avoids sub-pixel gradient shimmer on long tracks
  const scrubCss = `${Math.round(fillPct)}%`;

  const commitSeek = (step: number) => {
    void playerSeek(stepToMs(step, durationMs)).then(applySnapshot);
  };

  return (
    <div className={className}>
      <input
        type="range"
        min={0}
        max={SLIDER_STEPS}
        step={1}
        value={value}
        disabled={disabled || durationMs <= 0}
        aria-label="Seek"
        aria-valuetext={`${Math.round(fillPct)}%`}
        style={{ ["--scrub-progress" as string]: scrubCss }}
        onPointerDown={() => setDragging(true)}
        onPointerUp={(e) => {
          const step = Number((e.target as HTMLInputElement).value);
          setDraftStep(step);
          commitSeek(step);
          setDragging(false);
        }}
        onPointerCancel={() => setDragging(false)}
        onChange={(e) => {
          const step = Number(e.target.value);
          setDraftStep(step);
          const now = performance.now();
          if (now - lastSentAt.current < 80) return;
          lastSentAt.current = now;
          commitSeek(step);
        }}
      />
    </div>
  );
}
