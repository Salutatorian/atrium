import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauriRuntime } from "../../services/tauri";

export async function isOsFullscreen(): Promise<boolean> {
  if (!isTauriRuntime()) return false;
  return getCurrentWindow().isFullscreen();
}

export async function setOsFullscreen(on: boolean): Promise<void> {
  if (!isTauriRuntime()) return;
  await getCurrentWindow().setFullscreen(on);
}

export async function toggleOsFullscreen(): Promise<boolean> {
  const next = !(await isOsFullscreen());
  await setOsFullscreen(next);
  return next;
}
