import { z } from "zod";

export const appSettingsSchema = z.object({
  schemaVersion: z.number().int().min(1),
  general: z.object({
    launchBehavior: z.string(),
    startMinimized: z.boolean(),
    /** Hide to the system tray (notification area) when pressing X. Default on. */
    closeToTray: z.boolean().default(true),
    /** Start Atrium when signing in to Windows / macOS / Linux. Default off. */
    launchAtLogin: z.boolean().default(false),
    restoreLastPage: z.boolean(),
    restoreQueue: z.boolean(),
    language: z.string(),
    checkForUpdates: z.boolean().default(true),
    /** Quietly download + install on launch when an update is available. */
    autoInstallUpdates: z.boolean().default(true),
  }),
  library: z.object({
    watchFolders: z.boolean(),
    includeHiddenFiles: z.boolean(),
    followSymlinks: z.boolean(),
    maxRecursionDepth: z.number().int().min(1).max(256),
  }),
  playback: z.object({
    defaultVolume: z.number().min(0).max(1),
    rememberVolume: z.boolean(),
    autoplayOnDrop: z.boolean(),
    seekStepSeconds: z.number().int().min(1).max(60),
    replayGainMode: z.enum(["off", "track", "album"]).default("off"),
    preampDb: z.number().min(-12).max(12).default(0),
    eqEnabled: z.boolean().default(false),
    /** Legacy 3-band (kept for old settings files). */
    eqBassDb: z.number().min(-12).max(12).default(0),
    eqMidDb: z.number().min(-12).max(12).default(0),
    eqTrebleDb: z.number().min(-12).max(12).default(0),
    /** 10-band graphic EQ gains in dB (−12…+12). */
    eqBands: z
      .array(z.number().min(-12).max(12))
      .length(10)
      .default([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    /** Peaking filter Q / bandwidth (lower = wider). */
    eqQ: z.number().min(0.3).max(4).default(1),
    eqPresetId: z.string().min(1).default("flat"),
    crossfadeEnabled: z.boolean().default(false),
    crossfadeSeconds: z.number().int().min(0).max(12).default(3),
  }),
  appearance: z.object({
    themeId: z.string().min(1),
    followSystemTheme: z.boolean(),
    density: z.enum(["compact", "comfortable", "spacious"]),
    playerBarStyle: z.enum(["floating-pill", "full-width"]),
    shellMode: z.enum(["normal", "immersive", "mini"]),
    sidebarExpanded: z.boolean(),
    inspectorOpen: z.boolean(),
    inspectorWidth: z.number().int().min(240).max(720),
    reducedMotion: z.enum(["system", "reduce", "no-preference"]),
    /** App-wide UI font (Settings → Appearance). */
    uiFontId: z.string().min(1).default("dm-sans"),
    /** App-wide heading / display font. */
    headingFontId: z.string().min(1).default("fraunces"),
    /** Bottom player soundbar style. */
    visualizerStyle: z
      .enum([
        "off",
        "classic-blocks",
        "accent-bars",
        "soft-dots",
        "rainbow-blocks",
        "neon-segments",
        "cyan-grid",
        "gold-grid",
        "fade-dots",
        "peak-magenta",
        "peak-cyan",
        "peak-gradient",
        "mirror-bars",
        "wave-ribbon",
        "wave-neon",
        "pulse-bars",
        "mono-leds",
        "fire-bars",
        "ice-bars",
      ])
      .default("classic-blocks"),
    /** Tiny soundbars between repeat and volume. Default on. */
    visualizerEnabled: z.boolean().default(true),
  }),
  lyrics: z.object({
    preferSynchronized: z.boolean(),
    fontSize: z.number().int().min(12).max(40),
    alignment: z.enum(["left", "center", "right"]),
    globalOffsetMs: z.number().int().min(-5000).max(5000),
  }),
  privacy: z.object({
    allowNetwork: z.boolean(),
    allowLyricsProviders: z.boolean(),
    allowCrashReports: z.boolean(),
    allowAnalytics: z.boolean(),
  }),
});

export type AppSettings = z.infer<typeof appSettingsSchema>;

export const defaultSettings: AppSettings = {
  schemaVersion: 1,
  general: {
    launchBehavior: "normal",
    startMinimized: false,
    closeToTray: true,
    launchAtLogin: false,
    restoreLastPage: true,
    restoreQueue: true,
    language: "system",
    checkForUpdates: true,
    autoInstallUpdates: true,
  },
  library: {
    watchFolders: false,
    includeHiddenFiles: false,
    followSymlinks: false,
    maxRecursionDepth: 32,
  },
  playback: {
    defaultVolume: 0.8,
    rememberVolume: true,
    autoplayOnDrop: true,
    seekStepSeconds: 5,
    replayGainMode: "off",
    preampDb: 0,
    eqEnabled: false,
    eqBassDb: 0,
    eqMidDb: 0,
    eqTrebleDb: 0,
    eqBands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    eqQ: 1,
    eqPresetId: "flat",
    crossfadeEnabled: false,
    crossfadeSeconds: 3,
  },
  appearance: {
    themeId: "atrium-mist",
    followSystemTheme: false,
    density: "comfortable",
    playerBarStyle: "floating-pill",
    shellMode: "normal",
    sidebarExpanded: false,
    inspectorOpen: false,
    inspectorWidth: 320,
    reducedMotion: "system",
    uiFontId: "dm-sans",
    headingFontId: "fraunces",
    visualizerStyle: "classic-blocks",
    visualizerEnabled: true,
  },
  lyrics: {
    preferSynchronized: true,
    fontSize: 18,
    alignment: "center",
    globalOffsetMs: 0,
  },
  privacy: {
    allowNetwork: false,
    allowLyricsProviders: false,
    allowCrashReports: false,
    allowAnalytics: false,
  },
};

export function validateSettings(input: unknown): AppSettings {
  return appSettingsSchema.parse(input);
}

export function safeParseSettings(input: unknown) {
  return appSettingsSchema.safeParse(input);
}
