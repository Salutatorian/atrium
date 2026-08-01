import { create } from "zustand";
import {
  fetchAlbums,
  fetchArtists,
  fetchFolders,
  fetchLibraryStats,
  fetchTracks,
} from "../features/library/api";
import type {
  AlbumSummary,
  ArtistSummary,
  FolderSummary,
  LibraryStats,
  ScanProgressEvent,
  SingleFilePrompt,
  TrackSummary,
} from "../features/library/types";

type LibraryState = {
  stats: LibraryStats;
  tracks: TrackSummary[];
  trackTotal: number;
  albums: AlbumSummary[];
  albumTotal: number;
  artists: ArtistSummary[];
  artistTotal: number;
  folders: FolderSummary[];
  searchQuery: string;
  loading: boolean;
  scanEvents: Record<string, ScanProgressEvent>;
  dropHover: boolean;
  singleFilePrompt: SingleFilePrompt | null;
  setDropHover: (value: boolean) => void;
  setSingleFilePrompt: (prompt: SingleFilePrompt | null) => void;
  setSearchQuery: (query: string) => void;
  upsertScanEvent: (event: ScanProgressEvent) => void;
  dismissScanEvent: (jobId: string) => void;
  refreshStats: () => Promise<void>;
  loadTracks: (reset?: boolean) => Promise<void>;
  loadMoreTracks: () => Promise<void>;
  loadAlbums: () => Promise<void>;
  loadArtists: () => Promise<void>;
  loadFolders: () => Promise<void>;
  refreshAll: () => Promise<void>;
};

const emptyStats: LibraryStats = {
  trackCount: 0,
  albumCount: 0,
  artistCount: 0,
  folderCount: 0,
};

export const useLibraryStore = create<LibraryState>((set, get) => ({
  stats: emptyStats,
  tracks: [],
  trackTotal: 0,
  albums: [],
  albumTotal: 0,
  artists: [],
  artistTotal: 0,
  folders: [],
  searchQuery: "",
  loading: false,
  scanEvents: {},
  dropHover: false,
  singleFilePrompt: null,
  setDropHover: (dropHover) => set({ dropHover }),
  setSingleFilePrompt: (singleFilePrompt) => set({ singleFilePrompt }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  upsertScanEvent: (event) =>
    set((state) => ({
      scanEvents: {
        ...state.scanEvents,
        [event.jobId]: event,
      },
    })),
  dismissScanEvent: (jobId) =>
    set((state) => {
      const next = { ...state.scanEvents };
      delete next[jobId];
      return { scanEvents: next };
    }),
  refreshStats: async () => {
    const stats = await fetchLibraryStats();
    set({ stats });
  },
  loadTracks: async (reset = true) => {
    set({ loading: true });
    try {
      const page = await fetchTracks(0, 100, get().searchQuery || undefined);
      set({
        tracks: page.items,
        trackTotal: page.total,
      });
    } finally {
      if (reset) set({ loading: false });
      else set({ loading: false });
    }
  },
  loadMoreTracks: async () => {
    const { tracks, trackTotal, searchQuery, loading } = get();
    if (loading || tracks.length >= trackTotal) return;
    set({ loading: true });
    try {
      const page = await fetchTracks(
        tracks.length,
        100,
        searchQuery || undefined,
      );
      set({
        tracks: [...tracks, ...page.items],
        trackTotal: page.total,
      });
    } finally {
      set({ loading: false });
    }
  },
  loadAlbums: async () => {
    const page = await fetchAlbums(0, 200);
    set({ albums: page.items, albumTotal: page.total });
  },
  loadArtists: async () => {
    const page = await fetchArtists(0, 200);
    set({ artists: page.items, artistTotal: page.total });
  },
  loadFolders: async () => {
    const folders = await fetchFolders();
    set({ folders });
  },
  refreshAll: async () => {
    await Promise.all([
      get().refreshStats(),
      get().loadTracks(true),
      get().loadAlbums(),
      get().loadArtists(),
      get().loadFolders(),
    ]);
  },
}));
