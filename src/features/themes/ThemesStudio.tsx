import { useRef, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { THEME_FILE_EXTENSION } from "../../app/brand";
import { isTauriRuntime } from "../../services/tauri";
import { useSettingsStore } from "../../stores/settings-store";
import { useThemeStore } from "../../stores/theme-store";
import { cn } from "../../utils/cn";
import { builtinThemes } from "./presets";
import { exportThemeDownload, parseThemeFileText } from "./io";
import type { ThemeDocument } from "./schema";

const backgroundModes: ThemeDocument["background"]["mode"][] = [
  "gradient",
  "solid",
  "none",
  "album-art",
  "blurred-album-art",
  "album-gradient",
  "ambient",
  "user-image",
];

export function ThemesStudio() {
  const theme = useThemeStore((s) => s.theme);
  const customThemes = useThemeStore((s) => s.customThemes);
  const setTheme = useThemeStore((s) => s.setTheme);
  const setPreviewTheme = useThemeStore((s) => s.setPreviewTheme);
  const saveCustomTheme = useThemeStore((s) => s.saveCustomTheme);
  const removeCustomTheme = useThemeStore((s) => s.removeCustomTheme);
  const patchAppearance = useSettingsStore((s) => s.patchAppearance);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const catalog = [...builtinThemes, ...customThemes];

  function applyTheme(item: ThemeDocument) {
    setTheme(item);
    void patchAppearance({ themeId: item.id });
    setMessage(`Applied ${item.name}`);
    setError(null);
  }

  function patchBackground(
    patch: Partial<ThemeDocument["background"]>,
  ) {
    const next: ThemeDocument = {
      ...theme,
      id: theme.id.startsWith("custom-") ? theme.id : `custom-${theme.id}`,
      name: theme.id.startsWith("custom-") ? theme.name : `${theme.name} custom`,
      background: {
        ...theme.background,
        ...patch,
      },
    };
    saveCustomTheme(next);
    void patchAppearance({ themeId: next.id });
  }

  async function importFromText(text: string) {
    try {
      const imported = parseThemeFileText(text);
      const stamped: ThemeDocument = {
        ...imported,
        id: imported.id.startsWith("custom-")
          ? imported.id
          : `custom-${imported.id}`,
      };
      saveCustomTheme(stamped);
      void patchAppearance({ themeId: stamped.id });
      setMessage(`Imported “${stamped.name}”`);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setMessage(null);
    }
  }

  async function pickBackgroundImage() {
    if (!isTauriRuntime()) {
      setError("Background images require the desktop app");
      return;
    }
    const selected = await open({
      multiple: false,
      filters: [
        {
          name: "Images",
          extensions: ["png", "jpg", "jpeg", "webp", "gif"],
        },
      ],
    });
    if (typeof selected !== "string") return;
    patchBackground({ mode: "user-image", imagePath: selected });
    setMessage("Custom background image applied");
  }

  return (
    <section className="panel themes-panel" aria-label="Themes">
      <p className="panel__intro">
        Browse Atrium presets, tune the room atmosphere, and import or export
        theme files ({THEME_FILE_EXTENSION}).
      </p>

      <div className="themes-toolbar">
        <button
          type="button"
          className="button-primary"
          onClick={() => fileInputRef.current?.click()}
        >
          Import theme
        </button>
        <button
          type="button"
          onClick={() => {
            exportThemeDownload(theme);
            setMessage(`Exported ${theme.name}`);
          }}
        >
          Export current
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={`.json,.${THEME_FILE_EXTENSION},application/json`}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            void file.text().then(importFromText);
            event.target.value = "";
          }}
        />
      </div>

      {message ? <p className="themes-status">{message}</p> : null}
      {error ? <p className="themes-status themes-status--error">{error}</p> : null}

      <ul className="theme-grid">
        {catalog.map((item) => {
          const isCustom = !builtinThemes.some((theme) => theme.id === item.id);
          return (
            <li key={item.id}>
              <button
                type="button"
                className={cn(
                  "theme-card",
                  theme.id === item.id && "theme-card--active",
                )}
                onMouseEnter={() => setPreviewTheme(item)}
                onMouseLeave={() => setPreviewTheme(null)}
                onFocus={() => setPreviewTheme(item)}
                onBlur={() => setPreviewTheme(null)}
                onClick={() => applyTheme(item)}
              >
                <span
                  className="theme-card__swatch"
                  style={{
                    background: `linear-gradient(135deg, ${item.colors.appBackground}, ${item.colors.accent})`,
                  }}
                />
                <span className="theme-card__meta">
                  <span className="theme-card__name">{item.name}</span>
                  <span className="theme-card__desc">
                    {item.description || (isCustom ? "Custom theme" : item.base)}
                  </span>
                </span>
              </button>
              {isCustom ? (
                <button
                  type="button"
                  className="text-button theme-card__remove"
                  onClick={() => {
                    removeCustomTheme(item.id);
                    void patchAppearance({ themeId: "atrium-mist" });
                    setMessage(`Removed ${item.name}`);
                  }}
                >
                  Remove
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="theme-editor">
        <h2 className="theme-editor__title">Atmosphere</h2>
        <p className="theme-editor__hint">
          Edits save as a custom theme based on the current selection.
        </p>
        <div className="settings-stack">
          <label className="settings-field">
            <span>Background mode</span>
            <select
              value={theme.background.mode}
              onChange={(event) => {
                patchBackground({
                  mode: event.target
                    .value as ThemeDocument["background"]["mode"],
                });
              }}
            >
              {backgroundModes.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </label>
          <label className="settings-field">
            <span>Noise {Math.round(theme.background.noiseAmount * 100)}%</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={theme.background.noiseAmount}
              onChange={(event) => {
                patchBackground({ noiseAmount: Number(event.target.value) });
              }}
            />
          </label>
          <label className="settings-field">
            <span>
              Vignette {Math.round(theme.background.vignetteAmount * 100)}%
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={theme.background.vignetteAmount}
              onChange={(event) => {
                patchBackground({ vignetteAmount: Number(event.target.value) });
              }}
            />
          </label>
          <label className="settings-field">
            <span>
              Overlay {Math.round(theme.background.overlayOpacity * 100)}%
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={theme.background.overlayOpacity}
              onChange={(event) => {
                patchBackground({ overlayOpacity: Number(event.target.value) });
              }}
            />
          </label>
          <label className="settings-field">
            <span>Blur {theme.background.blur}px</span>
            <input
              type="range"
              min={0}
              max={64}
              step={1}
              value={theme.background.blur}
              onChange={(event) => {
                patchBackground({ blur: Number(event.target.value) });
              }}
            />
          </label>
          <label className="settings-field">
            <span>
              Motion {Math.round(theme.background.animationStrength * 100)}%
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={theme.background.animationStrength}
              onChange={(event) => {
                patchBackground({
                  animationStrength: Number(event.target.value),
                });
              }}
            />
          </label>
          <div className="themes-toolbar">
            <button type="button" onClick={() => void pickBackgroundImage()}>
              Choose background image
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
