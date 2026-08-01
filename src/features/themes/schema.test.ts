import { describe, expect, it } from "vitest";
import { duskTheme, mistTheme } from "./presets";
import {
  safeParseThemeDocument,
  themeToCssVariables,
  validateThemeDocument,
} from "./schema";

describe("theme schema", () => {
  it("validates built-in mist and dusk themes", () => {
    expect(validateThemeDocument(mistTheme).id).toBe("atrium-mist");
    expect(validateThemeDocument(duskTheme).id).toBe("atrium-dusk");
  });

  it("rejects themes with the wrong kind", () => {
    const result = safeParseThemeDocument({
      ...mistTheme,
      kind: "other-theme",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required color tokens", () => {
    const colors = { ...mistTheme.colors };
    delete (colors as { accent?: string }).accent;
    const result = safeParseThemeDocument({
      ...mistTheme,
      colors,
    });
    expect(result.success).toBe(false);
  });

  it("maps tokens to CSS variables", () => {
    const vars = themeToCssVariables(mistTheme);
    expect(vars["--color-accent"]).toBe(mistTheme.colors.accent);
    expect(vars["--font-heading"]).toContain("Fraunces");
    expect(vars["--sidebar-width"]).toBe(`${mistTheme.appearance.sidebarWidth}px`);
    expect(vars["--bg-overlay"]).toBe(String(mistTheme.background.overlayOpacity));
    expect(vars["--bg-blur"]).toBe(`${mistTheme.background.blur}px`);
  });
});

