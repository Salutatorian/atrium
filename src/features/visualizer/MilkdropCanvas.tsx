import { useEffect, useRef } from "react";
import type { ButterchurnVisualizer } from "butterchurn";
import { usePlayerStore } from "../../stores/player-store";
import { useSettingsStore } from "../../stores/settings-store";
import { cn } from "../../utils/cn";
import { spectrumToTimeBytes } from "./milkdrop-audio";
import { loadMilkdropPresets } from "./milkdrop-presets";
import { getSpectrumFrame, type SpectrumFrame } from "./spectrum-bus";
import { getStageScene } from "./stage-catalog";
import { createStageState, drawStage } from "./stage-draw";

type MilkdropCanvasProps = {
  reducedMotion: boolean;
  className?: string;
};

type ButterchurnModule = {
  default?: { createVisualizer?: CreateVisualizer };
  createVisualizer?: CreateVisualizer;
};

type CreateVisualizer = (
  context: AudioContext | null,
  canvas: HTMLCanvasElement,
  opts: { width: number; height: number },
) => ButterchurnVisualizer;

function copyFrame(target: SpectrumFrame, source: SpectrumFrame): void {
  if (target.bands.length !== source.bands.length) {
    target.bands = source.bands.slice();
  } else {
    for (let i = 0; i < source.bands.length; i++) {
      target.bands[i] = source.bands[i] ?? 0;
    }
  }
  if (source.waveform) {
    target.waveform = source.waveform.slice();
  }
  target.bass = source.bass;
  target.beat = source.beat;
  target.energy = source.energy;
}

function createVisualizer(mod: ButterchurnModule, canvas: HTMLCanvasElement, width: number, height: number) {
  const create = mod.createVisualizer ?? mod.default?.createVisualizer;
  if (!create) throw new Error("butterchurn createVisualizer missing");
  return create(null, canvas, { width, height });
}

export function MilkdropCanvas({ reducedMotion, className }: MilkdropCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frozenRef = useRef<SpectrumFrame>({
    bands: [],
    bass: 0,
    beat: 0,
    energy: 0,
  });
  const hasFrozenRef = useRef(false);
  const sceneId = useSettingsStore((s) => s.settings.appearance.visualizerScene);
  const milkdropKey = getStageScene(sceneId).milkdrop;
  const canvasScene = getStageScene(sceneId).id;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let alive = true;
    let raf = 0;
    let visualizer: ButterchurnVisualizer | null = null;
    let lastDraw = 0;
    let lastTs = performance.now();
    const fallbackState = createStageState();
    const fallbackCtx = canvas.getContext("2d");

    const sizeOf = () => {
      const parent = canvas.parentElement;
      const cssW = Math.max(1, parent?.clientWidth ?? canvas.clientWidth);
      const cssH = Math.max(1, parent?.clientHeight ?? canvas.clientHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      return {
        cssW,
        cssH,
        width: Math.max(1, Math.floor(cssW * dpr)),
        height: Math.max(1, Math.floor(cssH * dpr)),
      };
    };

    const applyCssSize = (cssW: number, cssH: number) => {
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
    };

    const frameForDraw = (): SpectrumFrame => {
      const live = getSpectrumFrame();
      const status = usePlayerStore.getState().status;
      if (status === "playing") {
        copyFrame(frozenRef.current, live);
        hasFrozenRef.current = true;
        return live;
      }
      if (status === "paused" && hasFrozenRef.current) {
        return frozenRef.current;
      }
      hasFrozenRef.current = false;
      return live;
    };

    const drawFallback = (now: number) => {
      if (!fallbackCtx) return;
      const { cssW, cssH } = sizeOf();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      if (canvas.width !== Math.floor(cssW * dpr) || canvas.height !== Math.floor(cssH * dpr)) {
        canvas.width = Math.max(1, Math.floor(cssW * dpr));
        canvas.height = Math.max(1, Math.floor(cssH * dpr));
        fallbackCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      applyCssSize(cssW, cssH);
      drawStage({
        ctx: fallbackCtx,
        width: cssW,
        height: cssH,
        scene: canvasScene,
        frame: frameForDraw(),
        accent:
          getComputedStyle(document.documentElement)
            .getPropertyValue("--color-accent")
            .trim() || "#2f8f7b",
        now,
        reducedMotion,
        state: fallbackState,
      });
    };

    const tickMilkdrop = (now: number) => {
      if (!alive || !visualizer) return;
      raf = requestAnimationFrame(tickMilkdrop);
      if (document.visibilityState === "hidden") return;
      const minFrame = reducedMotion ? 48 : 22;
      if (now - lastDraw < minFrame) return;
      const elapsed = Math.min(1, (now - lastTs) / 1000);
      lastTs = now;
      lastDraw = now;
      const wave = spectrumToTimeBytes(frameForDraw());
      visualizer.render({
        elapsedTime: elapsed,
        audioLevels: {
          timeByteArray: wave,
          timeByteArrayL: wave,
          timeByteArrayR: wave,
        },
      });
    };

    const tickFallback = (now: number) => {
      if (!alive) return;
      raf = requestAnimationFrame(tickFallback);
      if (document.visibilityState === "hidden") return;
      const minFrame = reducedMotion ? 48 : 22;
      if (now - lastDraw < minFrame) return;
      lastDraw = now;
      drawFallback(now);
    };

    const startFallback = () => {
      cancelAnimationFrame(raf);
      lastDraw = 0;
      raf = requestAnimationFrame(tickFallback);
    };

    const boot = async () => {
      const { width, height, cssW, cssH } = sizeOf();
      canvas.width = width;
      canvas.height = height;
      applyCssSize(cssW, cssH);
      try {
        const [butterMod, presets] = await Promise.all([
          import("butterchurn") as Promise<ButterchurnModule>,
          loadMilkdropPresets(),
        ]);
        if (!alive) return;
        visualizer = createVisualizer(butterMod, canvas, width, height);
        const preset = presets[milkdropKey];
        if (!preset) throw new Error(`missing preset ${milkdropKey}`);
        await visualizer.loadPreset(preset, 0);
        visualizer.setRendererSize(width, height);
        lastTs = performance.now();
        raf = requestAnimationFrame(tickMilkdrop);
      } catch {
        if (!alive) return;
        visualizer = null;
        startFallback();
      }
    };

    const resize = () => {
      const { width, height, cssW, cssH } = sizeOf();
      applyCssSize(cssW, cssH);
      if (visualizer) {
        visualizer.setRendererSize(width, height);
      }
    };

    const onVisibility = () => {
      if (!alive) return;
      if (document.visibilityState === "visible") {
        lastDraw = 0;
        lastTs = performance.now();
        raf = requestAnimationFrame(visualizer ? tickMilkdrop : tickFallback);
      } else {
        cancelAnimationFrame(raf);
      }
    };

    void boot();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      ro.disconnect();
      visualizer = null;
    };
  }, [milkdropKey, canvasScene, reducedMotion]);

  return (
    <div className={cn("visualizer-stage__canvas-wrap", className)}>
      <canvas ref={canvasRef} className="visualizer-stage__canvas" />
    </div>
  );
}
