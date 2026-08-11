/** Soundbar / visualizer presets for the player dock. */

export type VisualizerShape =
  | "blocks"
  | "dots"
  | "segments"
  | "solid"
  | "wave"
  | "mirror";

export type VisualizerColorMode =
  | "accent"
  | "warm"
  | "cool"
  | "rainbow"
  | "magenta"
  | "cyan"
  | "gold"
  | "mono"
  | "fire"
  | "ice"
  | "neon";

export type VisualizerStyleId =
  | "off"
  | "classic-blocks"
  | "accent-bars"
  | "soft-dots"
  | "rainbow-blocks"
  | "neon-segments"
  | "cyan-grid"
  | "gold-grid"
  | "fade-dots"
  | "peak-magenta"
  | "peak-cyan"
  | "peak-gradient"
  | "mirror-bars"
  | "wave-ribbon"
  | "wave-neon"
  | "pulse-bars"
  | "mono-leds"
  | "fire-bars"
  | "ice-bars";

export type VisualizerPreset = {
  id: VisualizerStyleId;
  name: string;
  description: string;
  shape: VisualizerShape;
  colorMode: VisualizerColorMode;
  peaks: boolean;
  barCount: number;
  /** Extra beat punch multiplier */
  beatPunch: number;
};

export const DEFAULT_VISUALIZER_STYLE: VisualizerStyleId = "classic-blocks";

export const VISUALIZER_PRESETS: VisualizerPreset[] = [
  {
    id: "off",
    name: "Off",
    description: "Hide the soundbars",
    shape: "solid",
    colorMode: "accent",
    peaks: false,
    barCount: 0,
    beatPunch: 0,
  },
  {
    id: "classic-blocks",
    name: "Classic blocks",
    description: "Warm segmented bars — clean default",
    shape: "blocks",
    colorMode: "warm",
    peaks: false,
    barCount: 36,
    beatPunch: 1,
  },
  {
    id: "accent-bars",
    name: "Accent bars",
    description: "Solid bars using your theme accent",
    shape: "solid",
    colorMode: "accent",
    peaks: false,
    barCount: 40,
    beatPunch: 1,
  },
  {
    id: "soft-dots",
    name: "Soft dots",
    description: "Rounded LED columns",
    shape: "dots",
    colorMode: "cool",
    peaks: false,
    barCount: 32,
    beatPunch: 0.9,
  },
  {
    id: "rainbow-blocks",
    name: "Rainbow spectrum",
    description: "Each column a spectrum color",
    shape: "blocks",
    colorMode: "rainbow",
    peaks: false,
    barCount: 40,
    beatPunch: 1,
  },
  {
    id: "neon-segments",
    name: "Neon segments",
    description: "Thin horizontal slices",
    shape: "segments",
    colorMode: "neon",
    peaks: false,
    barCount: 48,
    beatPunch: 1.1,
  },
  {
    id: "cyan-grid",
    name: "Cyan grid",
    description: "Dense cyan dots",
    shape: "dots",
    colorMode: "cyan",
    peaks: false,
    barCount: 44,
    beatPunch: 1,
  },
  {
    id: "gold-grid",
    name: "Gold grid",
    description: "Bright yellow dots",
    shape: "dots",
    colorMode: "gold",
    peaks: false,
    barCount: 44,
    beatPunch: 1,
  },
  {
    id: "fade-dots",
    name: "Fade dots",
    description: "Dots that dissolve toward the top",
    shape: "dots",
    colorMode: "rainbow",
    peaks: false,
    barCount: 36,
    beatPunch: 0.95,
  },
  {
    id: "peak-magenta",
    name: "Peak magenta",
    description: "Blocks with floating peak holds",
    shape: "blocks",
    colorMode: "magenta",
    peaks: true,
    barCount: 32,
    beatPunch: 1.15,
  },
  {
    id: "peak-cyan",
    name: "Peak cyan",
    description: "Thin segments with peak caps",
    shape: "segments",
    colorMode: "cyan",
    peaks: true,
    barCount: 40,
    beatPunch: 1.1,
  },
  {
    id: "peak-gradient",
    name: "Peak pillars",
    description: "Solid gradient pillars + peaks",
    shape: "solid",
    colorMode: "fire",
    peaks: true,
    barCount: 28,
    beatPunch: 1.2,
  },
  {
    id: "mirror-bars",
    name: "Mirror bars",
    description: "Bars mirrored from the center line",
    shape: "mirror",
    colorMode: "accent",
    peaks: false,
    barCount: 48,
    beatPunch: 1.1,
  },
  {
    id: "wave-ribbon",
    name: "Wave ribbon",
    description: "Layered oscillating ribbons",
    shape: "wave",
    colorMode: "cool",
    peaks: false,
    barCount: 64,
    beatPunch: 1.25,
  },
  {
    id: "wave-neon",
    name: "Neon ribbon",
    description: "Magenta / white wave stack",
    shape: "wave",
    colorMode: "magenta",
    peaks: false,
    barCount: 64,
    beatPunch: 1.25,
  },
  {
    id: "pulse-bars",
    name: "Pulse bars",
    description: "Thick bars with heavy beat punch",
    shape: "solid",
    colorMode: "accent",
    peaks: true,
    barCount: 24,
    beatPunch: 1.6,
  },
  {
    id: "mono-leds",
    name: "Mono LEDs",
    description: "Monochrome segmented meters",
    shape: "blocks",
    colorMode: "mono",
    peaks: true,
    barCount: 36,
    beatPunch: 1,
  },
  {
    id: "fire-bars",
    name: "Fire bars",
    description: "Warm red–yellow solid columns",
    shape: "solid",
    colorMode: "fire",
    peaks: false,
    barCount: 36,
    beatPunch: 1.15,
  },
  {
    id: "ice-bars",
    name: "Ice bars",
    description: "Cool cyan–white solid columns",
    shape: "solid",
    colorMode: "ice",
    peaks: false,
    barCount: 36,
    beatPunch: 1.1,
  },
];

export const VISUALIZER_STYLE_IDS = VISUALIZER_PRESETS.map((p) => p.id) as [
  VisualizerStyleId,
  ...VisualizerStyleId[],
];

export function getVisualizerPreset(id: string): VisualizerPreset {
  return (
    VISUALIZER_PRESETS.find((p) => p.id === id) ??
    VISUALIZER_PRESETS.find((p) => p.id === DEFAULT_VISUALIZER_STYLE)!
  );
}
