import { describe, expect, it } from "vitest";
import { mistTheme } from "./presets";
import {
  parseThemeFileText,
  sanitizeBackgroundPath,
  themeToFileName,
  upsertCustomTheme,
} from "./io";

describe("theme io", () => {
  it("parses a valid theme file", () => {
    const text = JSON.stringify(mistTheme);
    expect(parseThemeFileText(text).id).toBe("atrium-mist");
  });

  it("rejects invalid kind", () => {
    expect(() =>
      parseThemeFileText(JSON.stringify({ ...mistTheme, kind: "nope" })),
    ).toThrow(/validation|kind/i);
  });

  it("rejects path traversal in backgrounds", () => {
    expect(() => sanitizeBackgroundPath("../secret.png")).toThrow();
  });

  it("builds export file names", () => {
    expect(themeToFileName(mistTheme)).toBe("atrium-mist.atrium-theme.json");
  });

  it("upserts custom themes by id", () => {
    const first = upsertCustomTheme([], {
      ...mistTheme,
      id: "custom-mist",
      name: "Mist custom",
    });
    const second = upsertCustomTheme(first, {
      ...mistTheme,
      id: "custom-mist",
      name: "Mist custom 2",
    });
    expect(second).toHaveLength(1);
    expect(second[0]?.name).toBe("Mist custom 2");
  });
});
