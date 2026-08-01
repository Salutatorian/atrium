import {
  AlbumsPage,
  ArtistsPage,
  FoldersPage,
  SongsPage,
} from "./LibraryPages";
import { LibraryToolbar } from "./LibraryToolbar";
import { useLibraryStore } from "../../stores/library-store";
import { useShellStore, type LibraryTab } from "../../stores/shell-store";
import { cn } from "../../utils/cn";

const tabs: { id: LibraryTab; label: string }[] = [
  { id: "songs", label: "Songs" },
  { id: "albums", label: "Albums" },
  { id: "artists", label: "Artists" },
  { id: "folders", label: "Folders" },
];

export function LibraryView() {
  const libraryTab = useShellStore((s) => s.libraryTab);
  const setLibraryTab = useShellStore((s) => s.setLibraryTab);
  const stats = useLibraryStore((s) => s.stats);

  return (
    <section className="library-view" aria-label="Library">
      <header className="library-view__header">
        <div className="library-view__top">
          <div className="library-view__intro">
            <h1 className="view-title">Library</h1>
            <p className="library-view__lead">
              {stats.trackCount > 0
                ? `${stats.trackCount} songs · ${stats.albumCount} albums · ${stats.artistCount} artists`
                : "Add a folder to begin — songs stay where they are."}
            </p>
          </div>
          <LibraryToolbar quiet showSearch />
        </div>

        <div
          className="library-view__tabs"
          role="tablist"
          aria-label="Library views"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`library-tab-${tab.id}`}
              aria-selected={libraryTab === tab.id}
              aria-controls={`library-panel-${tab.id}`}
              className={cn(
                "library-tab",
                libraryTab === tab.id && "library-tab--active",
              )}
              onClick={() => setLibraryTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <div
        className="library-view__body"
        role="tabpanel"
        id={`library-panel-${libraryTab}`}
        aria-labelledby={`library-tab-${libraryTab}`}
      >
        {libraryTab === "songs" ? <SongsPage embedded /> : null}
        {libraryTab === "albums" ? <AlbumsPage embedded /> : null}
        {libraryTab === "artists" ? <ArtistsPage embedded /> : null}
        {libraryTab === "folders" ? <FoldersPage embedded /> : null}
      </div>
    </section>
  );
}
