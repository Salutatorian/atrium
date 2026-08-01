import { z } from "zod";

export const appSettingsSchema = z.object({
  schemaVersion: z.number().int().min(1),
  general: z.object({
    launchBehavior: z.string(),
    startMinimized: z.boolean(),
    restoreLastPage: z.boolean(),
    restoreQueue: z.boolean(),
    language: z.string(),
    checkForUpdates: z.boolean(),
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
    eqBassDb: z.number().min(-12).max(12).default(0),
    eqMidDb: z.number().min(-12).max(12).default(0),
    eqTrebleDb: z.number().min(-12).max(12).default(0),
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
    restoreLastPage: true,
    restoreQueue: true,
    language: "system",
    checkForUpdates: false,
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
