import { useEffect } from "react";
import { useSettingsStore } from "../stores/settings-store";
import { useThemeStore } from "../stores/theme-store";

/** When enabled, map OS light/dark to Mist / Dusk presets. */
export function useSystemTheme() {
  const follow = useSettingsStore((s) => s.settings.appearance.followSystemTheme);
  const patchAppearance = useSettingsStore((s) => s.patchAppearance);
  const setThemeById = useThemeStore((s) => s.setThemeById);

  useEffect(() => {
    if (!follow || typeof window === "undefined") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");

    function apply(isDark: boolean) {
      const themeId = isDark ? "atrium-dusk" : "atrium-mist";
      setThemeById(themeId);
      void patchAppearance({ themeId });
    }

    apply(media.matches);

    function onChange(event: MediaQueryListEvent) {
      apply(event.matches);
    }

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [follow, patchAppearance, setThemeById]);
}
