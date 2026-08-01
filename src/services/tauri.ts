import { invoke } from "@tauri-apps/api/core";
import type { AppSettings } from "../features/settings/schema";

export type AppInfo = {
  name: string;
  appId: string;
  version: string;
  dataDir: string;
  phase: string;
};

/** Detect whether we are running inside the Tauri webview. */
export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function fetchAppInfo(): Promise<AppInfo> {
  if (!isTauriRuntime()) {
    return {
      name: "Atrium",
      appId: "com.atrium.player",
      version: "0.1.0",
      dataDir: "(browser preview)",
      phase: "6-advanced",
    };
  }
  return invoke<AppInfo>("get_app_info");
}

export async function fetchSettings(): Promise<AppSettings> {
  return invoke<AppSettings>("get_settings");
}

export async function persistSettings(settings: AppSettings): Promise<AppSettings> {
  return invoke<AppSettings>("update_settings", { settings });
}
