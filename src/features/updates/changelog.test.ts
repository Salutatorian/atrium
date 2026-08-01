import { describe, expect, it } from "vitest";
import {
  UPDATE_KIND_LABEL,
  UPDATE_RELEASES,
  latestRelease,
} from "./changelog";

describe("changelog", () => {
  it("keeps newest release first with stable ids", () => {
    expect(UPDATE_RELEASES.length).toBeGreaterThan(0);
    const latest = latestRelease();
    expect(latest?.id).toBe(UPDATE_RELEASES[0]?.id);
    const ids = UPDATE_RELEASES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only uses labeled change kinds", () => {
    for (const release of UPDATE_RELEASES) {
      for (const change of release.changes) {
        expect(UPDATE_KIND_LABEL[change.kind]).toBeTruthy();
        expect(change.text.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
