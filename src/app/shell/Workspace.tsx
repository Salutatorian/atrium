import { APP_NAME, APP_DESCRIPTION } from "../brand";
import {
  AlbumsPage,
  ArtistsPage,
  FoldersPage,
  RecentlyAddedPage,
  SongsPage,
} from "../../features/library/LibraryPages";
import { LibraryToolbar } from "../../features/library/LibraryToolbar";
import { PlaylistsPage } from "../../features/playlists/PlaylistsPage";
import { SmartPlaylistsPage } from "../../features/playlists/SmartPlaylistsPage";
import {
  FavoritesPage,
  HistoryPage,
  RecentlyPlayedPage,
} from "../../features/listening/ListeningPages";
import { SettingsPanel } from "../../features/settings/SettingsPanel";
import { ThemesStudio } from "../../features/themes/ThemesStudio";
import { useLibraryStore } from "../../stores/library-store";
import { useShellStore, type NavId } from "../../stores/shell-store";

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
        {activeNav === "playlists" ? <PlaylistsPage /> : null}
        {activeNav === "smart-playlists" ? <SmartPlaylistsPage /> : null}
        {activeNav === "favorites" ? <FavoritesPage /> : null}
        {activeNav === "recently-played" ? <RecentlyPlayedPage /> : null}
        {activeNav === "history" ? <HistoryPage /> : null}
        {activeNav === "themes" ? <ThemesStudio /> : null}
        {activeNav === "settings" ? <SettingsPanel /> : null}
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
