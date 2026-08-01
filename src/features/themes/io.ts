import { THEME_FILE_EXTENSION, THEME_FILE_KIND } from "../../app/brand";
import {
  safeParseThemeDocument,
  type ThemeDocument,
  validateThemeDocument,
} from "./schema";

const CUSTOM_THEMES_KEY = "atrium.custom-themes";

export function sanitizeBackgroundPath(path: string | undefined): string | undefined {
  if (!path) return undefined;
  const normalized = path.replace(/\\/g, "/");
  if (normalized.includes("..") || normalized.startsWith("file:")) {
    throw new Error("Background path is not allowed");
  }
  return path;
}

export function prepareThemeForPersist(theme: ThemeDocument): ThemeDocument {
  const validated = validateThemeDocument(theme);
  return {
    ...validated,
    background: {
      ...validated.background,
      imagePath: sanitizeBackgroundPath(validated.background.imagePath),
    },
  };
}

export function parseThemeFileText(text: string): ThemeDocument {
  let json: unknown;
  try {
    json = JSON.parse(text) as unknown;
  } catch {
    throw new Error("Theme file is not valid JSON");
  }
  const parsed = safeParseThemeDocument(json);
  if (!parsed.success) {
    throw new Error("Theme file failed validation");
  }
  if (parsed.data.kind !== THEME_FILE_KIND) {
    throw new Error("Unsupported theme kind");
  }
  return prepareThemeForPersist(parsed.data);
}

export function themeToFileName(theme: ThemeDocument): string {
  const slug = theme.id.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();
  return `${slug}.${THEME_FILE_EXTENSION}`;
}

export function exportThemeDownload(theme: ThemeDocument): void {
  const payload = prepareThemeForPersist(theme);
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = themeToFileName(payload);
  anchor.click();
  URL.revokeObjectURL(url);
}

export function loadCustomThemes(): ThemeDocument[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_THEMES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => safeParseThemeDocument(item))
      .filter((result) => result.success)
      .map((result) => result.data);
  } catch {
    return [];
  }
}

export function saveCustomThemes(themes: ThemeDocument[]): void {
  if (typeof localStorage === "undefined") return;
  const prepared = themes.map(prepareThemeForPersist);
  localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(prepared));
}

export function upsertCustomTheme(
  themes: ThemeDocument[],
  theme: ThemeDocument,
): ThemeDocument[] {
  const next = prepareThemeForPersist(theme);
  const without = themes.filter((item) => item.id !== next.id);
  return [...without, next];
}
