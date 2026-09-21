import type { SpectrumFrame } from "./spectrum-bus";

/** MilkDrop / Butterchurn time-domain buffer length. */
export const MILKDROP_WAVE_SIZE = 576;

const SILENCE = 128;

export function spectrumToTimeBytes(frame: SpectrumFrame): Uint8Array {
  const out = new Uint8Array(MILKDROP_WAVE_SIZE);
  const wave = frame.waveform;
  if (wave && wave.length >= 32) {
    for (let i = 0; i < MILKDROP_WAVE_SIZE; i++) {
      out[i] = wave[i % wave.length] ?? SILENCE;
    }
    return out;
  }

  const bands = frame.bands;
  const last = Math.max(1, bands.length - 1);
  for (let i = 0; i < MILKDROP_WAVE_SIZE; i++) {
    const t = i / MILKDROP_WAVE_SIZE;
    const band = bands[Math.floor(t * last)] ?? 0;
    const s =
      Math.sin(t * Math.PI * 2 * (1 + frame.bass * 8)) *
      (0.2 + frame.energy * 0.75) *
      (0.35 + band);
    out[i] = Math.round((s + 1) * 127.5);
  }
  return out;
}
