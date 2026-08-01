import type { ComponentType } from "react";
import type { NavId } from "../../stores/shell-store";
import {
  IconHeart,
  IconHome,
  IconPlaylists,
  IconRecent,
  IconSearch,
  IconSettings,
  IconSongs,
} from "../../components/icons";

export type NavItem = {
  id: NavId;
  label: string;
  Icon: ComponentType<{ className?: string }>;
};

export const primaryNav: NavItem[] = [
  { id: "home", label: "Home", Icon: IconHome },
  { id: "library", label: "Library", Icon: IconSongs },
  { id: "liked", label: "Liked", Icon: IconHeart },
  { id: "playlists", label: "Playlists", Icon: IconPlaylists },
  { id: "stats", label: "Stats", Icon: IconRecent },
  { id: "search", label: "Search", Icon: IconSearch },
];

export const utilityNav: NavItem[] = [
  { id: "settings", label: "Settings", Icon: IconSettings },
];
