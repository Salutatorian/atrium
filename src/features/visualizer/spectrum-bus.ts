export type SpectrumFrame = {
  bands: number[];
  bass: number;
  beat: number;
  energy: number;
};

const EMPTY: SpectrumFrame = {
  bands: Array.from({ length: 48 }, () => 0),
  bass: 0,
  beat: 0,
  energy: 0,
};

/** Mutable latest spectrum — avoid React re-renders at 55 Hz. */
let latest: SpectrumFrame = EMPTY;
const listeners = new Set<() => void>();

export function pushSpectrumFrame(frame: SpectrumFrame): void {
  latest = frame;
  for (const listener of listeners) listener();
}

export function getSpectrumFrame(): SpectrumFrame {
  return latest;
}

export function subscribeSpectrum(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function clearSpectrum(): void {
  latest = EMPTY;
}
