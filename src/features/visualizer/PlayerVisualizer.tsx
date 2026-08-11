import { useEffect, useRef } from "react";
import { usePlayerStore } from "../../stores/player-store";
import { useSettingsStore } from "../../stores/settings-store";
import { cn } from "../../utils/cn";
import { getVisualizerPreset } from "./catalog";
import { drawVisualizer } from "./draw";
import {
  getSpectrumFrame,
  subscribeSpectrum,
  type SpectrumFrame,
} from "./spectrum-bus";

type PlayerVisualizerProps = {
  reducedMotion: boolean;
  className?: string;
};

function readAccent(): string {
  if (typeof document === "undefined") return "#2f8f7b";
  return (
    getComputedStyle(document.documentElement)
      .getPropertyValue("--color-accent")
      .trim() || "#2f8f7b"
  );
}

function cloneFrame(frame: SpectrumFrame): SpectrumFrame {
  return {
    bands: frame.bands.slice(),
    bass: frame.bass,
    beat: frame.beat,
    energy: frame.energy,
  };
}

export function PlayerVisualizer({
  reducedMotion,
  className,
}: PlayerVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const peaksRef = useRef(new Float32Array(64));
  const frozenRef = useRef<SpectrumFrame | null>(null);
  const statusRef = useRef(usePlayerStore.getState().status);
  const enabled = useSettingsStore((s) => s.settings.appearance.visualizerEnabled);
  const styleId = useSettingsStore((s) => s.settings.appearance.visualizerStyle);
  const status = usePlayerStore((s) => s.status);
  const preset = getVisualizerPreset(styleId === "off" ? "classic-blocks" : styleId);

  statusRef.current = status;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !enabled) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let alive = true;
    let lastDraw = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, parent.clientWidth);
      const h = Math.max(1, parent.clientHeight);
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const tick = (now: number) => {
      if (!alive) return;
      raf = requestAnimationFrame(tick);
      if (now - lastDraw < (reducedMotion ? 48 : 16)) return;
      lastDraw = now;

      const parent = canvas.parentElement;
      const width = parent?.clientWidth ?? canvas.clientWidth;
      const height = parent?.clientHeight ?? canvas.clientHeight;
      if (width < 2 || height < 2) return;

      if (peaksRef.current.length < preset.barCount) {
        peaksRef.current = new Float32Array(preset.barCount);
      }

      const live = getSpectrumFrame();
      const currentStatus = statusRef.current;
      let frame = live;

      if (currentStatus === "playing") {
        frozenRef.current = cloneFrame(live);
        frame = live;
      } else if (currentStatus === "paused" && frozenRef.current) {
        frame = frozenRef.current;
      } else if (currentStatus === "stopped") {
        frozenRef.current = null;
        frame = live;
      }

      drawVisualizer({
        ctx,
        width,
        height,
        preset,
        frame,
        accent: readAccent(),
        peaks: peaksRef.current,
      });
    };

    const unsub = subscribeSpectrum(() => {});
    raf = requestAnimationFrame(tick);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      unsub();
      ro.disconnect();
    };
  }, [preset, reducedMotion, enabled]);

  if (!enabled) return null;

  return (
    <div
      className={cn("player-visualizer", className)}
      aria-hidden="true"
      title="Soundbars"
    >
      <canvas ref={canvasRef} className="player-visualizer__canvas" />
    </div>
  );
}
