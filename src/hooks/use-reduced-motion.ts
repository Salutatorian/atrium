import { useEffect, useState } from "react";
import { useSettingsStore } from "../stores/settings-store";

function systemPrefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useReducedMotion(): boolean {
  const setting = useSettingsStore((s) => s.settings.appearance.reducedMotion);
  const [systemReduce, setSystemReduce] = useState(systemPrefersReducedMotion);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setSystemReduce(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  if (setting === "reduce") return true;
  if (setting === "no-preference") return false;
  return systemReduce;
}
