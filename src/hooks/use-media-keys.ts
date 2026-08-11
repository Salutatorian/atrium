import { useEffect } from "react";
import {
  playerNext,
  playerPrevious,
  playerToggle,
} from "../features/player/api";
import { matchShortcutAction } from "../features/shortcuts/catalog";
import { usePlayerStore } from "../stores/player-store";

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || el.isContentEditable;
}

/** Window-focused media key / transport shortcuts. */
export function useMediaKeys() {
  const applySnapshot = usePlayerStore((s) => s.applySnapshot);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return;

      if (matchShortcutAction(event, "play-pause")) {
        event.preventDefault();
        void playerToggle().then(applySnapshot);
        return;
      }
      if (matchShortcutAction(event, "next")) {
        event.preventDefault();
        void playerNext().then(applySnapshot);
        return;
      }
      if (matchShortcutAction(event, "previous")) {
        event.preventDefault();
        void playerPrevious().then(applySnapshot);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [applySnapshot]);
}
