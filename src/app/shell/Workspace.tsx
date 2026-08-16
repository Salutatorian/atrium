import { LibraryView } from "../../features/library/LibraryView";
import { HomeView } from "../../features/home/HomeView";
import { FavoritesPage } from "../../features/listening/ListeningPages";
import { StatsView } from "../../features/listening/StatsView";
import { PlaylistsPage } from "../../features/playlists/PlaylistsPage";
import { SearchView } from "../../features/search/SearchView";
import { SettingsView } from "../../features/settings/SettingsView";
import { useShellStore } from "../../stores/shell-store";

export function Workspace() {
  const activeNav = useShellStore((s) => s.activeNav);

  return (
    <main className="workspace" id="main-content" tabIndex={-1}>
      <div className="workspace__body">
        {activeNav === "home" ? <HomeView /> : null}
        {activeNav === "library" ? <LibraryView /> : null}
        {activeNav === "liked" ? <FavoritesPage /> : null}
        {activeNav === "playlists" ? <PlaylistsPage /> : null}
        {activeNav === "stats" ? <StatsView /> : null}
        {activeNav === "search" ? <SearchView /> : null}
        {activeNav === "settings" ? <SettingsView /> : null}
      </div>
    </main>
  );
}
