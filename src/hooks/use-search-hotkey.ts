import { useEffect } from "react";
import { matchShortcutAction } from "../features/shortcuts/catalog";
import { useShellStore } from "../stores/shell-store";

/** Ctrl/Cmd+F opens Search (layout-stable via KeyF). */
export function useSearchHotkey() {
  const setActiveNav = useShellStore((s) => s.setActiveNav);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!matchShortcutAction(event, "search")) return;
      event.preventDefault();
      setActiveNav("search");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setActiveNav]);
}
