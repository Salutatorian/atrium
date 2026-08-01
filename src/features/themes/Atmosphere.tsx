import { useEffect, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { artworkSrc } from "../library/api";
import { isTauriRuntime } from "../../services/tauri";
import { usePlayerStore } from "../../stores/player-store";
import { useThemeStore } from "../../stores/theme-store";
import { cn } from "../../utils/cn";

function usesAlbumBackground(mode: string): boolean {
  return (
    mode === "album-art" ||
    mode === "blurred-album-art" ||
    mode === "album-gradient" ||
    mode === "ambient"
  );
}

export function Atmosphere() {
  const theme = useThemeStore((s) => s.activeTheme());
  const artworkKey = usePlayerStore((s) => s.current?.artworkCacheKey);
  const mode = theme.background.mode;
  const needsAlbum = usesAlbumBackground(mode);
  const [albumSrc, setAlbumSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!needsAlbum) return;

    let cancelled = false;
    void artworkSrc(artworkKey).then((src) => {
      if (!cancelled) setAlbumSrc(src);
    });

    return () => {
      cancelled = true;
    };
  }, [artworkKey, needsAlbum]);

  const userSrc =
    mode === "user-image" && theme.background.imagePath && isTauriRuntime()
      ? convertFileSrc(theme.background.imagePath)
      : null;

  const imageSrc = mode === "user-image" ? userSrc : needsAlbum ? albumSrc : null;

  return (
    <div
      className={cn("app-atmosphere", `app-atmosphere--${mode}`)}
      aria-hidden="true"
      data-bg-mode={mode}
    >
      <div className="app-atmosphere__wash" />
      {imageSrc ? (
        <div
          className={cn(
            "app-atmosphere__image",
            mode === "blurred-album-art" && "app-atmosphere__image--blurred",
            mode === "ambient" && "app-atmosphere__image--ambient",
          )}
          style={{ backgroundImage: `url("${imageSrc}")` }}
        />
      ) : null}
      <div className="app-atmosphere__overlay" />
      <div className="app-atmosphere__grain" />
      <div className="app-atmosphere__vignette" />
    </div>
  );
}
