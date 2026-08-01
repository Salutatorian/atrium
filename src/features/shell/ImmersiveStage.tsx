import { ArtworkImage } from "../library/ArtworkImage";
import { usePlayerStore } from "../../stores/player-store";
import { useSettingsStore } from "../../stores/settings-store";

export function ImmersiveStage() {
  const current = usePlayerStore((s) => s.current);
  const patchAppearance = useSettingsStore((s) => s.patchAppearance);

  return (
    <section className="immersive-stage" aria-label="Immersive listening">
      <button
        type="button"
        className="immersive-stage__exit"
        onClick={() => {
          void patchAppearance({ shellMode: "normal" });
        }}
      >
        Exit immersive
      </button>
      <div className="immersive-stage__art-wrap">
        <ArtworkImage
          className="immersive-stage__art"
          cacheKey={current?.artworkCacheKey}
          alt=""
        />
      </div>
      <div className="immersive-stage__meta">
        <h1 className="immersive-stage__title">
          {current?.title || "Nothing playing"}
        </h1>
        <p className="immersive-stage__artist">
          {current?.artist || "Choose a song to fill the room"}
        </p>
        <p className="immersive-stage__hint">Press Esc to return</p>
      </div>
    </section>
  );
}
