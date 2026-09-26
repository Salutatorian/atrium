import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { isTauriRuntime } from "../../services/tauri";
import type { Page, TrackSummary } from "../library/types";
import type {
  PlaylistSummary,
  SmartPlaylistRules,
  SmartPlaylistSummary,
} from "./types";

export async function pickPlaylistCover(): Promise<string | null> {
  if (!isTauriRuntime()) return null;
  const selected = await open({
    multiple: false,
    title: "Choose a square photo",
    filters: [
      {
        name: "Images",
        extensions: ["png", "jpg", "jpeg", "webp"],
      },
    ],
  });
  return typeof selected === "string" ? selected : null;
}

export function playlistCoverSrc(coverPath?: string | null): string | null {
  if (!coverPath || !isTauriRuntime()) return null;
  return convertFileSrc(coverPath);
}

export async function listPlaylists(): Promise<PlaylistSummary[]> {
  if (!isTauriRuntime()) return [];
  return invoke<PlaylistSummary[]>("playlists_list");
}

export async function createPlaylist(
  name: string,
  description?: string,
): Promise<PlaylistSummary> {
  return invoke<PlaylistSummary>("playlists_create", {
    name,
    description: description ?? null,
  });
}

export async function renamePlaylist(id: string, name: string): Promise<void> {
  await invoke("playlists_rename", { id, name });
}

export async function setPlaylistCover(
  id: string,
  path: string,
): Promise<PlaylistSummary> {
  return invoke<PlaylistSummary>("playlists_set_cover", { id, path });
}

export async function clearPlaylistCover(id: string): Promise<PlaylistSummary> {
  return invoke<PlaylistSummary>("playlists_clear_cover", { id });
}

export async function deletePlaylist(id: string): Promise<void> {
  await invoke("playlists_delete", { id });
}

export async function listPlaylistTracks(id: string): Promise<TrackSummary[]> {
  if (!isTauriRuntime()) return [];
  return invoke<TrackSummary[]>("playlists_list_tracks", { id });
}

export async function addTracksToPlaylist(
  id: string,
  trackIds: number[],
): Promise<number> {
  return invoke<number>("playlists_add_tracks", { id, trackIds });
}

export async function removeTrackFromPlaylist(
  id: string,
  trackId: number,
): Promise<void> {
  await invoke("playlists_remove_track", { id, trackId });
}

export async function listSmartPlaylists(): Promise<SmartPlaylistSummary[]> {
  if (!isTauriRuntime()) return [];
  return invoke<SmartPlaylistSummary[]>("smart_playlists_list");
}

export async function createSmartPlaylist(
  name: string,
  rules: SmartPlaylistRules,
): Promise<SmartPlaylistSummary> {
  return invoke<SmartPlaylistSummary>("smart_playlists_create", { name, rules });
}

export async function updateSmartPlaylist(
  id: string,
  name: string,
  rules: SmartPlaylistRules,
): Promise<void> {
  await invoke("smart_playlists_update", { id, name, rules });
}

export async function deleteSmartPlaylist(id: string): Promise<void> {
  await invoke("smart_playlists_delete", { id });
}

export async function listSmartPlaylistTracks(
  id: string,
  offset: number,
  limit: number,
): Promise<Page<TrackSummary>> {
  if (!isTauriRuntime()) {
    return { items: [], total: 0, offset, limit };
  }
  return invoke<Page<TrackSummary>>("smart_playlists_list_tracks", {
    id,
    offset,
    limit,
  });
}
