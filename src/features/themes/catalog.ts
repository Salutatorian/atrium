import type { ThemeDocument } from "./schema";
import { THEME_FILE_KIND, THEME_SCHEMA_VERSION } from "../../app/brand";
import { duskTheme, mistTheme } from "./presets";

export { duskTheme, mistTheme } from "./presets";

type Palette = {
  id: string;
  name: string;
  description: string;
  base: "light" | "dark";
  tags: string[];
  appBackground: string;
  raisedBackground: string;
  primaryText: string;
  secondaryText: string;
  mutedText: string;
  accent: string;
  accentHover: string;
  accentText: string;
};

const sharedAppearance = {
  fontFamily: '"DM Sans Variable", "Segoe UI", sans-serif',
  headingFontFamily: '"Fraunces Variable", Georgia, serif',
  baseFontSize: 14,
  fontWeight: 450,
  headingWeight: 560,
  letterSpacing: "0.01em",
  lineHeight: 1.45,
  cornerRadiusSmall: 8,
  cornerRadiusMedium: 14,
  cornerRadiusLarge: 22,
  buttonRadius: 999,
  artworkRadius: 16,
  borderWidth: 1,
  shadowStrength: 0.4,
  blurStrength: 18,
  surfaceOpacity: 0.72,
  spacingScale: 1,
  controlHeight: 36,
  sidebarWidth: 72,
  inspectorWidth: 320,
} as const;

function fromPalette(p: Palette): ThemeDocument {
  const dark = p.base === "dark";
  return {
    kind: THEME_FILE_KIND,
    schemaVersion: THEME_SCHEMA_VERSION,
    id: p.id,
    name: p.name,
    description: p.description,
    base: p.base,
    tags: p.tags,
    colors: {
      appBackground: p.appBackground,
      raisedBackground: p.raisedBackground,
      surface: dark
        ? "rgba(255, 255, 255, 0.06)"
        : "rgba(255, 255, 255, 0.62)",
      surfaceHover: dark
        ? "rgba(255, 255, 255, 0.1)"
        : "rgba(255, 255, 255, 0.84)",
      surfaceActive: dark
        ? "rgba(255, 255, 255, 0.12)"
        : "rgba(255, 255, 255, 0.9)",
      surfaceSelected: dark
        ? "rgba(255, 255, 255, 0.14)"
        : "rgba(255, 255, 255, 0.92)",
      primaryText: p.primaryText,
      secondaryText: p.secondaryText,
      mutedText: p.mutedText,
      accent: p.accent,
      accentHover: p.accentHover,
      accentText: p.accentText,
      secondaryAccent: p.accentHover,
      border: dark
        ? "rgba(255, 255, 255, 0.08)"
        : "rgba(20, 24, 28, 0.08)",
      divider: dark
        ? "rgba(255, 255, 255, 0.06)"
        : "rgba(20, 24, 28, 0.06)",
      focusRing: p.accent,
      success: "#3f9d78",
      warning: "#d08a4c",
      danger: "#d16a6a",
      artworkGlow: dark
        ? "rgba(255, 255, 255, 0.18)"
        : "rgba(20, 24, 28, 0.12)",
      waveform: p.accent,
      progressTrack: dark
        ? "rgba(255, 255, 255, 0.14)"
        : "rgba(20, 24, 28, 0.12)",
      progressFill: p.accent,
      lyricActive: p.primaryText,
      lyricPast: dark
        ? "rgba(255, 255, 255, 0.4)"
        : "rgba(20, 24, 28, 0.4)",
      lyricFuture: dark
        ? "rgba(255, 255, 255, 0.72)"
        : "rgba(20, 24, 28, 0.7)",
      selection: dark
        ? "rgba(255, 255, 255, 0.14)"
        : "rgba(20, 24, 28, 0.1)",
      scrollbar: dark
        ? "rgba(255, 255, 255, 0.22)"
        : "rgba(20, 24, 28, 0.22)",
      tooltipBackground: dark ? p.raisedBackground : "#1a2428",
      tooltipText: dark ? p.primaryText : "#f4f7f8",
      contextMenuBackground: p.raisedBackground,
    },
    appearance: {
      ...sharedAppearance,
      shadowStrength: dark ? 0.55 : 0.35,
      blurStrength: dark ? 22 : 18,
    },
    background: {
      mode: "gradient",
      blur: 0,
      darkness: dark ? 0.22 : 0.04,
      brightness: 1,
      saturation: 1.05,
      overlayOpacity: dark ? 0.28 : 0.12,
      noiseAmount: 0.04,
      vignetteAmount: dark ? 0.34 : 0.16,
      animationStrength: 0.2,
    },
  };
}

/** Original Atrium palettes — not third-party theme packs. */
const paletteCatalog: Palette[] = [
  {
    id: "atrium-ink-amber",
    name: "Ink Amber",
    description: "Dark charcoal with gold accent",
    base: "dark",
    tags: ["dark", "warm"],
    appBackground: "#191815",
    raisedBackground: "#23211c",
    primaryText: "#efe7d7",
    secondaryText: "#c8bba4",
    mutedText: "#8f8574",
    accent: "#e2b714",
    accentHover: "#f0c62a",
    accentText: "#1a1608",
  },
  {
    id: "atrium-nordic-night",
    name: "Nordic Night",
    description: "Cool arctic dark room",
    base: "dark",
    tags: ["dark", "cool"],
    appBackground: "#1b222a",
    raisedBackground: "#242d38",
    primaryText: "#e6edf5",
    secondaryText: "#b7c4d4",
    mutedText: "#8392a6",
    accent: "#88c0d0",
    accentHover: "#9fd0dd",
    accentText: "#132029",
  },
  {
    id: "atrium-violet-room",
    name: "Violet Room",
    description: "Plum night with lilac accent",
    base: "dark",
    tags: ["dark", "violet"],
    appBackground: "#1a1522",
    raisedBackground: "#251f30",
    primaryText: "#f0e8fb",
    secondaryText: "#c7b8db",
    mutedText: "#8f819f",
    accent: "#b794f4",
    accentHover: "#c9a9f8",
    accentText: "#1b1228",
  },
  {
    id: "atrium-matrix-leaf",
    name: "Matrix Leaf",
    description: "Black terminal green",
    base: "dark",
    tags: ["dark", "green"],
    appBackground: "#0b120c",
    raisedBackground: "#121a13",
    primaryText: "#d7f7d9",
    secondaryText: "#9dcf9f",
    mutedText: "#6a916c",
    accent: "#39d353",
    accentHover: "#58e06e",
    accentText: "#041008",
  },
  {
    id: "atrium-crimson-stage",
    name: "Crimson Stage",
    description: "Deep stage reds",
    base: "dark",
    tags: ["dark", "warm"],
    appBackground: "#180e10",
    raisedBackground: "#241418",
    primaryText: "#f7e8ea",
    secondaryText: "#d4b0b6",
    mutedText: "#9a7278",
    accent: "#e2556c",
    accentHover: "#ef6d81",
    accentText: "#1a080c",
  },
  {
    id: "atrium-ocean-glass",
    name: "Ocean Glass",
    description: "Teal glass over deep blue",
    base: "dark",
    tags: ["dark", "cool"],
    appBackground: "#0f1a22",
    raisedBackground: "#172632",
    primaryText: "#e5f3fb",
    secondaryText: "#a9c7d8",
    mutedText: "#7392a4",
    accent: "#3db8a8",
    accentHover: "#55c9ba",
    accentText: "#06201c",
  },
  {
    id: "atrium-peach-dawn",
    name: "Peach Dawn",
    description: "Soft peach daylight",
    base: "light",
    tags: ["light", "warm"],
    appBackground: "#f7eee7",
    raisedBackground: "#fff8f3",
    primaryText: "#3a2a24",
    secondaryText: "#6b534a",
    mutedText: "#927870",
    accent: "#e07a5f",
    accentHover: "#c9654c",
    accentText: "#fff8f3",
  },
  {
    id: "atrium-lilac-mist",
    name: "Lilac Mist",
    description: "Lavender morning light",
    base: "light",
    tags: ["light", "cool"],
    appBackground: "#efeaf6",
    raisedBackground: "#f8f5fc",
    primaryText: "#2c2438",
    secondaryText: "#5c526e",
    mutedText: "#857995",
    accent: "#8b6cc7",
    accentHover: "#7356b0",
    accentText: "#f8f5fc",
  },
  {
    id: "atrium-paper-ink",
    name: "Paper Ink",
    description: "High-contrast reading light",
    base: "light",
    tags: ["light", "mono"],
    appBackground: "#f2f0ea",
    raisedBackground: "#fcfbf7",
    primaryText: "#1c1b19",
    secondaryText: "#4a4742",
    mutedText: "#7a756c",
    accent: "#2f6fed",
    accentHover: "#1f5ad0",
    accentText: "#ffffff",
  },
  {
    id: "atrium-matcha",
    name: "Matcha",
    description: "Soft green tea lounge",
    base: "light",
    tags: ["light", "green"],
    appBackground: "#eaf1e6",
    raisedBackground: "#f5faf2",
    primaryText: "#243028",
    secondaryText: "#4c5d52",
    mutedText: "#748579",
    accent: "#5a8f63",
    accentHover: "#487552",
    accentText: "#f5faf2",
  },
  {
    id: "atrium-sunset-lane",
    name: "Sunset Lane",
    description: "Coral dusk gradient room",
    base: "dark",
    tags: ["dark", "warm"],
    appBackground: "#1c1214",
    raisedBackground: "#2a1a1d",
    primaryText: "#ffe8df",
    secondaryText: "#e0b8ab",
    mutedText: "#a88278",
    accent: "#ff7a59",
    accentHover: "#ff9175",
    accentText: "#2a100c",
  },
  {
    id: "atrium-graphite",
    name: "Graphite",
    description: "Neutral studio charcoal",
    base: "dark",
    tags: ["dark", "mono"],
    appBackground: "#17181a",
    raisedBackground: "#222326",
    primaryText: "#eceef1",
    secondaryText: "#b5b9c0",
    mutedText: "#858991",
    accent: "#7aa2ff",
    accentHover: "#93b3ff",
    accentText: "#0f1420",
  },
  {
    id: "atrium-honey-comb",
    name: "Honeycomb",
    description: "Warm honey over cream",
    base: "light",
    tags: ["light", "warm"],
    appBackground: "#f6efd9",
    raisedBackground: "#fff8e8",
    primaryText: "#3a2f14",
    secondaryText: "#6b5a2d",
    mutedText: "#94824d",
    accent: "#c98a1c",
    accentHover: "#a97212",
    accentText: "#fff8e8",
  },
  {
    id: "atrium-midnight-jazz",
    name: "Midnight Jazz",
    description: "Indigo club lighting",
    base: "dark",
    tags: ["dark", "cool"],
    appBackground: "#111526",
    raisedBackground: "#1a2036",
    primaryText: "#e8ecff",
    secondaryText: "#b4bce0",
    mutedText: "#8088ad",
    accent: "#6c8cff",
    accentHover: "#87a1ff",
    accentText: "#10162a",
  },
  {
    id: "atrium-sakura",
    name: "Sakura",
    description: "Soft pink blossom light",
    base: "light",
    tags: ["light", "warm"],
    appBackground: "#f8eef2",
    raisedBackground: "#fff7fa",
    primaryText: "#3a2430",
    secondaryText: "#6d4a59",
    mutedText: "#977484",
    accent: "#d66d95",
    accentHover: "#bf5780",
    accentText: "#fff7fa",
  },
  {
    id: "atrium-copper-wire",
    name: "Copper Wire",
    description: "Industrial copper night",
    base: "dark",
    tags: ["dark", "warm"],
    appBackground: "#171210",
    raisedBackground: "#241b17",
    primaryText: "#f2e6dc",
    secondaryText: "#cdb4a4",
    mutedText: "#947c6e",
    accent: "#c57b4a",
    accentHover: "#d58c5c",
    accentText: "#1c100a",
  },
];

export const catalogThemes: ThemeDocument[] = paletteCatalog.map(fromPalette);

export const builtinThemes: ThemeDocument[] = [
  mistTheme,
  duskTheme,
  ...catalogThemes,
];

export function getThemeById(id: string): ThemeDocument | undefined {
  return builtinThemes.find((theme) => theme.id === id);
}
