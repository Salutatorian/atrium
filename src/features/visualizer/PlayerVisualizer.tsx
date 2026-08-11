import { useEffect, useRef } from "react";
import { usePlayerStore } from "../../stores/player-store";
import { useSettingsStore } from "../../stores/settings-store";
import { cn } from "../../utils/cn";
import { getVisualizerPreset } from "./catalog";
import { drawVisualizer } from "./draw";
import { getSpectrumFrame, subscribeSpectrum } from "./spectrum-bus";

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

export function PlayerVisualizer({
  reducedMotion,
  className,
}: PlayerVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const peaksRef = useRef(new Float32Array(64));
  const styleId = useSettingsStore((s) => s.settings.appearance.visualizerStyle);
  const barStyle = useSettingsStore((s) => s.settings.appearance.playerBarStyle);
  const status = usePlayerStore((s) => s.status);
  const preset = getVisualizerPreset(styleId);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || preset.id === "off") return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let alive = true;
    let lastDraw = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = parent.clientWidth;
      const h = parent.clientHeight;
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
      // Cap draw rate; spectrum already ~55 Hz
      if (now - lastDraw >= (reducedMotion ? 48 : 16)) {
        lastDraw = now;
        const parent = canvas.parentElement;
        const width = parent?.clientWidth ?? canvas.clientWidth;
        const height = parent?.clientHeight ?? canvas.clientHeight;
        if (peaksRef.current.length < preset.barCount) {
          peaksRef.current = new Float32Array(preset.barCount);
        }
        drawVisualizer({
          ctx,
          width,
          height,
          preset,
          frame: getSpectrumFrame(),
          accent: readAccent(),
          peaks: peaksRef.current,
        });
      }
      raf = requestAnimationFrame(tick);
    };

    const unsub = subscribeSpectrum(() => {
      // Wake immediately on new audio frame
      if (!raf) raf = requestAnimationFrame(tick);
    });

    raf = requestAnimationFrame(tick);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      unsub();
      ro.disconnect();
    };
  }, [preset, reducedMotion, status]);

  if (preset.id === "off") return null;

  return (
    <div
      className={cn(
        "player-visualizer",
        barStyle === "full-width" && "player-visualizer--full-width",
        className,
      )}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="player-visualizer__canvas" />
    </div>
  );
}
