import { useEffect } from "react";

function paintRange(el: HTMLInputElement) {
  if (el.type !== "range") return;
  if (el.classList.contains("eq-band__slider")) return;
  const min = Number(el.min || 0);
  const max = Number(el.max || 100);
  const value = Number(el.value);
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;
  el.style.setProperty("--slider-progress", `${Math.min(100, Math.max(0, pct))}%`);
}

/** Keeps custom range tracks filled to the thumb as values change. */
export function useAtriumControls() {
  useEffect(() => {
    function onEvent(event: Event) {
      if (event.target instanceof HTMLInputElement) paintRange(event.target);
    }

    function paintAll() {
      document
        .querySelectorAll('input[type="range"]')
        .forEach((el) => paintRange(el as HTMLInputElement));
    }

    paintAll();
    document.addEventListener("input", onEvent, true);
    document.addEventListener("change", onEvent, true);
    const retry = window.setTimeout(paintAll, 0);
    return () => {
      window.clearTimeout(retry);
      document.removeEventListener("input", onEvent, true);
      document.removeEventListener("change", onEvent, true);
    };
  }, []);
}
