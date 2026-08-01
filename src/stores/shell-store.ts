import { create } from "zustand";

export type NavId =
  | "home"
  | "library"
  | "liked"
  | "playlists"
  | "stats"
  | "search"
  | "settings";

export type DrawerTab = "queue" | "lyrics" | "info";

export type LibraryTab = "songs" | "albums" | "artists" | "folders";

type ShellState = {
  activeNav: NavId;
  libraryTab: LibraryTab;
  sidebarExpanded: boolean;
  inspectorOpen: boolean;
  inspectorWidth: number;
  inspectorTab: DrawerTab;
  nowPlayingOpen: boolean;
  setActiveNav: (id: NavId) => void;
  setLibraryTab: (tab: LibraryTab) => void;
  toggleSidebar: () => void;
  setSidebarExpanded: (expanded: boolean) => void;
  toggleInspector: () => void;
  setInspectorOpen: (open: boolean) => void;
  setInspectorWidth: (width: number) => void;
  setInspectorTab: (tab: DrawerTab) => void;
  openDrawer: (tab: DrawerTab) => void;
  toggleDrawer: (tab: DrawerTab) => void;
  setNowPlayingOpen: (open: boolean) => void;
};

export const useShellStore = create<ShellState>((set, get) => ({
  activeNav: "home",
  libraryTab: "songs",
  sidebarExpanded: false,
  inspectorOpen: false,
  inspectorWidth: 380,
  inspectorTab: "queue",
  nowPlayingOpen: false,
  setActiveNav: (activeNav) => set({ activeNav }),
  setLibraryTab: (libraryTab) => set({ libraryTab }),
  toggleSidebar: () =>
    set((state) => ({ sidebarExpanded: !state.sidebarExpanded })),
  setSidebarExpanded: (sidebarExpanded) => set({ sidebarExpanded }),
  toggleInspector: () =>
    set((state) => ({ inspectorOpen: !state.inspectorOpen })),
  setInspectorOpen: (inspectorOpen) => set({ inspectorOpen }),
  setInspectorWidth: (inspectorWidth) =>
    set({
      inspectorWidth: Math.min(480, Math.max(320, Math.round(inspectorWidth))),
    }),
  setInspectorTab: (inspectorTab) => set({ inspectorTab }),
  openDrawer: (tab) => set({ inspectorOpen: true, inspectorTab: tab }),
  toggleDrawer: (tab) => {
    const { inspectorOpen, inspectorTab } = get();
    if (inspectorOpen && inspectorTab === tab) {
      set({ inspectorOpen: false });
      return;
    }
    set({ inspectorOpen: true, inspectorTab: tab });
  },
  setNowPlayingOpen: (nowPlayingOpen) => set({ nowPlayingOpen }),
}));
