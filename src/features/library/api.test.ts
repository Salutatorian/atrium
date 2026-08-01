import { describe, expect, it } from "vitest";
import { fileName, formatDuration, parentFolder } from "./api";

describe("library helpers", () => {
  it("formats durations", () => {
    expect(formatDuration(0)).toBe("—:—");
    expect(formatDuration(65_000)).toBe("1:05");
  });

  it("extracts parent folder and file name", () => {
    expect(parentFolder("C:\\Music\\Album\\track.mp3")).toBe("C:/Music/Album");
    expect(fileName("C:\\Music\\Album\\track.mp3")).toBe("track.mp3");
  });
});
