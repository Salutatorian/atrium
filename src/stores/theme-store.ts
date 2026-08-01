import { create } from "zustand";
import { getThemeById, mistTheme } from "../features/themes/presets";
import {
  themeToCssVariables,
  type ThemeDocument,
  validateThemeDocument,
} from "../features/themes/schema";

type ThemeState = {
  theme: ThemeDocument;
  previewTheme: ThemeDocument | null;
  setTheme: (theme: ThemeDocument) => void;
  setThemeById: (id: string) => void;
  setPreviewTheme: (theme: ThemeDocument | null) => void;
  activeTheme: () => ThemeDocument;
  applyToDocument: () => void;
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: mistTheme,
  previewTheme: null,
  setTheme: (theme) => {
    const validated = validateThemeDocument(theme);
    set({ theme: validated, previewTheme: null });
    get().applyToDocument();
  },
  setThemeById: (id) => {
    const found = getThemeById(id);
    if (found) {
      get().setTheme(found);
    }
  },
  setPreviewTheme: (theme) => {
    set({ previewTheme: theme ? validateThemeDocument(theme) : null });
    get().applyToDocument();
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
  },
}));
