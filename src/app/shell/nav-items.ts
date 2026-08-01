import type { ComponentType } from "react";
import type { NavId } from "../../stores/shell-store";
import {
  IconAlbums,
  IconArtists,
  IconFolders,
  IconHeart,
  IconHistory,
  IconHome,
  IconPlaylists,
  IconPlus,
  IconRecent,
  IconSettings,
  IconSongs,
  IconSpark,
  IconTheme,
} from "../../components/icons";

export type NavItem = {
  id: NavId;
  label: string;
  Icon: ComponentType<{ className?: string }>;
};

export const primaryNav: NavItem[] = [
  { id: "home", label: "Home", Icon: IconHome },
  { id: "songs", label: "Songs", Icon: IconSongs },
  { id: "albums", label: "Albums", Icon: IconAlbums },
  { id: "artists", label: "Artists", Icon: IconArtists },
  { id: "folders", label: "Folders", Icon: IconFolders },
  { id: "playlists", label: "Playlists", Icon: IconPlaylists },
  { id: "smart-playlists", label: "Smart playlists", Icon: IconSpark },
  { id: "recently-added", label: "Recently added", Icon: IconPlus },
  { id: "recently-played", label: "Recently played", Icon: IconRecent },
  { id: "favorites", label: "Favorites", Icon: IconHeart },
  { id: "history", label: "History", Icon: IconHistory },
];

export const utilityNav: NavItem[] = [
  { id: "themes", label: "Themes", Icon: IconTheme },
  { id: "settings", label: "Settings", Icon: IconSettings },
];
