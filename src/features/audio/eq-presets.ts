/** 10-band graphic EQ presets + helpers. */

export const EQ_BAND_COUNT = 10;

export const EQ_FREQUENCIES_HZ = [
  32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000,
] as const;

export const EQ_FREQUENCY_LABELS = [
  "32",
  "64",
  "125",
  "250",
  "500",
  "1k",
  "2k",
  "4k",
  "8k",
  "16k",
] as const;

export type EqPresetId =
  | "flat"
  | "bass-boost"
  | "bass-cut"
  | "treble-boost"
  | "treble-cut"
  | "vocal"
  | "rock"
  | "pop"
  | "jazz"
  | "classical"
  | "electronic"
  | "hip-hop"
  | "rnb"
  | "metal"
  | "acoustic"
  | "loudness"
  | "podcast"
  | "dance"
  | "cinema"
  | "soft"
  | "custom";

export type EqPreset = {
  id: EqPresetId;
  name: string;
  description: string;
  /** 10 band gains in dB */
  bands: number[];
  /** Suggested Q (user can still override) */
  q: number;
  preampDb?: number;
};

const flat = (): number[] => Array.from({ length: EQ_BAND_COUNT }, () => 0);

export const EQ_PRESETS: EqPreset[] = [
  {
    id: "flat",
    name: "Flat",
    description: "Neutral — no boosts or cuts",
    bands: flat(),
    q: 1,
  },
  {
    id: "bass-boost",
    name: "Bass boost",
    description: "Punchy low end",
    bands: [6, 5, 3.5, 1.5, 0, 0, 0, 0, 0, 0],
    q: 1.1,
    preampDb: -2,
  },
  {
    id: "bass-cut",
    name: "Bass cut",
    description: "Tame rumble / muddy rooms",
    bands: [-6, -5, -3, -1, 0, 0, 0, 0, 0, 0],
    q: 1,
  },
  {
    id: "treble-boost",
    name: "Treble boost",
    description: "Air and sparkle on top",
    bands: [0, 0, 0, 0, 0, 0.5, 2, 3.5, 5, 5.5],
    q: 1.1,
    preampDb: -1.5,
  },
  {
    id: "treble-cut",
    name: "Treble cut",
    description: "Softer highs / less harsh",
    bands: [0, 0, 0, 0, 0, -0.5, -2, -3.5, -5, -5.5],
    q: 1,
  },
  {
    id: "vocal",
    name: "Vocal",
    description: "Presence for voices & podcasts",
    bands: [-2, -1.5, -1, 1, 3, 4, 3, 1, 0, -1],
    q: 1.2,
    preampDb: -1,
  },
  {
    id: "rock",
    name: "Rock",
    description: "Thick lows, scooped mids, bright top",
    bands: [4.5, 3.5, 1, -1.5, -2, -1, 1.5, 3, 4, 3.5],
    q: 1.15,
    preampDb: -2,
  },
  {
    id: "pop",
    name: "Pop",
    description: "Radio-friendly smile curve",
    bands: [3, 2.5, 1, 0, -0.5, 1, 2.5, 3, 2.5, 2],
    q: 1.05,
    preampDb: -1.5,
  },
  {
    id: "jazz",
    name: "Jazz",
    description: "Warm body, clear detail",
    bands: [2, 1.5, 0.5, 0, -0.5, 0.5, 1.5, 2, 1.5, 1],
    q: 0.95,
  },
  {
    id: "classical",
    name: "Classical",
    description: "Natural room, gentle highs",
    bands: [0, 0, 0, 0, 0, 0, 0.5, 1.5, 2.5, 3],
    q: 0.9,
  },
  {
    id: "electronic",
    name: "Electronic",
    description: "Sub weight + crisp hats",
    bands: [5.5, 4, 2, 0, -1, 0, 1.5, 3, 4.5, 4],
    q: 1.25,
    preampDb: -2.5,
  },
  {
    id: "hip-hop",
    name: "Hip-hop",
    description: "Sub-heavy with clear vocals",
    bands: [6, 5, 3, 0.5, -1, 1.5, 2.5, 1.5, 1, 0.5],
    q: 1.2,
    preampDb: -2.5,
  },
  {
    id: "rnb",
    name: "R&B",
    description: "Smooth low-mids and silk highs",
    bands: [3.5, 3, 1.5, 0.5, 0, 1, 2, 2.5, 2, 1.5],
    q: 1.05,
    preampDb: -1.5,
  },
  {
    id: "metal",
    name: "Metal",
    description: "Tight lows, aggressive upper mids",
    bands: [3, 1.5, -1, -2.5, -1, 2, 4, 3.5, 2.5, 1.5],
    q: 1.35,
    preampDb: -2,
  },
  {
    id: "acoustic",
    name: "Acoustic",
    description: "Body without boom, natural sparkle",
    bands: [-1.5, -1, 0.5, 1.5, 1, 0.5, 1.5, 2.5, 2, 1.5],
    q: 1,
  },
  {
    id: "loudness",
    name: "Loudness",
    description: "Fletcher–Munson style low-volume curve",
    bands: [5, 4, 2, 0.5, 0, 0, 0.5, 2, 3.5, 4],
    q: 1,
    preampDb: -2,
  },
  {
    id: "podcast",
    name: "Podcast",
    description: "Speech clarity, less rumble",
    bands: [-4, -3, -1, 1.5, 3.5, 4, 2.5, 0.5, -1, -2],
    q: 1.15,
    preampDb: -1,
  },
  {
    id: "dance",
    name: "Dance",
    description: "Club kick + bright top",
    bands: [5, 4.5, 2.5, 0, -1.5, 0, 1.5, 3, 4, 3.5],
    q: 1.2,
    preampDb: -2.5,
  },
  {
    id: "cinema",
    name: "Cinema",
    description: "Wide, theatrical low end and air",
    bands: [4, 3, 1.5, 0, -0.5, 0.5, 1.5, 2.5, 3.5, 4],
    q: 1,
    preampDb: -2,
  },
  {
    id: "soft",
    name: "Soft",
    description: "Gentle listening, fewer edges",
    bands: [1, 0.5, 0, -0.5, -1, -0.5, 0, 0.5, 0, -0.5],
    q: 0.85,
  },
];

export function getEqPreset(id: string): EqPreset | undefined {
  return EQ_PRESETS.find((p) => p.id === id);
}

export function bandsMatchPreset(bands: number[], preset: EqPreset): boolean {
  return preset.bands.every(
    (gain, i) => Math.abs((bands[i] ?? 0) - gain) < 0.05,
  );
}

export function formatEqHz(hz: number): string {
  if (hz >= 1000) return `${hz / 1000}k`;
  return String(hz);
}

export function normalizeEqBands(bands: number[] | undefined): number[] {
  const out = flat();
  if (!bands) return out;
  for (let i = 0; i < EQ_BAND_COUNT; i++) {
    const v = bands[i];
    out[i] = typeof v === "number" && Number.isFinite(v) ? Math.max(-12, Math.min(12, v)) : 0;
  }
  return out;
}
