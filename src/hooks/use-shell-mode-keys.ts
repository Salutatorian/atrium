import { useEffect } from "react";
import { useSettingsStore } from "../stores/settings-store";

/** Esc returns from immersive / mini modes. */
export function useShellModeKeys() {
  const shellMode = useSettingsStore((s) => s.settings.appearance.shellMode);
  const patchAppearance = useSettingsStore((s) => s.patchAppearance);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.code !== "Escape") return;
      if (shellMode === "normal") return;
      event.preventDefault();
      void patchAppearance({ shellMode: "normal" });
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [patchAppearance, shellMode]);
}
