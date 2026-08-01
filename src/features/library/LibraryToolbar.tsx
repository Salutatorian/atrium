import { useEffect, useState, useTransition } from "react";
import { pickMusicFolder, rescanLibrary, startLibraryScan } from "./api";
import { useLibraryStore } from "../../stores/library-store";
import { isTauriRuntime } from "../../services/tauri";

type LibraryToolbarProps = {
  showSearch?: boolean;
};

export function LibraryToolbar({ showSearch = false }: LibraryToolbarProps) {
  const stats = useLibraryStore((s) => s.stats);
  const searchQuery = useLibraryStore((s) => s.searchQuery);
  const setSearchQuery = useLibraryStore((s) => s.setSearchQuery);
  const loadTracks = useLibraryStore((s) => s.loadTracks);
  const [draft, setDraft] = useState(searchQuery);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const handle = window.setTimeout(() => {
      startTransition(() => {
        setSearchQuery(draft);
        void loadTracks(true);
      });
    }, 220);
    return () => window.clearTimeout(handle);
  }, [draft, loadTracks, setSearchQuery]);

  return (
    <div className="library-toolbar">
      <div className="library-toolbar__stats" aria-live="polite">
        <span>{stats.trackCount} songs</span>
        <span>{stats.albumCount} albums</span>
        <span>{stats.artistCount} artists</span>
      </div>
      <div className="library-toolbar__actions">
        {showSearch ? (
          <label className="search-field">
            <span className="sr-only">Search library</span>
            <input
              type="search"
              placeholder="Search title, artist, album…"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
          </label>
        ) : null}
        <button
          type="button"
          className="button-primary"
          disabled={!isTauriRuntime()}
          onClick={() => {
            void (async () => {
              const folder = await pickMusicFolder();
              if (folder) await startLibraryScan([folder]);
            })();
          }}
        >
          Import folder
        </button>
        <button
          type="button"
          disabled={!isTauriRuntime() || stats.trackCount === 0}
          onClick={() => {
            void rescanLibrary();
          }}
        >
          Rescan
        </button>
      </div>
    </div>
  );
}
