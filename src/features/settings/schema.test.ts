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
});
