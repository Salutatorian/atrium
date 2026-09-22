import { describe, expect, it } from "vitest";
import { spectrumToTimeBytes, MILKDROP_WAVE_SIZE } from "./milkdrop-audio";
import { loadMilkdropPresets } from "./milkdrop-presets";
import { STAGE_SCENES } from "./stage-catalog";

describe("milkdrop scenes", () => {
  it("maps every scene to a real MilkDrop 2 preset", async () => {
    const presets = await loadMilkdropPresets();
    for (const scene of STAGE_SCENES) {
      expect(presets[scene.milkdrop], scene.milkdrop).toBeTruthy();
    }
  });
});

describe("spectrumToTimeBytes", () => {
  it("copies a real waveform window", () => {
    const waveform = Array.from({ length: MILKDROP_WAVE_SIZE }, (_, i) => i % 256);
    const bytes = spectrumToTimeBytes({
      bands: [0.2, 0.4],
      bass: 0.5,
      beat: 0,
      energy: 0.3,
      waveform,
    });
    expect(bytes.length).toBe(MILKDROP_WAVE_SIZE);
    expect(bytes[0]).toBe(0);
    expect(bytes[1]).toBe(1);
  });

  it("synthesizes a wave when PCM is missing", () => {
    const silent = spectrumToTimeBytes({
      bands: Array.from({ length: 48 }, () => 0),
      bass: 0,
      beat: 0,
      energy: 0,
    });
    expect(silent.length).toBe(MILKDROP_WAVE_SIZE);
    expect(silent[0]).toBe(128);
  });
});
