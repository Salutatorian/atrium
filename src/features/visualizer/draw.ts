import type { VisualizerColorMode, VisualizerPreset } from "./catalog";
import type { SpectrumFrame } from "./spectrum-bus";

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function hsl(h: number, s: number, l: number, a = 1): string {
  return `hsla(${h}, ${s}%, ${l}%, ${a})`;
}

function columnColor(
  mode: VisualizerColorMode,
  t: number,
  heightT: number,
  accent: string,
): string {
  switch (mode) {
    case "accent":
      return accent;
    case "warm":
      return hsl(lerp(18, 48, heightT), 92, lerp(42, 62, heightT));
    case "cool":
      return hsl(lerp(210, 195, heightT), 80, lerp(55, 78, heightT));
    case "rainbow":
      return hsl(t * 300, 85, 55);
    case "magenta":
      return hsl(lerp(310, 330, heightT), 85, lerp(48, 62, heightT));
    case "cyan":
      return hsl(lerp(185, 200, heightT), 90, lerp(48, 65, heightT));
    case "gold":
      return hsl(lerp(45, 55, heightT), 95, lerp(48, 62, heightT));
    case "mono":
      return hsl(0, 0, lerp(55, 92, heightT));
    case "fire":
      return hsl(lerp(8, 48, heightT), 95, lerp(45, 58, heightT));
    case "ice":
      return hsl(lerp(195, 210, heightT), 70, lerp(55, 85, heightT));
    case "neon":
      return hsl(lerp(320, 50, heightT), 95, lerp(52, 60, heightT));
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

function sampleBands(frame: SpectrumFrame, count: number, punch: number): number[] {
  const src = frame.bands.length > 0 ? frame.bands : [0];
  const out: number[] = [];
  const boost = 1 + frame.beat * punch * 0.55 + frame.bass * 0.2;
  for (let i = 0; i < count; i++) {
    const t = count <= 1 ? 0 : i / (count - 1);
    const idx = t * (src.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.min(src.length - 1, lo + 1);
    const frac = idx - lo;
    const v = lerp(src[lo] ?? 0, src[hi] ?? 0, frac);
    out.push(Math.min(1, v * boost));
  }
  return out;
}

export type DrawContext = {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  preset: VisualizerPreset;
  frame: SpectrumFrame;
  accent: string;
  peaks: Float32Array;
  /** Opaque backdrop for full-window stage; player preview stays transparent. */
  fillBackground?: boolean;
};

function canvasScale(width: number, height: number): number {
  return Math.max(1, Math.min(width, height) / 360);
}

export function drawVisualizer(args: DrawContext): void {
  const { ctx, width, height, preset, frame, accent, peaks } = args;
  if (args.fillBackground) {
    ctx.fillStyle = "#05070a";
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.clearRect(0, 0, width, height);
  }
  if (preset.id === "off" || preset.barCount <= 0 || width < 8 || height < 8) {
    return;
  }

  const levels = sampleBands(frame, preset.barCount, preset.beatPunch);
  const scale = canvasScale(width, height);

  if (preset.shape === "wave") {
    drawWave({ ctx, width, height, preset, levels, accent, frame, scale });
    return;
  }

  if (preset.shape === "mirror") {
    drawMirror({ ctx, width, height, preset, levels, accent, peaks });
    return;
  }

  if (preset.shape === "radial") {
    drawRadial({ ctx, width, height, preset, levels, accent, frame, scale });
    return;
  }

  if (preset.shape === "ring") {
    drawRing({ ctx, width, height, preset, levels, accent, frame, scale });
    return;
  }

  if (preset.shape === "scope") {
    drawScope({ ctx, width, height, preset, levels, accent, frame, scale });
    return;
  }

  drawColumns({ ctx, width, height, preset, levels, accent, peaks });
}

function drawColumns(args: {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  preset: VisualizerPreset;
  levels: number[];
  accent: string;
  peaks: Float32Array;
}): void {
  const { ctx, width, height, preset, levels, accent, peaks } = args;
  const n = levels.length;
  const gap = Math.max(1, width / n / 8);
  const barW = Math.max(2, (width - gap * (n + 1)) / n);
  const maxH = height * 0.92;
  const baseY = height;

  for (let i = 0; i < n; i++) {
    const level = levels[i] ?? 0;
    const x = gap + i * (barW + gap);
    const h = Math.max(2, level * maxH);
    const t = n <= 1 ? 0 : i / (n - 1);

    if (preset.peaks) {
      const prev = peaks[i] ?? 0;
      peaks[i] = level >= prev ? level : Math.max(level, prev - 0.012);
    }

    switch (preset.shape) {
      case "blocks":
        drawBlocks(ctx, x, baseY, barW, h, maxH, preset, t, accent);
        break;
      case "dots":
        drawDots(ctx, x, baseY, barW, h, maxH, preset, t, accent);
        break;
      case "segments":
        drawSegments(ctx, x, baseY, barW, h, maxH, preset, t, accent);
        break;
      case "solid":
      default: {
        const grad = ctx.createLinearGradient(x, baseY - h, x, baseY);
        grad.addColorStop(0, columnColor(preset.colorMode, t, 1, accent));
        grad.addColorStop(1, columnColor(preset.colorMode, t, 0, accent));
        ctx.fillStyle = grad;
        const r = Math.min(4, barW / 2);
        roundRect(ctx, x, baseY - h, barW, h, r);
        ctx.fill();
        break;
      }
    }

    if (preset.peaks) {
      const peakH = (peaks[i] ?? level) * maxH;
      ctx.fillStyle = columnColor(preset.colorMode, t, 1, accent);
      ctx.globalAlpha = 0.95;
      ctx.fillRect(x, baseY - peakH - 2, barW, 3);
      ctx.globalAlpha = 1;
    }
  }
}

function drawBlocks(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  barW: number,
  h: number,
  maxH: number,
  preset: VisualizerPreset,
  t: number,
  accent: string,
): void {
  const block = Math.max(3, Math.min(7, barW * 0.55));
  const gap = 1.5;
  const count = Math.max(1, Math.floor(h / (block + gap)));
  for (let b = 0; b < count; b++) {
    const y = baseY - (b + 1) * (block + gap);
    const heightT = (b + 1) / Math.max(1, Math.floor(maxH / (block + gap)));
    ctx.fillStyle = columnColor(preset.colorMode, t, heightT, accent);
    roundRect(ctx, x, y, barW, block, 1.5);
    ctx.fill();
  }
}

function drawDots(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  barW: number,
  h: number,
  maxH: number,
  preset: VisualizerPreset,
  t: number,
  accent: string,
): void {
  const diameter = Math.max(2.5, Math.min(barW * 0.85, 8));
  const gap = 1.5;
  const count = Math.max(1, Math.floor(h / (diameter + gap)));
  const cx = x + barW / 2;
  const fade = preset.id === "fade-dots";
  for (let b = 0; b < count; b++) {
    const cy = baseY - diameter / 2 - b * (diameter + gap);
    const heightT = (b + 1) / Math.max(1, Math.floor(maxH / (diameter + gap)));
    ctx.fillStyle = columnColor(preset.colorMode, t, heightT, accent);
    ctx.globalAlpha = fade ? Math.max(0.2, 1 - heightT * 0.85) : 1;
    const r = fade ? diameter / 2 * (1 - heightT * 0.35) : diameter / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawSegments(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  barW: number,
  h: number,
  maxH: number,
  preset: VisualizerPreset,
  t: number,
  accent: string,
): void {
  const seg = 2;
  const gap = 1.2;
  const count = Math.max(1, Math.floor(h / (seg + gap)));
  for (let b = 0; b < count; b++) {
    const y = baseY - (b + 1) * (seg + gap);
    const heightT = (b + 1) / Math.max(1, Math.floor(maxH / (seg + gap)));
    ctx.fillStyle = columnColor(preset.colorMode, t, heightT, accent);
    ctx.fillRect(x, y, barW, seg);
  }
}

function drawMirror(args: {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  preset: VisualizerPreset;
  levels: number[];
  accent: string;
  peaks: Float32Array;
}): void {
  const { ctx, width, height, preset, levels, accent } = args;
  const n = levels.length;
  const gap = 1.5;
  const barW = Math.max(2, (width - gap * (n + 1)) / n);
  const mid = height / 2;
  const maxH = height * 0.42;

  for (let i = 0; i < n; i++) {
    const level = levels[i] ?? 0;
    const x = gap + i * (barW + gap);
    const h = Math.max(1, level * maxH);
    const t = n <= 1 ? 0 : i / (n - 1);
    const color = columnColor(preset.colorMode, t, level, accent);
    ctx.fillStyle = color;
    roundRect(ctx, x, mid - h, barW, h, 2);
    ctx.fill();
    ctx.globalAlpha = 0.55;
    roundRect(ctx, x, mid, barW, h, 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawWave(args: {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  preset: VisualizerPreset;
  levels: number[];
  accent: string;
  frame: SpectrumFrame;
  scale: number;
}): void {
  const { ctx, width, height, preset, levels, accent, frame, scale } = args;
  const mid = height * 0.55;
  const amp = height * 0.38 * (0.55 + frame.energy * 0.45 + frame.beat * 0.35);
  const layers = 5;

  for (let layer = 0; layer < layers; layer++) {
    const phase = layer * 0.55;
    const layerAmp = amp * (1 - layer * 0.12);
    ctx.beginPath();
    for (let i = 0; i < levels.length; i++) {
      const t = i / Math.max(1, levels.length - 1);
      const x = t * width;
      const wobble =
        Math.sin(t * Math.PI * 4 + phase + frame.bass * 3) *
        layerAmp *
        (0.35 + (levels[i] ?? 0) * 0.9);
      const y = mid + wobble * (layer % 2 === 0 ? 1 : -0.85);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = columnColor(
      preset.colorMode,
      layer / layers,
      0.5 + layer * 0.1,
      accent,
    );
    ctx.globalAlpha = 0.35 + (1 - layer / layers) * 0.45;
    ctx.lineWidth = 1.4 * scale;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawRadial(args: {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  preset: VisualizerPreset;
  levels: number[];
  accent: string;
  frame: SpectrumFrame;
  scale: number;
}): void {
  const { ctx, width, height, preset, levels, accent, frame, scale } = args;
  const cx = width / 2;
  const cy = height / 2;
  const maxR = Math.min(width, height) * (0.42 + frame.energy * 0.08);
  const inner = maxR * 0.14;
  const n = levels.length;
  const barW = Math.max(1.5 * scale, ((Math.PI * 2 * maxR) / n) * 0.52);

  for (let i = 0; i < n; i++) {
    const level = levels[i] ?? 0;
    const t = n <= 1 ? 0 : i / n;
    const angle = t * Math.PI * 2 - Math.PI / 2;
    const len = inner + level * (maxR - inner);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.fillStyle = columnColor(preset.colorMode, t, level, accent);
    ctx.globalAlpha = 0.55 + level * 0.45;
    roundRect(ctx, inner, -barW / 2, Math.max(1, len - inner), barW, Math.min(3, barW / 2));
    ctx.fill();
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, inner * (0.7 + frame.beat * 0.45), 0, Math.PI * 2);
  ctx.fillStyle = columnColor(preset.colorMode, 0.5, 1, accent);
  ctx.globalAlpha = 0.35 + frame.beat * 0.4;
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawRing(args: {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  preset: VisualizerPreset;
  levels: number[];
  accent: string;
  frame: SpectrumFrame;
  scale: number;
}): void {
  const { ctx, width, height, preset, levels, accent, frame, scale } = args;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * (0.28 + frame.bass * 0.04);
  const n = levels.length;
  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < n; i++) {
    const level = levels[i] ?? 0;
    const t = n <= 1 ? 0 : i / n;
    const angle = t * Math.PI * 2 - Math.PI / 2;
    const outer = radius + level * Math.min(width, height) * 0.22;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    ctx.strokeStyle = columnColor(preset.colorMode, t, level, accent);
    ctx.globalAlpha = 0.45 + level * 0.55;
    ctx.lineWidth = Math.max(1.5, scale * 2.2);
    ctx.lineCap = "round";
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(0, 0, radius * (0.92 + frame.beat * 0.08), 0, Math.PI * 2);
  ctx.strokeStyle = columnColor(preset.colorMode, 0.2, 0.6, accent);
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = scale;
  ctx.stroke();
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawScope(args: {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  preset: VisualizerPreset;
  levels: number[];
  accent: string;
  frame: SpectrumFrame;
  scale: number;
}): void {
  const { ctx, width, height, preset, levels, accent, frame, scale } = args;
  const mid = height / 2;
  const amp = height * (0.32 + frame.energy * 0.12);
  ctx.beginPath();
  for (let i = 0; i < levels.length; i++) {
    const t = i / Math.max(1, levels.length - 1);
    const x = t * width;
    const y = mid - ((levels[i] ?? 0) * 2 - 1) * amp * 0.55;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = columnColor(preset.colorMode, 0.4, 0.8, accent);
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = 6 * scale;
  ctx.stroke();
  ctx.strokeStyle = columnColor(preset.colorMode, 0.35, 1, accent);
  ctx.globalAlpha = 0.95;
  ctx.lineWidth = 1.6 * scale;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
