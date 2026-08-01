import { useSettingsStore } from "../../stores/settings-store";
import type { AppSettings } from "./schema";

export function SettingsPanel() {
  const settings = useSettingsStore((s) => s.settings);
  const patchAppearance = useSettingsStore((s) => s.patchAppearance);

  return (
    <section className="panel settings-panel" aria-label="Settings">
      <p className="panel__intro">
        Shape the listening room — density, chrome, and how the player bar
        sits in the space.
      </p>
      <div className="settings-stack">
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

        <p className="settings-note">
          Privacy defaults: network, analytics, and crash reports are off.
          Themes live under Theme studio.
        </p>
      </div>
    </section>
  );
}
