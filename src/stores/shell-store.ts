import { create } from "zustand";

export type NavId =
  | "home"
  | "songs"
  | "albums"
  | "artists"
  | "folders"
  | "playlists"
  | "smart-playlists"
  | "recently-added"
  | "recently-played"
  | "favorites"
  | "history"
  | "themes"
  | "settings";

export type InspectorTab =
  | "queue"
  | "lyrics"
  | "track"
  | "album"
  | "file"
  | "history"
  | "audio";

type ShellState = {
  activeNav: NavId;
  sidebarExpanded: boolean;
  inspectorOpen: boolean;
  inspectorWidth: number;
  inspectorTab: InspectorTab;
  setActiveNav: (id: NavId) => void;
  toggleSidebar: () => void;
  setSidebarExpanded: (expanded: boolean) => void;
  toggleInspector: () => void;
  setInspectorOpen: (open: boolean) => void;
  setInspectorWidth: (width: number) => void;
  setInspectorTab: (tab: InspectorTab) => void;
};

export const useShellStore = create<ShellState>((set) => ({
  activeNav: "home",
  sidebarExpanded: false,
  inspectorOpen: false,
  inspectorWidth: 320,
  inspectorTab: "queue",
  setActiveNav: (activeNav) => set({ activeNav }),
  toggleSidebar: () =>
    set((state) => ({ sidebarExpanded: !state.sidebarExpanded })),
  setSidebarExpanded: (sidebarExpanded) => set({ sidebarExpanded }),
  toggleInspector: () =>
    set((state) => ({ inspectorOpen: !state.inspectorOpen })),
  setInspectorOpen: (inspectorOpen) => set({ inspectorOpen }),
  setInspectorWidth: (inspectorWidth) =>
    set({
      inspectorWidth: Math.min(720, Math.max(240, Math.round(inspectorWidth))),
    }),
  setInspectorTab: (inspectorTab) => set({ inspectorTab }),
}));
