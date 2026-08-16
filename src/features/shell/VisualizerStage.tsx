import { ArtworkImage } from "../library/ArtworkImage";
import { VisualizerCanvas } from "../visualizer/VisualizerCanvas";
import { usePlayerStore } from "../../stores/player-store";
import { useSettingsStore } from "../../stores/settings-store";
import { useReducedMotion } from "../../hooks/use-reduced-motion";
import { cn } from "../../utils/cn";
import { setOsFullscreen, toggleOsFullscreen } from "./window-fullscreen";

export function VisualizerStage() {
  const current = usePlayerStore((s) => s.current);
  const patchAppearance = useSettingsStore((s) => s.patchAppearance);
  const overlayMode = useSettingsStore(
    (s) => s.settings.appearance.visualizerOverlay,
  );
  const showVignette = useSettingsStore(
    (s) => s.settings.appearance.visualizerVignette,
  );
  const showGrain = useSettingsStore(
    (s) => s.settings.appearance.visualizerGrain,
  );
  const reducedMotion = useReducedMotion();
  const trackKey = `${current?.trackId ?? 0}:${current?.title ?? ""}`;

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
      <VisualizerCanvas variant="stage" reducedMotion={reducedMotion} />

      {overlayMode !== "never" ? (
        <div
          key={overlayMode === "always" ? "overlay-always" : trackKey}
          className={cn(
            "visualizer-stage__overlay",
            overlayMode === "track-change" &&
              !reducedMotion &&
              "visualizer-stage__overlay--flash",
          )}
          aria-live="polite"
        >
          <ArtworkImage
            className="visualizer-stage__overlay-art"
            cacheKey={current?.artworkCacheKey}
            alt=""
          />
          <div className="visualizer-stage__overlay-meta">
            <p className="visualizer-stage__overlay-title">
              {current?.title || "Nothing playing"}
            </p>
            <p className="visualizer-stage__overlay-artist">
              {current?.artist || "Choose a song"}
            </p>
          </div>
        </div>
      ) : null}

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
