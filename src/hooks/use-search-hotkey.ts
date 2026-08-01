import { useEffect } from "react";
import { useShellStore } from "../stores/shell-store";

/** Ctrl/Cmd+K opens Search. */
export function useSearchHotkey() {
  const setActiveNav = useShellStore((s) => s.setActiveNav);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() !== "k") return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        // Still allow Ctrl+K from inputs to jump to search.
      }
      event.preventDefault();
      setActiveNav("search");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setActiveNav]);
}
