import type { SpectrumFrame } from "./spectrum-bus";
import type { StageSceneId } from "./stage-catalog";

export type StageParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  hue: number;
  size: number;
};

export type StageStar = {
  x: number;
  y: number;
  z: number;
};

export type StageState = {
  stars: StageStar[];
  particles: StageParticle[];
  spawn: number;
};

export function createStageState(): StageState {
  const stars: StageStar[] = [];
  for (let i = 0; i < 140; i++) {
    stars.push({
      x: Math.random() * 2 - 1,
      y: Math.random() * 2 - 1,
      z: Math.random(),
    });
  }
  return { stars, particles: [], spawn: 0 };
}

export type StageDrawArgs = {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  scene: StageSceneId;
  frame: SpectrumFrame;
  accent: string;
  now: number;
  reducedMotion: boolean;
  state: StageState;
};

function hsl(h: number, s: number, l: number, a = 1): string {
  return `hsla(${((h % 360) + 360) % 360}, ${s}%, ${l}%, ${a})`;
}

function fade(ctx: CanvasRenderingContext2D, width: number, height: number, a: number): void {
  ctx.fillStyle = `rgba(5, 7, 10, ${a})`;
  ctx.fillRect(0, 0, width, height);
}

export function drawStage(args: StageDrawArgs): void {
  const { scene } = args;
  switch (scene) {
    case "ambience":
      drawAmbience(args);
      break;
    case "tunnel":
      drawTunnel(args);
      break;
    case "plasma":
      drawPlasma(args);
      break;
    case "starfield":
      drawStarfield(args);
      break;
    case "particles":
      drawParticles(args);
      break;
    case "vortex":
      drawVortex(args);
      break;
    case "ribbons":
      drawRibbons(args);
      break;
    default: {
      const _exhaustive: never = scene;
      return _exhaustive;
    }
  }
}

function drawAmbience(args: StageDrawArgs): void {
  const { ctx, width, height, frame, now, reducedMotion } = args;
  fade(ctx, width, height, reducedMotion ? 1 : 0.16);
  const t = now * 0.00022;
  const blobs = 6;
  for (let i = 0; i < blobs; i++) {
    const phase = t + i * 1.15;
    const x =
      width * (0.5 + Math.sin(phase * (0.7 + i * 0.11)) * 0.28 + (frame.bass - 0.3) * 0.08);
    const y =
      height * (0.48 + Math.cos(phase * (0.55 + i * 0.09)) * 0.26);
    const r =
      Math.min(width, height) *
      (0.22 + frame.energy * 0.18 + frame.beat * 0.12 + (i % 3) * 0.05);
    const hue = 280 + i * 28 + frame.bass * 40 + Math.sin(phase) * 18;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, hsl(hue, 85, 58, 0.22 + frame.energy * 0.2));
    g.addColorStop(0.45, hsl(hue + 24, 80, 42, 0.12));
    g.addColorStop(1, hsl(hue, 70, 20, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTunnel(args: StageDrawArgs): void {
  const { ctx, width, height, frame, now, reducedMotion } = args;
  fade(ctx, width, height, reducedMotion ? 1 : 0.22);
  const cx = width / 2;
  const cy = height / 2;
  const maxR = Math.hypot(width, height) * 0.62;
  const t = now * (0.00035 + frame.energy * 0.0004);
  const rings = 22;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(t * 0.35 + frame.bass * 0.4);
  for (let i = 0; i < rings; i++) {
    const u = (i / rings + t) % 1;
    const r = 8 + u * u * maxR;
    const hue = 190 + u * 140 + frame.beat * 30;
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * (0.62 + frame.bass * 0.12), 0, 0, Math.PI * 2);
    ctx.strokeStyle = hsl(hue, 90, 58, 0.12 + (1 - u) * 0.45);
    ctx.lineWidth = 2 + (1 - u) * 10 + frame.beat * 6;
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlasma(args: StageDrawArgs): void {
  const { ctx, width, height, frame, now } = args;
  const t = now * 0.0011;
  const step = Math.max(10, Math.round(Math.min(width, height) / 48));
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const nx = x / 90;
      const ny = y / 90;
      const v =
        Math.sin(nx + t) +
        Math.sin(ny * 1.3 + t * 1.15) +
        Math.sin((nx + ny) * 0.7 + t * 0.8) +
        frame.bass * 1.2;
      const n = (v + 4) / 8;
      const hue = 200 + n * 140 + frame.energy * 40;
      ctx.fillStyle = hsl(hue, 80, 18 + n * 32, 1);
      ctx.fillRect(x, y, step + 1, step + 1);
    }
  }
}

function drawStarfield(args: StageDrawArgs): void {
  const { ctx, width, height, frame, state, reducedMotion } = args;
  fade(ctx, width, height, reducedMotion ? 1 : 0.35);
  const cx = width / 2;
  const cy = height / 2;
  const speed = 0.012 + frame.energy * 0.04 + frame.beat * 0.03;
  ctx.fillStyle = "#fff";
  for (const star of state.stars) {
    star.z -= speed;
    if (star.z <= 0.02) {
      star.x = Math.random() * 2 - 1;
      star.y = Math.random() * 2 - 1;
      star.z = 1;
    }
    const k = 1 / star.z;
    const x = cx + star.x * k * width * 0.55;
    const y = cy + star.y * k * height * 0.55;
    const size = (1 - star.z) * (1.4 + frame.energy * 2.2);
    ctx.globalAlpha = Math.min(1, (1 - star.z) * 1.15);
    ctx.fillRect(x, y, size, size);
  }
  ctx.globalAlpha = 1;
}

function spawnBurst(state: StageState, width: number, height: number, frame: SpectrumFrame): void {
  const count = 10 + Math.round(frame.beat * 18);
  const cx = width / 2;
  const cy = height / 2;
  for (let i = 0; i < count; i++) {
    if (state.particles.length > 220) state.particles.shift();
    const a = Math.random() * Math.PI * 2;
    const s = 1.2 + Math.random() * 4 + frame.energy * 3;
    state.particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 1,
      hue: 200 + Math.random() * 140,
      size: 1.5 + Math.random() * 3,
    });
  }
}

function drawParticles(args: StageDrawArgs): void {
  const { ctx, width, height, frame, state, reducedMotion } = args;
  fade(ctx, width, height, reducedMotion ? 1 : 0.2);
  state.spawn += frame.beat;
  if (frame.beat > 0.42 || state.spawn > 1.4) {
    spawnBurst(state, width, height, frame);
    state.spawn = 0;
  }
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    if (!p) continue;
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.012 + (1 - frame.energy) * 0.008;
    if (p.life <= 0) {
      state.particles.splice(i, 1);
      continue;
    }
    ctx.globalAlpha = p.life * 0.9;
    ctx.fillStyle = hsl(p.hue, 90, 62);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (0.6 + p.life), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawVortex(args: StageDrawArgs): void {
  const { ctx, width, height, frame, now, reducedMotion } = args;
  fade(ctx, width, height, reducedMotion ? 1 : 0.18);
  const cx = width / 2;
  const cy = height / 2;
  const arms = 4;
  const t = now * 0.0007 + frame.bass * 0.8;
  ctx.save();
  ctx.translate(cx, cy);
  for (let arm = 0; arm < arms; arm++) {
    ctx.beginPath();
    for (let i = 0; i < 80; i++) {
      const u = i / 79;
      const a = t + arm * ((Math.PI * 2) / arms) + u * 6.2;
      const r = u * Math.min(width, height) * (0.48 + frame.energy * 0.12);
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r * 0.72;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = hsl(310 + arm * 22 + frame.beat * 40, 90, 60, 0.35 + frame.energy * 0.35);
    ctx.lineWidth = 2.5 + frame.beat * 5;
    ctx.stroke();
  }
  ctx.restore();
}

function drawRibbons(args: StageDrawArgs): void {
  const { ctx, width, height, frame, now, reducedMotion } = args;
  fade(ctx, width, height, reducedMotion ? 1 : 0.14);
  const t = now * 0.00045;
  const layers = 5;
  for (let layer = 0; layer < layers; layer++) {
    ctx.beginPath();
    const amp = height * (0.08 + layer * 0.03) * (0.7 + frame.energy * 0.7);
    const y0 = height * (0.28 + layer * 0.1);
    for (let x = 0; x <= width; x += 8) {
      const u = x / width;
      const y =
        y0 +
        Math.sin(u * 6 + t * (1.2 + layer * 0.2) + frame.bass * 2) * amp +
        Math.sin(u * 13 + t * 0.7 + layer) * amp * 0.35;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = hsl(180 + layer * 28 + frame.beat * 20, 85, 58, 0.28 + (1 - layer / layers) * 0.35);
    ctx.lineWidth = 3 + layer * 0.6 + frame.beat * 4;
    ctx.stroke();
  }
}
