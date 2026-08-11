import { useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  APP_DESCRIPTION,
  APP_GITHUB_ISSUES_URL,
  APP_GITHUB_URL,
  APP_NAME,
  DONATE_AMOUNTS,
} from "../../app/brand";
import { BrandLogo } from "../../app/shell/BrandLogo";
import { Tooltip } from "../../components/Tooltip";
import { isTauriRuntime } from "../../services/tauri";
import {
  APP_FONTS,
  DEFAULT_HEADING_FONT_ID,
  DEFAULT_UI_FONT_ID,
} from "../themes/font-catalog";
import { VISUALIZER_PRESETS } from "../visualizer/catalog";
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
      <p className="settings-note">
        Look for a newer Atrium on GitHub when the app starts. Uses a short
        network check only for updates.
      </p>
      <label className="settings-field settings-field--checkbox">
        <span>Install updates automatically</span>
        <input
          type="checkbox"
          checked={settings.general.autoInstallUpdates}
          disabled={!settings.general.checkForUpdates}
          onChange={(event) => {
            void patchGeneral({ autoInstallUpdates: event.target.checked });
          }}
        />
      </label>
      <p className="settings-note">
        When on, Atrium downloads and installs on launch (the window may close
        briefly while updating — same pattern as many desktop apps). Turn off to
        get a bottom-right Update / Cancel notice instead. After updating,
        you&apos;ll see what changed.
      </p>
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
      <p className="settings-note">
        10-band peaking EQ with 20 presets. Drag any band to go custom — tweak
        Q for wider or narrower cuts/boosts.
      </p>

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
      <p className="settings-note">
        {getEqPreset(settings.playback.eqPresetId)?.description ??
          "Your hand-tuned curve"}
      </p>

      <label className="settings-field">
        <span>Preamp ({settings.playback.preampDb.toFixed(1)} dB)</span>
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
        <span>
          Bandwidth / Q ({settings.playback.eqQ.toFixed(2)}) — lower = wider
        </span>
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

      <p className="settings-note">
        Tip: double-click a band to zero it. Preamp helps avoid clipping when
        boosting.
      </p>
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
          <option value="compact">Compact — tight lists & smaller type</option>
          <option value="comfortable">Comfortable — default spacing</option>
          <option value="spacious">Spacious — roomy rows & larger hits</option>
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
        <span>Soundbars</span>
        <select
          value={settings.appearance.visualizerStyle}
          onChange={(event) => {
            void patchAppearance({
              visualizerStyle: event.target
                .value as AppSettings["appearance"]["visualizerStyle"],
            });
          }}
        >
          {VISUALIZER_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
      </label>
      <p className="settings-note">
        Beat-reactive bars sit behind the player. Default is Classic blocks —
        pick any of the {VISUALIZER_PRESETS.length - 1} styles, or Off.
      </p>
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

      <h2 className="settings-section-title">Fonts</h2>
      <p className="settings-note">
        Changes the typeface across the whole app. Google fonts download the
        first time you pick them (needs network once).
      </p>
      <label className="settings-field">
        <span>UI font</span>
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
  const groups = getShortcutCatalog();

  return (
    <div className="settings-stack settings-stack--shortcuts">
      <h2 className="settings-section-title">Shortcuts</h2>
      <p className="settings-note">
        Works while Atrium is focused. Letter shortcuts use physical keys, so
        they stay on the same positions across keyboard layouts. On Mac, Ctrl
        chords use ⌘.
      </p>
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
      <BrandLogo
        size="lg"
        decorative={false}
        className="settings-about-logo"
      />
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

      <h2 className="settings-section-title">What’s new</h2>
      <p className="settings-note">
        Bugs, fixes, and new features for this version and earlier releases.
      </p>
      <div className="settings-changelog">
        <UpdatesShowcase forceShow />
      </div>

      <h2 className="settings-section-title">Support {APP_NAME}</h2>
      <p className="settings-note">
        Optional tips help keep development going. Opens Stripe Checkout in your
        browser — card details stay with Stripe, never this app.
      </p>
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
