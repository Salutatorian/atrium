import { useEffect, useRef } from "react";
import { usePlayerStore } from "../../stores/player-store";
import { useSettingsStore } from "../../stores/settings-store";
import { cn } from "../../utils/cn";
import { getVisualizerPreset } from "./catalog";
import { drawVisualizer } from "./draw";
import { getSpectrumFrame, type SpectrumFrame } from "./spectrum-bus";
import { getStageScene } from "./stage-catalog";
import { createStageState, drawStage } from "./stage-draw";

export type VisualizerCanvasVariant = "player" | "stage";

type VisualizerCanvasProps = {
  reducedMotion: boolean;
  variant: VisualizerCanvasVariant;
  className?: string;
  canvasClassName?: string;
};

function readAccent(): string {
  if (typeof document === "undefined") return "#2f8f7b";
  return (
    getComputedStyle(document.documentElement)
      .getPropertyValue("--color-accent")
      .trim() || "#2f8f7b"
  );
}

function copyFrame(target: SpectrumFrame, source: SpectrumFrame): void {
  if (target.bands.length !== source.bands.length) {
    target.bands = source.bands.slice();
  } else {
    for (let i = 0; i < source.bands.length; i++) {
      target.bands[i] = source.bands[i] ?? 0;
    }
  }
  target.bass = source.bass;
  target.beat = source.beat;
  target.energy = source.energy;
}

export function VisualizerCanvas({
  reducedMotion,
  variant,
  className,
  canvasClassName,
}: VisualizerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const peaksRef = useRef(new Float32Array(64));
  const frozenRef = useRef<SpectrumFrame>({
    bands: [],
    bass: 0,
    beat: 0,
    energy: 0,
  });
  const hasFrozenRef = useRef(false);
  const stageStateRef = useRef(createStageState());
  const soundbarsOn = useSettingsStore((s) => s.settings.appearance.visualizerEnabled);
  const styleId = useSettingsStore((s) => s.settings.appearance.visualizerStyle);
  const sceneId = useSettingsStore((s) => s.settings.appearance.visualizerScene);
  const playerPreset = getVisualizerPreset(
    styleId === "off" ? "classic-blocks" : styleId,
  );
  const stageScene = getStageScene(sceneId).id;

  const enabled = variant === "stage" || soundbarsOn;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !enabled) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let alive = true;
    let lastDraw = 0;
    const dprCap = variant === "stage" ? 1.5 : 2;
    if (variant === "stage") {
      stageStateRef.current = createStageState();
    }

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
      const w = Math.max(1, parent.clientWidth);
      const h = Math.max(1, parent.clientHeight);
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (variant === "stage") {
        ctx.fillStyle = "#05070a";
        ctx.fillRect(0, 0, w, h);
      }
    };

    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const tick = (now: number) => {
      if (!alive) return;
      if (document.visibilityState === "hidden") return;
      raf = requestAnimationFrame(tick);
      const minFrame = reducedMotion ? 48 : variant === "stage" ? 22 : 16;
      if (now - lastDraw < minFrame) return;
      lastDraw = now;

      const parent = canvas.parentElement;
      const width = parent?.clientWidth ?? canvas.clientWidth;
      const height = parent?.clientHeight ?? canvas.clientHeight;
      if (width < 2 || height < 2) return;

      const live = getSpectrumFrame();
      const currentStatus = usePlayerStore.getState().status;
      let frame: SpectrumFrame;

      if (currentStatus === "playing") {
        copyFrame(frozenRef.current, live);
        hasFrozenRef.current = true;
        frame = live;
      } else if (currentStatus === "paused" && hasFrozenRef.current) {
        frame = frozenRef.current;
      } else {
        hasFrozenRef.current = false;
        frame = live;
      }

      if (variant === "stage") {
        drawStage({
          ctx,
          width,
          height,
          scene: stageScene,
          frame,
          accent: readAccent(),
          now,
          reducedMotion,
          state: stageStateRef.current,
        });
        return;
      }

      if (peaksRef.current.length < playerPreset.barCount) {
        peaksRef.current = new Float32Array(playerPreset.barCount);
      }

      drawVisualizer({
        ctx,
        width,
        height,
        preset: playerPreset,
        frame,
        accent: readAccent(),
        peaks: peaksRef.current,
      });
    };

    const onVisibility = () => {
      if (!alive) return;
      if (document.visibilityState === "visible") {
        lastDraw = 0;
        raf = requestAnimationFrame(tick);
      } else {
        cancelAnimationFrame(raf);
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    raf = requestAnimationFrame(tick);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      ro.disconnect();
    };
  }, [playerPreset, stageScene, reducedMotion, enabled, variant]);

  if (!enabled && variant === "player") {
    return (
      <div className={cn("player-visualizer player-visualizer--off", className)} />
    );
  }

  if (!enabled) return null;

  return (
    <div className={cn(variant === "player" ? "player-visualizer" : "visualizer-stage__canvas-wrap", className)}>
      <canvas
        ref={canvasRef}
        className={cn(
          variant === "player"
            ? "player-visualizer__canvas"
            : "visualizer-stage__canvas",
          canvasClassName,
        )}
      />
    </div>
  );
}
