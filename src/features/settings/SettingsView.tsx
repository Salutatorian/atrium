import { useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  APP_DESCRIPTION,
  APP_GITHUB_ISSUES_URL,
  APP_GITHUB_URL,
  APP_NAME,
} from "../../app/brand";
import { isTauriRuntime } from "../../services/tauri";
import { ThemesStudio } from "../themes/ThemesStudio";
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

export function SettingsView() {
  const [category, setCategory] = useState<SettingsCategory>("themes");

  return (
    <section className="settings-view" aria-label="Settings">
      <h1 className="view-title">Settings</h1>
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
      <p className="settings-note">
        Desktop behavior for Windows, macOS, and Linux. Atrium stays offline-first
        and light enough for older machines.
      </p>
      <label className="settings-field settings-field--checkbox">
        <span>Close to system tray</span>
        <input
          type="checkbox"
          checked={settings.general.closeToTray}
          onChange={(event) => {
            void patchGeneral({ closeToTray: event.target.checked });
          }}
        />
      </label>
      <p className="settings-note">
        When on (default), the X button hides Atrium to the notification area
        instead of quitting. Right-click the tray icon → Quit Atrium to fully
        exit. Turn this off to quit on X.
      </p>
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
      <p className="settings-note">
        Start Atrium when you sign in to this computer. Works on Windows, macOS,
        and Linux. Off by default.
      </p>
    </div>
  );
}

function LibrarySettings() {
  return (
    <div className="settings-stack">
      <h2 className="settings-section-title">Library</h2>
      <p className="settings-note">
        Add folders from Library → Add music, or drop them onto the window.
        Atrium only indexes those locations — it never copies songs onto your
        computer. Rescan refreshes metadata for folders you already added.
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
        <span>ReplayGain</span>
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
        <span>Preamp ({settings.playback.preampDb.toFixed(1)} dB)</span>
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

  return (
    <div className="settings-stack">
      <h2 className="settings-section-title">Audio</h2>
      <label className="settings-field settings-field--checkbox">
        <span>3-band EQ</span>
        <input
          type="checkbox"
          checked={settings.playback.eqEnabled}
          onChange={(event) => {
            void patchPlayback({ eqEnabled: event.target.checked });
          }}
        />
      </label>
      <label className="settings-field">
        <span>Bass ({settings.playback.eqBassDb.toFixed(1)} dB)</span>
        <input
          type="range"
          min={-12}
          max={12}
          step={0.5}
          value={settings.playback.eqBassDb}
          disabled={!settings.playback.eqEnabled}
          onChange={(event) => {
            void patchPlayback({ eqBassDb: Number(event.target.value) });
          }}
        />
      </label>
      <label className="settings-field">
        <span>Mid ({settings.playback.eqMidDb.toFixed(1)} dB)</span>
        <input
          type="range"
          min={-12}
          max={12}
          step={0.5}
          value={settings.playback.eqMidDb}
          disabled={!settings.playback.eqEnabled}
          onChange={(event) => {
            void patchPlayback({ eqMidDb: Number(event.target.value) });
          }}
        />
      </label>
      <label className="settings-field">
        <span>Treble ({settings.playback.eqTrebleDb.toFixed(1)} dB)</span>
        <input
          type="range"
          min={-12}
          max={12}
          step={0.5}
          value={settings.playback.eqTrebleDb}
          disabled={!settings.playback.eqEnabled}
          onChange={(event) => {
            void patchPlayback({ eqTrebleDb: Number(event.target.value) });
          }}
        />
      </label>
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
        <span>Density</span>
        <select
          value={settings.appearance.density}
          onChange={(event) => {
            void patchAppearance({
              density: event.target
                .value as AppSettings["appearance"]["density"],
            });
          }}
        >
          <option value="compact">Compact</option>
          <option value="comfortable">Comfortable</option>
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
      <label className="settings-field">
        <span>Window mode</span>
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
          <option value="immersive">Immersive</option>
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

      <div className="settings-theme-studio">
        <div className="settings-theme-studio__header">
          <div>
            <h3>Theme Studio</h3>
            <p className="settings-note">
              100+ presets, import/export, and atmosphere controls.
            </p>
          </div>
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
        <span>Global offset ({settings.lyrics.globalOffsetMs}ms)</span>
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
  return (
    <div className="settings-stack">
      <h2 className="settings-section-title">Shortcuts</h2>
      <ul className="settings-shortcuts">
        <li>
          <kbd>Space</kbd> Play / pause
        </li>
        <li>
          <kbd>Ctrl</kbd> + <kbd>K</kbd> Search
        </li>
        <li>
          <kbd>Esc</kbd> Close drawer / now playing
        </li>
      </ul>
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
        <span>Allow lyrics providers (LRCLIB)</span>
        <input
          type="checkbox"
          checked={settings.privacy.allowLyricsProviders}
          onChange={(event) => {
            void patchPrivacy({ allowLyricsProviders: event.target.checked });
          }}
        />
      </label>
      <p className="settings-note">
        Network lyrics stay off until both privacy toggles are enabled.
      </p>
    </div>
  );
}

function AdvancedSettings() {
  return (
    <div className="settings-stack">
      <h2 className="settings-section-title">Advanced</h2>
      <p className="settings-note">
        AI lyric drafts stay local-only when introduced. Network libraries remain
        opt-in behind the privacy gate. Atrium stays offline-first.
      </p>
    </div>
  );
}

function AboutSettings() {
  return (
    <div className="settings-stack settings-stack--about">
      <h2 className="settings-section-title">About</h2>
      <p className="settings-note">
        {APP_NAME} — {APP_DESCRIPTION}
      </p>
      <p className="settings-note">
        Source, releases, and discussion live on GitHub. Use Report an issue to
        type a bug or idea — it opens on GitHub so the maintainer gets it there.
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
    </div>
  );
}
