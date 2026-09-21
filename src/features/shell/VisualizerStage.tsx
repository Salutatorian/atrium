import { MilkdropCanvas } from "../visualizer/MilkdropCanvas";
import { useSettingsStore } from "../../stores/settings-store";
import { useReducedMotion } from "../../hooks/use-reduced-motion";
import { cn } from "../../utils/cn";
import { setOsFullscreen, toggleOsFullscreen } from "./window-fullscreen";

export function VisualizerStage() {
  const patchAppearance = useSettingsStore((s) => s.patchAppearance);
  const showVignette = useSettingsStore(
    (s) => s.settings.appearance.visualizerVignette,
  );
  const showGrain = useSettingsStore(
    (s) => s.settings.appearance.visualizerGrain,
  );
  const reducedMotion = useReducedMotion();

  const exit = () => {
    void setOsFullscreen(false);
    void patchAppearance({ shellMode: "normal" });
  };

  return (
    <section
      className={cn(
        "visualizer-stage",
        showVignette && "visualizer-stage--vignette",
        showGrain && "visualizer-stage--grain",
      )}
      aria-label="Visualizer"
    >
      <MilkdropCanvas reducedMotion={reducedMotion} />

      <div className="visualizer-stage__chrome">
        <p
          className={cn(
            "visualizer-stage__hint",
            !reducedMotion && "visualizer-stage__hint--auto",
          )}
        >
          Esc to exit · F11 fullscreen
        </p>
        <button
          type="button"
          className="visualizer-stage__fullscreen"
          aria-label="Toggle fullscreen"
          onClick={() => {
            void toggleOsFullscreen();
          }}
        >
          <FullscreenGlyph />
        </button>
        <button
          type="button"
          className="visualizer-stage__exit"
          aria-label="Exit visualizer"
          onClick={exit}
        >
          <ExitGlyph />
        </button>
      </div>
    </section>
  );
}

function FullscreenGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M8 4H4v4M16 4h4v4M8 20H4v-4M16 20h4v-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ExitGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  );
}
