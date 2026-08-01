import { useEffect } from "react";
import {
  playerNext,
  playerPrevious,
  playerToggle,
} from "../features/player/api";
import { usePlayerStore } from "../stores/player-store";

/** Window-focused media key / transport shortcuts. */
export function useMediaKeys() {
  const applySnapshot = usePlayerStore((s) => s.applySnapshot);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || target?.isContentEditable) {
        return;
      }

      switch (event.code) {
        case "Space":
        case "MediaPlayPause":
          event.preventDefault();
          void playerToggle().then(applySnapshot);
          break;
        case "MediaTrackNext":
          event.preventDefault();
          void playerNext().then(applySnapshot);
          break;
        case "MediaTrackPrevious":
          event.preventDefault();
          void playerPrevious().then(applySnapshot);
          break;
        default:
          break;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [applySnapshot]);
}
