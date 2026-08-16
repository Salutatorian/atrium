import { useEffect, useState } from "react";
import { useShellStore } from "../stores/shell-store";

const IDLE_MS = 2800;

function chromeIsBusy(): boolean {
  if (useShellStore.getState().inspectorOpen) return true;
  if (document.querySelector(".player-more-menu")) return true;
  const active = document.activeElement;
  if (
    active instanceof HTMLElement &&
    active.closest(".player-bar, .context-drawer, .visualizer-stage__chrome") &&
    active.matches("button, input, [role='menuitem'], [role='tab']")
  ) {
    return true;
  }
  return false;
}

/** Dim player chrome after idle; stay awake while menus / drawers / focus are busy. */
export function useVisualizerChrome(active: boolean): boolean {
  const [idle, setIdle] = useState(false);
  const inspectorOpen = useShellStore((s) => s.inspectorOpen);

  useEffect(() => {
    if (!active) return;

    let timer = 0;
    let volumeDrag = false;

    const busy = () => volumeDrag || chromeIsBusy();

    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (busy()) {
          setIdle(false);
          schedule();
          return;
        }
        setIdle(true);
      }, IDLE_MS);
    };

    const bump = () => {
      setIdle(false);
      schedule();
    };

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement &&
        target.type === "range" &&
        target.closest(".player-bar")
      ) {
        volumeDrag = true;
      }
      bump();
    };

    const onPointerUp = () => {
      volumeDrag = false;
      bump();
    };

    schedule();
    window.addEventListener("pointermove", bump);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("keydown", bump);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointermove", bump);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("keydown", bump);
    };
  }, [active, inspectorOpen]);

  return active && idle;
}
