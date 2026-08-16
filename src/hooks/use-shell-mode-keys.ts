import { useEffect } from "react";
import { useSettingsStore } from "../stores/settings-store";
import { useShellStore } from "../stores/shell-store";
import { isVisualizerShell } from "../features/shell/mode";
import { setOsFullscreen, toggleOsFullscreen } from "../features/shell/window-fullscreen";

/** Esc returns from visualizer / mini. F11 toggles OS fullscreen in Visualizer Mode. */
export function useShellModeKeys() {
  const shellMode = useSettingsStore((s) => s.settings.appearance.shellMode);
  const patchAppearance = useSettingsStore((s) => s.patchAppearance);

  useEffect(() => {
    if (!isVisualizerShell(shellMode)) return;
    return () => {
      void setOsFullscreen(false);
    };
  }, [shellMode]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.code === "F11" && isVisualizerShell(shellMode)) {
        event.preventDefault();
        void toggleOsFullscreen();
        return;
      }

      if (event.code !== "Escape") return;
      if (shellMode === "normal") return;
      if (event.defaultPrevented) return;
      if (useShellStore.getState().inspectorOpen) return;
      if (useShellStore.getState().nowPlayingOpen) return;
      if (document.querySelector(".player-more-menu")) return;
      event.preventDefault();
      void setOsFullscreen(false);
      void patchAppearance({ shellMode: "normal" });
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [patchAppearance, shellMode]);
}
