import { z } from "zod";
import {
  THEME_FILE_KIND,
  THEME_SCHEMA_VERSION,
} from "../../app/brand";

export const themeColorKeys = [
  "appBackground",
  "raisedBackground",
  "surface",
  "surfaceHover",
  "surfaceActive",
  "surfaceSelected",
  "primaryText",
  "secondaryText",
  "mutedText",
  "accent",
  "accentHover",
  "accentText",
  "secondaryAccent",
  "border",
  "divider",
  "focusRing",
  "success",
  "warning",
  "danger",
  "artworkGlow",
  "waveform",
  "progressTrack",
  "progressFill",
  "lyricActive",
  "lyricPast",
  "lyricFuture",
  "selection",
  "scrollbar",
  "tooltipBackground",
  "tooltipText",
  "contextMenuBackground",
] as const;

export const themeAppearanceKeys = [
  "fontFamily",
  "headingFontFamily",
  "baseFontSize",
  "fontWeight",
  "headingWeight",
  "letterSpacing",
  "lineHeight",
  "cornerRadiusSmall",
  "cornerRadiusMedium",
  "cornerRadiusLarge",
  "buttonRadius",
  "artworkRadius",
  "borderWidth",
  "shadowStrength",
  "blurStrength",
  "surfaceOpacity",
  "spacingScale",
  "controlHeight",
  "sidebarWidth",
  "inspectorWidth",
] as const;

const colorValue = z.string().min(1);
const colorsSchema = z.object(
  Object.fromEntries(themeColorKeys.map((key) => [key, colorValue])) as Record<
    (typeof themeColorKeys)[number],
    typeof colorValue
  >,
);

const appearanceSchema = z.object({
  fontFamily: z.string().min(1),
  headingFontFamily: z.string().min(1),
  baseFontSize: z.number().min(12).max(22),
  fontWeight: z.number().min(300).max(800),
  headingWeight: z.number().min(300).max(900),
  letterSpacing: z.string().min(1),
  lineHeight: z.number().min(1).max(2.2),
  cornerRadiusSmall: z.number().min(0).max(24),
  cornerRadiusMedium: z.number().min(0).max(32),
  cornerRadiusLarge: z.number().min(0).max(48),
  buttonRadius: z.number().min(0).max(999),
  artworkRadius: z.number().min(0).max(999),
  borderWidth: z.number().min(0).max(4),
  shadowStrength: z.number().min(0).max(1),
  blurStrength: z.number().min(0).max(64),
  surfaceOpacity: z.number().min(0).max(1),
  spacingScale: z.number().min(0.75).max(1.5),
  controlHeight: z.number().min(28).max(56),
  sidebarWidth: z.number().min(56).max(280),
  inspectorWidth: z.number().min(240).max(720),
});

export const themeBackgroundSchema = z.object({
  mode: z.enum([
    "solid",
    "gradient",
    "user-image",
    "album-art",
    "blurred-album-art",
    "album-gradient",
    "ambient",
    "none",
  ]),
  imagePath: z.string().optional(),
  blur: z.number().min(0).max(64),
  darkness: z.number().min(0).max(1),
  brightness: z.number().min(0).max(2),
  saturation: z.number().min(0).max(2),
  overlayOpacity: z.number().min(0).max(1),
  noiseAmount: z.number().min(0).max(1),
  vignetteAmount: z.number().min(0).max(1),
  animationStrength: z.number().min(0).max(1),
});

export const themeDocumentSchema = z.object({
  kind: z.literal(THEME_FILE_KIND),
  schemaVersion: z.number().int().min(1).max(THEME_SCHEMA_VERSION),
  id: z.string().min(1).max(120),
  name: z.string().min(1).max(80),
  description: z.string().max(280).optional(),
  base: z.enum(["light", "dark", "oled", "high-contrast"]),
  tags: z.array(z.string()).default([]),
  colors: colorsSchema,
  appearance: appearanceSchema,
  background: themeBackgroundSchema,
});

export type ThemeDocument = z.infer<typeof themeDocumentSchema>;
export type ThemeColors = ThemeDocument["colors"];
export type ThemeAppearance = ThemeDocument["appearance"];

export function validateThemeDocument(input: unknown): ThemeDocument {
  return themeDocumentSchema.parse(input);
}

export function safeParseThemeDocument(input: unknown) {
  return themeDocumentSchema.safeParse(input);
}

/** Map theme tokens onto CSS custom properties. */
export function themeToCssVariables(theme: ThemeDocument): Record<string, string> {
  const vars: Record<string, string> = {};

  for (const key of themeColorKeys) {
    vars[`--color-${toKebab(key)}`] = theme.colors[key];
  }

  const a = theme.appearance;
  vars["--font-family"] = a.fontFamily;
  vars["--font-heading"] = a.headingFontFamily;
  vars["--font-size-base"] = `${a.baseFontSize}px`;
  vars["--font-weight"] = String(a.fontWeight);
  vars["--font-weight-heading"] = String(a.headingWeight);
  vars["--letter-spacing"] = a.letterSpacing;
  vars["--line-height"] = String(a.lineHeight);
  vars["--radius-sm"] = `${a.cornerRadiusSmall}px`;
  vars["--radius-md"] = `${a.cornerRadiusMedium}px`;
  vars["--radius-lg"] = `${a.cornerRadiusLarge}px`;
  vars["--radius-button"] = `${a.buttonRadius}px`;
  vars["--radius-artwork"] = `${a.artworkRadius}px`;
  vars["--border-width"] = `${a.borderWidth}px`;
  vars["--shadow-strength"] = String(a.shadowStrength);
  vars["--blur-strength"] = `${a.blurStrength}px`;
  vars["--surface-opacity"] = String(a.surfaceOpacity);
  vars["--spacing-scale"] = String(a.spacingScale);
  vars["--control-height"] = `${a.controlHeight}px`;
  vars["--sidebar-width"] = `${a.sidebarWidth}px`;
  vars["--inspector-width"] = `${a.inspectorWidth}px`;
  vars["--bg-noise"] = String(theme.background.noiseAmount);
  vars["--bg-vignette"] = String(theme.background.vignetteAmount);
  vars["--bg-animation"] = String(theme.background.animationStrength);

  return vars;
}

function toKebab(value: string): string {
  return value.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}
