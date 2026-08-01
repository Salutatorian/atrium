import { APP_NAME, APP_DESCRIPTION } from "../brand";
import {
  AlbumsPage,
  ArtistsPage,
  FoldersPage,
  RecentlyAddedPage,
  SongsPage,
} from "../../features/library/LibraryPages";
import { LibraryToolbar } from "../../features/library/LibraryToolbar";
import { builtinThemes } from "../../features/themes/presets";
import { useLibraryStore } from "../../stores/library-store";
import { useShellStore, type NavId } from "../../stores/shell-store";
import { useThemeStore } from "../../stores/theme-store";
import { useSettingsStore } from "../../stores/settings-store";
import { cn } from "../../utils/cn";

const titles: Record<NavId, string> = {
  home: "Listening room",
  songs: "Songs",
  albums: "Albums",
  artists: "Artists",
  folders: "Folders",
  playlists: "Playlists",
  "smart-playlists": "Smart playlists",
  "recently-added": "Recently added",
  "recently-played": "Recently played",
  favorites: "Favorites",
  history: "History",
  themes: "Theme studio",
  settings: "Settings",
};

export function Workspace() {
  const activeNav = useShellStore((s) => s.activeNav);

  return (
    <main className="workspace" id="main-content" tabIndex={-1}>
      <header className="workspace__header">
        <p className="workspace__eyebrow">{APP_NAME}</p>
        <h1 className="workspace__title">{titles[activeNav]}</h1>
      </header>

      <div className="workspace__body">
        {activeNav === "home" ? <HomePanel /> : null}
        {activeNav === "songs" ? <SongsPage /> : null}
        {activeNav === "albums" ? <AlbumsPage /> : null}
        {activeNav === "artists" ? <ArtistsPage /> : null}
        {activeNav === "folders" ? <FoldersPage /> : null}
        {activeNav === "recently-added" ? <RecentlyAddedPage /> : null}
        {activeNav === "themes" ? <ThemesPanel /> : null}
        {activeNav === "settings" ? <SettingsPanel /> : null}
        {activeNav === "playlists" ||
        activeNav === "smart-playlists" ||
        activeNav === "recently-played" ||
        activeNav === "favorites" ||
        activeNav === "history" ? (
          <EmptyLibraryPanel section={titles[activeNav]} />
        ) : null}
      </div>
    </main>
  );
}

function HomePanel() {
  const stats = useLibraryStore((s) => s.stats);

  return (
    <section className="panel home-panel" aria-label="Welcome">
      <div className="home-panel__copy">
        <p className="home-panel__lead">{APP_DESCRIPTION}</p>
        <p className="home-panel__detail">
          Drag songs or folders into the window, or import a music directory.
          Scanning stays in the background while you browse.
        </p>
        <LibraryToolbar />
        <p className="home-panel__stats muted">
          Library: {stats.trackCount} songs · {stats.albumCount} albums ·{" "}
          {stats.artistCount} artists
        </p>
      </div>
      <div className="home-panel__stage" aria-hidden="true">
        <div className="art-placeholder">
          <span>Artwork</span>
        </div>
        <div className="home-panel__glow" />
      </div>
    </section>
  );
}

function EmptyLibraryPanel({ section }: { section: string }) {
  return (
    <section className="panel empty-panel" aria-label={section}>
      <h2 className="empty-panel__title">{section}</h2>
      <p className="empty-panel__detail">
        This view is reserved for a later phase. Your imported library is
        available under Songs, Albums, Artists, and Folders.
      </p>
    </section>
  );
}

function ThemesPanel() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const setPreviewTheme = useThemeStore((s) => s.setPreviewTheme);
  const patchAppearance = useSettingsStore((s) => s.patchAppearance);

  return (
    <section className="panel themes-panel" aria-label="Themes">
      <p className="panel__intro">
        Original Atrium presets. Importable theme files and a full studio arrive
        later — the token engine is already live.
      </p>
      <ul className="theme-grid">
        {builtinThemes.map((item) => (
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
              onClick={() => {
                setTheme(item);
                void patchAppearance({ themeId: item.id });
              }}
            >
              <span
                className="theme-card__swatch"
                style={{
                  background: `linear-gradient(135deg, ${item.colors.appBackground}, ${item.colors.accent})`,
                }}
              />
              <span className="theme-card__meta">
                <span className="theme-card__name">{item.name}</span>
                <span className="theme-card__desc">{item.description}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SettingsPanel() {
  const settings = useSettingsStore((s) => s.settings);
  const patchAppearance = useSettingsStore((s) => s.patchAppearance);

  return (
    <section className="panel settings-panel" aria-label="Settings">
      <p className="panel__intro">
        Appearance essentials for now. Library import uses your local folders
        with no account required.
      </p>
      <div className="settings-stack">
        <label className="settings-field">
          <span>Density</span>
          <select
            value={settings.appearance.density}
            onChange={(event) => {
              const density = event.target.value as
                | "compact"
                | "comfortable"
                | "spacious";
              void patchAppearance({ density });
            }}
          >
            <option value="compact">Compact</option>
            <option value="comfortable">Comfortable</option>
            <option value="spacious">Spacious</option>
          </select>
        </label>
        <label className="settings-field">
          <span>Reduced motion</span>
          <select
            value={settings.appearance.reducedMotion}
            onChange={(event) => {
              const reducedMotion = event.target.value as
                | "system"
                | "reduce"
                | "no-preference";
              void patchAppearance({ reducedMotion });
            }}
          >
            <option value="system">Follow system</option>
            <option value="reduce">Always reduce</option>
            <option value="no-preference">Prefer motion</option>
          </select>
        </label>
        <p className="settings-note">
          Privacy defaults: network, analytics, and crash reports are off.
        </p>
      </div>
    </section>
  );
}
