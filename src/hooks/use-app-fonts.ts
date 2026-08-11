import { useEffect } from "react";
import { applyAppFonts } from "../features/themes/font-catalog";
import { useSettingsStore } from "../stores/settings-store";
import { useThemeStore } from "../stores/theme-store";

/** Keep CSS font vars in sync with Settings (re-applies after theme changes). */
export function useAppFonts() {
  const uiFontId = useSettingsStore((s) => s.settings.appearance.uiFontId);
  const headingFontId = useSettingsStore(
    (s) => s.settings.appearance.headingFontId,
  );
  const themeId = useThemeStore((s) => s.activeTheme().id);
  const previewId = useThemeStore((s) => s.previewTheme?.id ?? null);

  useEffect(() => {
    applyAppFonts(uiFontId, headingFontId);
  }, [uiFontId, headingFontId, themeId, previewId]);
}
