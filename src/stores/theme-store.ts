import { create } from "zustand";
import {
  loadCustomThemes,
  saveCustomThemes,
  upsertCustomTheme,
} from "../features/themes/io";
import { getThemeById, mistTheme } from "../features/themes/presets";
import {
  themeToCssVariables,
  type ThemeDocument,
  validateThemeDocument,
} from "../features/themes/schema";

type ThemeState = {
  theme: ThemeDocument;
  previewTheme: ThemeDocument | null;
  customThemes: ThemeDocument[];
  setTheme: (theme: ThemeDocument) => void;
  setThemeById: (id: string) => void;
  setPreviewTheme: (theme: ThemeDocument | null) => void;
  saveCustomTheme: (theme: ThemeDocument) => void;
  removeCustomTheme: (id: string) => void;
  resolveTheme: (id: string) => ThemeDocument | undefined;
  activeTheme: () => ThemeDocument;
  applyToDocument: () => void;
  hydrateCustomThemes: () => void;
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: mistTheme,
  previewTheme: null,
  customThemes: [],
  hydrateCustomThemes: () => {
    set({ customThemes: loadCustomThemes() });
  },
  resolveTheme: (id) => {
    const builtin = getThemeById(id);
    if (builtin) return builtin;
    return get().customThemes.find((theme) => theme.id === id);
  },
  setTheme: (theme) => {
    const validated = validateThemeDocument(theme);
    set({ theme: validated, previewTheme: null });
    get().applyToDocument();
  },
  setThemeById: (id) => {
    const found = get().resolveTheme(id);
    if (found) {
      get().setTheme(found);
    }
  },
  setPreviewTheme: (theme) => {
    set({ previewTheme: theme ? validateThemeDocument(theme) : null });
    get().applyToDocument();
  },
  saveCustomTheme: (theme) => {
    const next = upsertCustomTheme(get().customThemes, theme);
    saveCustomThemes(next);
    set({ customThemes: next });
    get().setTheme(theme);
  },
  removeCustomTheme: (id) => {
    const next = get().customThemes.filter((theme) => theme.id !== id);
    saveCustomThemes(next);
    set({ customThemes: next });
    if (get().theme.id === id) {
      get().setTheme(mistTheme);
    }
  },
  activeTheme: () => get().previewTheme ?? get().theme,
  applyToDocument: () => {
    if (typeof document === "undefined") return;
    const theme = get().activeTheme();
    const vars = themeToCssVariables(theme);
    const root = document.documentElement;
    for (const [key, value] of Object.entries(vars)) {
      root.style.setProperty(key, value);
    }
    root.dataset.themeBase = theme.base;
    root.dataset.themeId = theme.id;
    root.dataset.bgMode = theme.background.mode;
  },
}));
