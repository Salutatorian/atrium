import { create } from "zustand";
import {
  defaultSettings,
  type AppSettings,
  validateSettings,
} from "../features/settings/schema";
import { isTauriRuntime, persistSettings } from "../services/tauri";

type SettingsState = {
  settings: AppSettings;
  hydrated: boolean;
  setSettings: (settings: AppSettings) => void;
  patchAppearance: (
    patch: Partial<AppSettings["appearance"]>,
  ) => Promise<void>;
  hydrate: (settings: AppSettings) => void;
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: defaultSettings,
  hydrated: false,
  hydrate: (settings) => {
    set({ settings: validateSettings(settings), hydrated: true });
  },
  setSettings: (settings) => {
    set({ settings: validateSettings(settings) });
  },
  patchAppearance: async (patch) => {
    const next = validateSettings({
      ...get().settings,
      appearance: {
        ...get().settings.appearance,
        ...patch,
      },
    });
    set({ settings: next });
    if (isTauriRuntime()) {
      await persistSettings(next);
    }
  },
}));
