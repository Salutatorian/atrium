import { LibraryView } from "../../features/library/LibraryView";
import { HomeView } from "../../features/home/HomeView";
import { FavoritesPage } from "../../features/listening/ListeningPages";
import { StatsView } from "../../features/listening/StatsView";
import { PlaylistsPage } from "../../features/playlists/PlaylistsPage";
import { SearchView } from "../../features/search/SearchView";
import { useShellStore } from "../../stores/shell-store";

export function Workspace() {
  const activeNav = useShellStore((s) => s.activeNav);
  const page = activeNav === "settings" ? "home" : activeNav;

  return (
    <main className="workspace" id="main-content" tabIndex={-1}>
      <div className="workspace__body">
        {page === "home" ? <HomeView /> : null}
        {page === "library" ? <LibraryView /> : null}
        {page === "liked" ? <FavoritesPage /> : null}
        {page === "playlists" ? <PlaylistsPage /> : null}
        {page === "stats" ? <StatsView /> : null}
        {page === "search" ? <SearchView /> : null}
      </div>
    </main>
  );
}
