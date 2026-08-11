import { describe, expect, it } from "vitest";
import {
  defaultSettings,
  safeParseSettings,
  validateSettings,
} from "./schema";

describe("settings schema", () => {
  it("accepts default settings", () => {
    expect(validateSettings(defaultSettings).schemaVersion).toBe(1);
  });

  it("rejects invalid volume", () => {
    const result = safeParseSettings({
      ...defaultSettings,
      playback: {
        ...defaultSettings.playback,
        defaultVolume: 1.4,
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid density", () => {
    const result = safeParseSettings({
      ...defaultSettings,
      appearance: {
        ...defaultSettings.appearance,
        density: "huge",
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects inspector width outside bounds", () => {
    const result = safeParseSettings({
      ...defaultSettings,
      appearance: {
        ...defaultSettings.appearance,
        inspectorWidth: 100,
      },
    });
    expect(result.success).toBe(false);
  });

  it("accepts shell modes and player bar styles", () => {
    const settings = validateSettings({
      ...defaultSettings,
      appearance: {
        ...defaultSettings.appearance,
        shellMode: "immersive",
        playerBarStyle: "full-width",
      },
    });
    expect(settings.appearance.shellMode).toBe("immersive");
    expect(settings.appearance.playerBarStyle).toBe("full-width");
  });

  it("rejects invalid shell mode", () => {
    const result = safeParseSettings({
      ...defaultSettings,
      appearance: {
        ...defaultSettings.appearance,
        shellMode: "cinema",
      },
    });
    expect(result.success).toBe(false);
  });

  it("accepts playback DSP fields", () => {
    const settings = validateSettings({
      ...defaultSettings,
      playback: {
        ...defaultSettings.playback,
        replayGainMode: "track",
        preampDb: -1.5,
        eqEnabled: true,
        eqBassDb: 2,
        eqBands: [2, 1.5, 1, 0, 0, 0, 0, 0.5, 1, 1],
        eqQ: 1.2,
        eqPresetId: "bass-boost",
        crossfadeEnabled: true,
        crossfadeSeconds: 4,
      },
    });
    expect(settings.playback.replayGainMode).toBe("track");
    expect(settings.playback.crossfadeSeconds).toBe(4);
    expect(settings.playback.eqBands).toHaveLength(10);
    expect(settings.playback.eqQ).toBe(1.2);
  });

  it("fills default eq bands when missing", () => {
    const { eqBands: _omit, ...playbackRest } = defaultSettings.playback;
    const settings = validateSettings({
      ...defaultSettings,
      playback: playbackRest,
    });
    expect(settings.playback.eqBands).toEqual([
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ]);
  });

  it("rejects invalid replay gain mode", () => {
    const result = safeParseSettings({
      ...defaultSettings,
      playback: {
        ...defaultSettings.playback,
        replayGainMode: "loud",
      },
    });
    expect(result.success).toBe(false);
  });
});
