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
  patchLyrics: (patch: Partial<AppSettings["lyrics"]>) => Promise<void>;
  patchPrivacy: (patch: Partial<AppSettings["privacy"]>) => Promise<void>;
  hydrate: (settings: AppSettings) => void;
};

async function persistPatch(
  set: (partial: Partial<SettingsState>) => void,
  next: AppSettings,
) {
  const validated = validateSettings(next);
  set({ settings: validated });
  if (isTauriRuntime()) {
    await persistSettings(validated);
  }
}

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
    await persistPatch(set, {
      ...get().settings,
      appearance: {
        ...get().settings.appearance,
        ...patch,
      },
    });
  },
  patchLyrics: async (patch) => {
    await persistPatch(set, {
      ...get().settings,
      lyrics: {
        ...get().settings.lyrics,
        ...patch,
      },
    });
  },
  patchPrivacy: async (patch) => {
    await persistPatch(set, {
      ...get().settings,
      privacy: {
        ...get().settings.privacy,
        ...patch,
      },
    });
  },
}));
