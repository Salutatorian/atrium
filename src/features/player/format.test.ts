import { describe, expect, it } from "vitest";
import { formatPlaybackTime } from "./format";

describe("formatPlaybackTime", () => {
  it("formats common durations", () => {
    expect(formatPlaybackTime(0)).toBe("0:00");
    expect(formatPlaybackTime(65_000)).toBe("1:05");
    expect(formatPlaybackTime(3_661_000)).toBe("1:01:01");
  });

  it("formats multi-hour tracks", () => {
    expect(formatPlaybackTime(7_200_000)).toBe("2:00:00");
    expect(formatPlaybackTime(86_400_000)).toBe("24:00:00");
  });

  it("handles missing values", () => {
    expect(formatPlaybackTime(null)).toBe("0:00");
    expect(formatPlaybackTime(undefined)).toBe("0:00");
  });
});
