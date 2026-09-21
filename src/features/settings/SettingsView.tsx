import { useEffect, useRef, useState, type ReactNode } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  APP_DESCRIPTION,
  APP_GITHUB_ISSUES_URL,
  APP_GITHUB_URL,
  APP_NAME,
  DONATE_AMOUNTS,
} from "../../app/brand";
import { BrandLogo } from "../../app/shell/BrandLogo";
import { IconClose, IconHelp } from "../../components/icons";
import { Tooltip } from "../../components/Tooltip";
import { useShellStore } from "../../stores/shell-store";
import { isTauriRuntime } from "../../services/tauri";
import {
  APP_FONTS,
  DEFAULT_HEADING_FONT_ID,
  DEFAULT_UI_FONT_ID,
} from "../themes/font-catalog";
import { VISUALIZER_PRESETS } from "../visualizer/catalog";
import { STAGE_SCENES } from "../visualizer/stage-catalog";
import {
  bandsMatchPreset,
  EQ_FREQUENCY_LABELS,
  EQ_PRESETS,
  getEqPreset,
  normalizeEqBands,
} from "../audio/eq-presets";
import { getShortcutCatalog } from "../shortcuts/catalog";
import { ThemesStudio } from "../themes/ThemesStudio";
import { UpdatesShowcase } from "../updates/UpdatesShowcase";
import { checkForAppUpdate } from "../updates/update-service";
import { useSettingsStore } from "../../stores/settings-store";
import type { AppSettings } from "./schema";
import { cn } from "../../utils/cn";

type SettingsCategory =
  | "general"
  | "library"
  | "playback"
  | "audio"
  | "appearance"
  | "themes"
  | "lyrics"
  | "shortcuts"
  | "privacy"
  | "advanced"
  | "about";

const categories: { id: SettingsCategory; label: string }[] = [
  { id: "general", label: "General" },
  { id: "library", label: "Library" },
  { id: "playback", label: "Playback" },
  { id: "audio", label: "Audio" },
  { id: "appearance", label: "Appearance" },
  { id: "themes", label: "Themes" },
  { id: "lyrics", label: "Lyrics" },
  { id: "shortcuts", label: "Shortcuts" },
  { id: "privacy", label: "Privacy" },
  { id: "advanced", label: "Advanced" },
  { id: "about", label: "About" },
];

async function openExternal(url: string): Promise<void> {
  if (isTauriRuntime()) {
    await openUrl(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

function SettingHint({ text }: { text: string }) {
  return (
    <Tooltip label={text} side="top">
      <button
        type="button"
        className="settings-hint"
        aria-label="About this setting"
        onClick={(event) => event.preventDefault()}
        onMouseDown={(event) => event.preventDefault()}
      >
        <IconHelp />
      </button>
    </Tooltip>
  );
}

function FieldLabel({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: string;
}) {
  return (
    <span className="settings-field__label">
      {children}
      {hint ? <SettingHint text={hint} /> : null}
    </span>
  );
}

export function SettingsWindow() {
  const open = useShellStore((s) => s.settingsOpen);
  const closeSettings = useShellStore((s) => s.closeSettings);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    dialogRef.current?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      closeSettings();
    }

    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [open, closeSettings]);

  if (!open) return null;

  return (
    <div
      className="settings-window-scrim"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeSettings();
      }}
    >
      <div
        ref={dialogRef}
        className="settings-window"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-window-title"
        tabIndex={-1}
      >
        <header className="settings-window__header">
          <h1 id="settings-window-title" className="settings-window__title">
            Settings
          </h1>
          <button
            type="button"
            className="settings-window__close"
            aria-label="Close settings"
            onClick={closeSettings}
          >
            <IconClose />
          </button>
        </header>
        <SettingsView />
      </div>
    </div>
  );
}

export function SettingsView() {
  const [category, setCategory] = useState<SettingsCategory>("general");

  return (
    <section className="settings-view settings-view--window" aria-label="Settings">
      <div className="settings-view__layout">
        <nav className="settings-nav" aria-label="Settings categories">
          {categories.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                "settings-nav__item",
                category === item.id && "settings-nav__item--active",
              )}
              aria-current={category === item.id ? "page" : undefined}
              onClick={() => setCategory(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="settings-view__panel">
          {category === "general" ? <GeneralSettings /> : null}
          {category === "library" ? <LibrarySettings /> : null}
          {category === "playback" ? <PlaybackSettings /> : null}
          {category === "audio" ? <AudioSettings /> : null}
          {category === "appearance" ? (
            <AppearanceSettings onOpenThemes={() => setCategory("themes")} />
          ) : null}
          {category === "themes" ? <ThemesStudio /> : null}
          {category === "lyrics" ? <LyricsSettings /> : null}
          {category === "shortcuts" ? <ShortcutsSettings /> : null}
          {category === "privacy" ? <PrivacySettings /> : null}
          {category === "advanced" ? <AdvancedSettings /> : null}
          {category === "about" ? <AboutSettings /> : null}
        </div>
      </div>
    </section>
  );
}

function GeneralSettings() {
  const settings = useSettingsStore((s) => s.settings);
  const patchGeneral = useSettingsStore((s) => s.patchGeneral);

  return (
    <div className="settings-stack">
      <h2 className="settings-section-title">General</h2>
      <label className="settings-field settings-field--checkbox">
        <span>Remember last song and position</span>
        <input
          type="checkbox"
          checked={settings.general.restoreQueue}
          onChange={(event) => {
            void patchGeneral({ restoreQueue: event.target.checked });
          }}
        />
      </label>
      <label className="settings-field settings-field--checkbox">
        <FieldLabel hint="The X button hides Atrium in the notification area. Right-click the tray icon to quit.">
          Close to system tray
        </FieldLabel>
        <input
          type="checkbox"
          checked={settings.general.closeToTray}
          onChange={(event) => {
            void patchGeneral({ closeToTray: event.target.checked });
          }}
        />
      </label>
      <label className="settings-field settings-field--checkbox">
        <span>Launch at login</span>
        <input
          type="checkbox"
          checked={settings.general.launchAtLogin}
          onChange={(event) => {
            void patchGeneral({ launchAtLogin: event.target.checked });
          }}
        />
      </label>
      <label className="settings-field settings-field--checkbox">
        <span>Check for updates</span>
        <input
          type="checkbox"
          checked={settings.general.checkForUpdates}
          onChange={(event) => {
            void patchGeneral({ checkForUpdates: event.target.checked });
          }}
        />
      </label>
      <label className="settings-field settings-field--checkbox">
        <FieldLabel hint="Downloads and installs on launch. The window may close briefly. Off shows Update / Cancel instead.">
          Install updates automatically
        </FieldLabel>
        <input
          type="checkbox"
          checked={settings.general.autoInstallUpdates}
          disabled={!settings.general.checkForUpdates}
          onChange={(event) => {
            void patchGeneral({ autoInstallUpdates: event.target.checked });
          }}
        />
      </label>
      <div className="settings-field">
        <button
          type="button"
          className="button-primary"
          disabled={!settings.general.checkForUpdates}
          onClick={() => {
            void checkForAppUpdate({ force: true });
          }}
        >
          Check now
        </button>
      </div>
    </div>
  );
}

function LibrarySettings() {
  return (
    <div className="settings-stack">
      <h2 className="settings-section-title">Library</h2>
      <p className="settings-note">
        Add folders from Library, or drop them on the window.
      </p>
    </div>
  );
}

function PlaybackSettings() {
  const settings = useSettingsStore((s) => s.settings);
  const patchPlayback = useSettingsStore((s) => s.patchPlayback);

  return (
    <div className="settings-stack">
      <h2 className="settings-section-title">Playback</h2>
      <label className="settings-field">
        <FieldLabel hint="Matches volume across songs (track) or keeps album dynamics (album).">
          ReplayGain
        </FieldLabel>
        <select
          value={settings.playback.replayGainMode}
          onChange={(event) => {
            void patchPlayback({
              replayGainMode: event.target
                .value as AppSettings["playback"]["replayGainMode"],
            });
          }}
        >
          <option value="off">Off</option>
          <option value="track">Track</option>
          <option value="album">Album</option>
        </select>
      </label>
      <label className="settings-field">
        <FieldLabel hint="Boost or cut overall level. Lower it if boosting clips.">
          Preamp ({settings.playback.preampDb.toFixed(1)} dB)
        </FieldLabel>
        <input
          type="range"
          min={-12}
          max={12}
          step={0.5}
          value={settings.playback.preampDb}
          onChange={(event) => {
            void patchPlayback({ preampDb: Number(event.target.value) });
          }}
        />
      </label>
      <label className="settings-field settings-field--checkbox">
        <span>Crossfade on track change</span>
        <input
          type="checkbox"
          checked={settings.playback.crossfadeEnabled}
          onChange={(event) => {
            void patchPlayback({ crossfadeEnabled: event.target.checked });
          }}
        />
      </label>
      <label className="settings-field">
        <span>Crossfade ({settings.playback.crossfadeSeconds}s)</span>
        <input
          type="range"
          min={0}
          max={12}
          step={1}
          value={settings.playback.crossfadeSeconds}
          disabled={!settings.playback.crossfadeEnabled}
          onChange={(event) => {
            void patchPlayback({
              crossfadeSeconds: Number(event.target.value),
            });
          }}
        />
      </label>
    </div>
  );
}

function AudioSettings() {
  const settings = useSettingsStore((s) => s.settings);
  const patchPlayback = useSettingsStore((s) => s.patchPlayback);
  const bands = normalizeEqBands(settings.playback.eqBands);
  const enabled = settings.playback.eqEnabled;

  function applyPreset(presetId: string) {
    const preset = getEqPreset(presetId);
    if (!preset) return;
    void patchPlayback({
      eqEnabled: true,
      eqPresetId: preset.id,
      eqBands: [...preset.bands],
      eqQ: preset.q,
      ...(preset.preampDb !== undefined ? { preampDb: preset.preampDb } : {}),
    });
  }

  function setBand(index: number, value: number) {
    const next = [...bands];
    next[index] = value;
    const matched = EQ_PRESETS.find(
      (p) => p.id !== "custom" && bandsMatchPreset(next, p),
    );
    void patchPlayback({
      eqBands: next,
      eqPresetId: matched?.id ?? "custom",
      eqEnabled: true,
    });
  }

  function resetFlat() {
    applyPreset("flat");
  }

  return (
    <div className="settings-stack settings-stack--eq">
      <h2 className="settings-section-title">Equalizer</h2>

      <label className="settings-field settings-field--checkbox">
        <span>Enable EQ</span>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => {
            void patchPlayback({ eqEnabled: event.target.checked });
          }}
        />
      </label>

      <label className="settings-field">
        <span>Preset</span>
        <select
          value={settings.playback.eqPresetId}
          disabled={!enabled && settings.playback.eqPresetId === "flat"}
          onChange={(event) => {
            const id = event.target.value;
            if (id === "custom") {
              void patchPlayback({ eqPresetId: "custom", eqEnabled: true });
              return;
            }
            applyPreset(id);
          }}
        >
          {EQ_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
          <option value="custom">Custom</option>
        </select>
      </label>

      <label className="settings-field">
        <FieldLabel hint="Boost or cut overall level. Lower it if boosting clips.">
          Preamp ({settings.playback.preampDb.toFixed(1)} dB)
        </FieldLabel>
        <input
          type="range"
          min={-12}
          max={12}
          step={0.5}
          value={settings.playback.preampDb}
          disabled={!enabled}
          onChange={(event) => {
            void patchPlayback({
              preampDb: Number(event.target.value),
              eqPresetId: "custom",
            });
          }}
        />
      </label>

      <label className="settings-field">
        <FieldLabel hint="Lower values affect a wider frequency range. Double-click a band to zero it.">
          Bandwidth / Q ({settings.playback.eqQ.toFixed(2)})
        </FieldLabel>
        <input
          type="range"
          min={0.3}
          max={4}
          step={0.05}
          value={settings.playback.eqQ}
          disabled={!enabled}
          onChange={(event) => {
            void patchPlayback({
              eqQ: Number(event.target.value),
              eqPresetId: "custom",
            });
          }}
        />
      </label>

      <div
        className={cn("eq-board", !enabled && "eq-board--disabled")}
        aria-label="10-band equalizer"
      >
        <div className="eq-board__scale" aria-hidden="true">
          <span>+12</span>
          <span>0</span>
          <span>−12</span>
        </div>
        <div className="eq-board__bands">
          {EQ_FREQUENCY_LABELS.map((label, index) => (
            <label key={label} className="eq-band">
              <span className="eq-band__value">
                {(bands[index] ?? 0) > 0 ? "+" : ""}
                {(bands[index] ?? 0).toFixed(1)}
              </span>
              <input
                type="range"
                className="eq-band__slider"
                min={-12}
                max={12}
                step={0.5}
                value={bands[index] ?? 0}
                disabled={!enabled}
                aria-label={`${label} Hz`}
                onChange={(event) => {
                  setBand(index, Number(event.target.value));
                }}
                onDoubleClick={() => setBand(index, 0)}
              />
              <span className="eq-band__freq">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="eq-board__actions">
        <button
          type="button"
          className="text-button"
          disabled={!enabled}
          onClick={resetFlat}
        >
          Reset to flat
        </button>
        <button
          type="button"
          className="text-button"
          disabled={!enabled}
          onClick={() => {
            void patchPlayback({
              eqBands: bands.map(() => 0),
              eqQ: 1,
              preampDb: 0,
              eqPresetId: "flat",
            });
          }}
        >
          Zero preamp + Q
        </button>
      </div>
    </div>
  );
}

function AppearanceSettings({
  onOpenThemes,
}: {
  onOpenThemes: () => void;
}) {
  const settings = useSettingsStore((s) => s.settings);
  const patchAppearance = useSettingsStore((s) => s.patchAppearance);

  return (
    <div className="settings-stack">
      <h2 className="settings-section-title">Appearance</h2>
      <label className="settings-field">
        <FieldLabel hint="Original is the cover list. Compact is one-line rows with no artwork. Spacious adds room.">
          Density
        </FieldLabel>
        <select
          value={settings.appearance.density}
          onChange={(event) => {
            void patchAppearance({
              density: event.target
                .value as AppSettings["appearance"]["density"],
            });
          }}
        >
          <option value="comfortable">Original</option>
          <option value="compact">Compact</option>
          <option value="spacious">Spacious</option>
        </select>
      </label>
      <label className="settings-field">
        <span>Player bar</span>
        <select
          value={settings.appearance.playerBarStyle}
          onChange={(event) => {
            void patchAppearance({
              playerBarStyle: event.target
                .value as AppSettings["appearance"]["playerBarStyle"],
            });
          }}
        >
          <option value="floating-pill">Floating</option>
          <option value="full-width">Full width</option>
        </select>
      </label>
      <label className="settings-field settings-field--checkbox">
        <FieldLabel hint="Tiny beat-reactive bars in the player. Click them to open Visualizer Mode.">
          Show soundbars
        </FieldLabel>
        <input
          type="checkbox"
          checked={settings.appearance.visualizerEnabled}
          onChange={(event) => {
            void patchAppearance({ visualizerEnabled: event.target.checked });
          }}
        />
      </label>
      <label className="settings-field">
        <span>Soundbar style</span>
        <select
          value={settings.appearance.visualizerStyle}
          disabled={!settings.appearance.visualizerEnabled}
          onChange={(event) => {
            void patchAppearance({
              visualizerStyle: event.target
                .value as AppSettings["appearance"]["visualizerStyle"],
            });
          }}
        >
          {VISUALIZER_PRESETS.filter((preset) => preset.id !== "off").map(
            (preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ),
          )}
        </select>
      </label>
      <label className="settings-field">
        <FieldLabel
          hint={
            STAGE_SCENES.find(
              (s) => s.id === settings.appearance.visualizerScene,
            )?.description ||
            "Background look for full-window Visualizer Mode."
          }
        >
          Visualizer scene
        </FieldLabel>
        <select
          value={settings.appearance.visualizerScene}
          onChange={(event) => {
            void patchAppearance({
              visualizerScene: event.target
                .value as AppSettings["appearance"]["visualizerScene"],
            });
          }}
        >
          {STAGE_SCENES.map((scene) => (
            <option key={scene.id} value={scene.id}>
              {scene.name}
            </option>
          ))}
        </select>
      </label>
      <label className="settings-field settings-field--checkbox">
        <span>Auto-hide controls in Visualizer Mode</span>
        <input
          type="checkbox"
          checked={settings.appearance.visualizerAutoHide}
          onChange={(event) => {
            void patchAppearance({ visualizerAutoHide: event.target.checked });
          }}
        />
      </label>
      <label className="settings-field settings-field--checkbox">
        <span>Hide cursor when controls fade</span>
        <input
          type="checkbox"
          checked={settings.appearance.visualizerHideCursor}
          onChange={(event) => {
            void patchAppearance({ visualizerHideCursor: event.target.checked });
          }}
        />
      </label>
      <label className="settings-field settings-field--checkbox">
        <span>Visualizer vignette</span>
        <input
          type="checkbox"
          checked={settings.appearance.visualizerVignette}
          onChange={(event) => {
            void patchAppearance({ visualizerVignette: event.target.checked });
          }}
        />
      </label>
      <label className="settings-field settings-field--checkbox">
        <span>Visualizer grain</span>
        <input
          type="checkbox"
          checked={settings.appearance.visualizerGrain}
          onChange={(event) => {
            void patchAppearance({ visualizerGrain: event.target.checked });
          }}
        />
      </label>
      <label className="settings-field">
        <FieldLabel hint="Visualizer fills the window. Mini is a compact player.">
          Window mode
        </FieldLabel>
        <select
          value={settings.appearance.shellMode}
          onChange={(event) => {
            void patchAppearance({
              shellMode: event.target
                .value as AppSettings["appearance"]["shellMode"],
            });
          }}
        >
          <option value="normal">Normal</option>
          <option value="visualizer">Visualizer</option>
          <option value="mini">Mini player</option>
        </select>
      </label>
      <label className="settings-field settings-field--checkbox">
        <span>Follow system light / dark</span>
        <input
          type="checkbox"
          checked={settings.appearance.followSystemTheme}
          onChange={(event) => {
            void patchAppearance({
              followSystemTheme: event.target.checked,
            });
          }}
        />
      </label>
      <label className="settings-field">
        <span>Reduced motion</span>
        <select
          value={settings.appearance.reducedMotion}
          onChange={(event) => {
            void patchAppearance({
              reducedMotion: event.target
                .value as AppSettings["appearance"]["reducedMotion"],
            });
          }}
        >
          <option value="system">Follow system</option>
          <option value="reduce">Always reduce</option>
          <option value="no-preference">Prefer motion</option>
        </select>
      </label>

      <h2 className="settings-section-title">Fonts</h2>
      <label className="settings-field">
        <FieldLabel hint="Google fonts download the first time you pick them.">
          UI font
        </FieldLabel>
        <select
          value={settings.appearance.uiFontId}
          onChange={(event) => {
            void patchAppearance({ uiFontId: event.target.value });
          }}
          style={{
            fontFamily:
              APP_FONTS.find((f) => f.id === settings.appearance.uiFontId)
                ?.stack ?? "inherit",
          }}
        >
          {APP_FONTS.map((font) => (
            <option key={font.id} value={font.id}>
              {font.name}
              {font.source === "system"
                ? " · system"
                : font.source === "bundled"
                  ? " · built-in"
                  : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="settings-field">
        <span>Heading font</span>
        <select
          value={settings.appearance.headingFontId}
          onChange={(event) => {
            void patchAppearance({ headingFontId: event.target.value });
          }}
          style={{
            fontFamily:
              APP_FONTS.find((f) => f.id === settings.appearance.headingFontId)
                ?.stack ?? "inherit",
          }}
        >
          {APP_FONTS.map((font) => (
            <option key={font.id} value={font.id}>
              {font.name}
              {font.source === "system"
                ? " · system"
                : font.source === "bundled"
                  ? " · built-in"
                  : ""}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="text-button"
        onClick={() => {
          void patchAppearance({
            uiFontId: DEFAULT_UI_FONT_ID,
            headingFontId: DEFAULT_HEADING_FONT_ID,
          });
        }}
      >
        Reset fonts to default
      </button>

      <div className="settings-theme-studio">
        <div className="settings-theme-studio__header">
          <h3>Theme Studio</h3>
          <button
            type="button"
            className="button-primary"
            onClick={onOpenThemes}
          >
            Open Themes
          </button>
        </div>
      </div>
    </div>
  );
}

function LyricsSettings() {
  const settings = useSettingsStore((s) => s.settings);
  const patchLyrics = useSettingsStore((s) => s.patchLyrics);

  return (
    <div className="settings-stack">
      <h2 className="settings-section-title">Lyrics</h2>
      <label className="settings-field settings-field--checkbox">
        <span>Prefer synchronized lyrics</span>
        <input
          type="checkbox"
          checked={settings.lyrics.preferSynchronized}
          onChange={(event) => {
            void patchLyrics({ preferSynchronized: event.target.checked });
          }}
        />
      </label>
      <label className="settings-field">
        <span>Lyrics font size ({settings.lyrics.fontSize}px)</span>
        <input
          type="range"
          min={12}
          max={40}
          step={1}
          value={settings.lyrics.fontSize}
          onChange={(event) => {
            void patchLyrics({ fontSize: Number(event.target.value) });
          }}
        />
      </label>
      <label className="settings-field">
        <span>Alignment</span>
        <select
          value={settings.lyrics.alignment}
          onChange={(event) => {
            void patchLyrics({
              alignment: event.target
                .value as AppSettings["lyrics"]["alignment"],
            });
          }}
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </label>
      <label className="settings-field">
        <FieldLabel hint="Shifts all synced lyrics earlier or later.">
          Global offset ({settings.lyrics.globalOffsetMs}ms)
        </FieldLabel>
        <input
          type="range"
          min={-5000}
          max={5000}
          step={50}
          value={settings.lyrics.globalOffsetMs}
          onChange={(event) => {
            void patchLyrics({ globalOffsetMs: Number(event.target.value) });
          }}
        />
      </label>
    </div>
  );
}

function ShortcutsSettings() {
  const groups = getShortcutCatalog();

  return (
    <div className="settings-stack settings-stack--shortcuts">
      <h2 className="settings-section-title">Shortcuts</h2>
      {groups.map((group) => (
        <div key={group.id} className="settings-shortcuts-group">
          <h3 className="settings-shortcuts-group__title">{group.title}</h3>
          <ul className="settings-shortcuts">
            {group.items.map((item) => (
              <li key={item.id}>
                <span className="settings-shortcuts__action">{item.action}</span>
                <span className="settings-shortcuts__keys">
                  {item.labels.map((chord, index) => (
                    <span key={`${item.id}-${index}`} className="settings-shortcuts__chord">
                      {index > 0 ? (
                        <span className="settings-shortcuts__or">or</span>
                      ) : null}
                      {chord.map((part) => (
                        <kbd key={`${item.id}-${index}-${part}`}>{part}</kbd>
                      ))}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function PrivacySettings() {
  const settings = useSettingsStore((s) => s.settings);
  const patchPrivacy = useSettingsStore((s) => s.patchPrivacy);

  return (
    <div className="settings-stack">
      <h2 className="settings-section-title">Privacy</h2>
      <label className="settings-field settings-field--checkbox">
        <span>Allow network access</span>
        <input
          type="checkbox"
          checked={settings.privacy.allowNetwork}
          onChange={(event) => {
            void patchPrivacy({ allowNetwork: event.target.checked });
          }}
        />
      </label>
      <label className="settings-field settings-field--checkbox">
        <FieldLabel hint="Also needs Allow network access.">
          Allow lyrics providers (LRCLIB)
        </FieldLabel>
        <input
          type="checkbox"
          checked={settings.privacy.allowLyricsProviders}
          onChange={(event) => {
            void patchPrivacy({ allowLyricsProviders: event.target.checked });
          }}
        />
      </label>
    </div>
  );
}

function AdvancedSettings() {
  return (
    <div className="settings-stack">
      <h2 className="settings-section-title">Advanced</h2>
    </div>
  );
}

function AboutSettings() {
  return (
    <div className="settings-stack settings-stack--about">
      <h2 className="settings-section-title">About</h2>
      <BrandLogo
        size="lg"
        decorative={false}
        className="settings-about-logo"
      />
      <p className="settings-note">
        {APP_NAME} — {APP_DESCRIPTION}
      </p>
      <div className="settings-about-actions">
        <button
          type="button"
          className="button-primary"
          onClick={() => {
            void openExternal(APP_GITHUB_URL);
          }}
        >
          Open GitHub
        </button>
        <button
          type="button"
          className="text-button"
          onClick={() => {
            void openExternal(APP_GITHUB_ISSUES_URL);
          }}
        >
          Report an issue
        </button>
      </div>
      <p className="settings-note settings-note--mono">
        {APP_GITHUB_URL.replace(/^https:\/\//, "")}
      </p>

      <h2 className="settings-section-title">What’s new</h2>
      <div className="settings-changelog">
        <UpdatesShowcase forceShow />
      </div>

      <h2 className="settings-section-title">
        Support {APP_NAME}
        <SettingHint text="Opens Stripe Checkout in your browser. Card details stay with Stripe." />
      </h2>
      <div className="settings-about-actions" role="group" aria-label="Donate">
        {DONATE_AMOUNTS.map((amount) => (
          <Tooltip key={amount.id} label={amount.tooltip} side="top">
            <button
              type="button"
              className="button-primary"
              onClick={() => {
                void openExternal(amount.url);
              }}
            >
              {amount.label}
            </button>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}
