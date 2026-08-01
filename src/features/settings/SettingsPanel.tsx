import { useSettingsStore } from "../../stores/settings-store";
import type { AppSettings } from "./schema";

export function SettingsPanel() {
  const settings = useSettingsStore((s) => s.settings);
  const patchAppearance = useSettingsStore((s) => s.patchAppearance);
  const patchLyrics = useSettingsStore((s) => s.patchLyrics);
  const patchPrivacy = useSettingsStore((s) => s.patchPrivacy);

  return (
    <section className="panel settings-panel" aria-label="Settings">
      <p className="panel__intro">
        Shape the listening room — density, chrome, lyrics display, and privacy
        gates for network providers.
      </p>
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
            <option value="floating-pill">Floating pill</option>
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
          Attribution is always shown for remote sources.
        </p>
      </div>
    </section>
  );
}
