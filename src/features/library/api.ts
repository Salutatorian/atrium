import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { isTauriRuntime } from "../../services/tauri";
import type {
  AlbumSummary,
  ArtistSummary,
  DropClassification,
  FolderSummary,
  LibraryStats,
  Page,
  ScanJobSummary,
  ScanProgressEvent,
  TrackSummary,
} from "./types";

export async function classifyDrop(paths: string[]): Promise<DropClassification> {
  if (!isTauriRuntime()) {
    return { audioFiles: [], folders: paths, ignored: [] };
  }
  return invoke<DropClassification>("classify_drop", { paths });
}

export async function startLibraryScan(
  paths: string[],
  force = false,
): Promise<string> {
  return invoke<string>("start_library_scan", { paths, force });
}

export async function pauseLibraryScan(jobId: string): Promise<void> {
  await invoke("pause_library_scan", { jobId });
}

export async function resumeLibraryScan(jobId: string): Promise<void> {
  await invoke("resume_library_scan", { jobId });
}

export async function cancelLibraryScan(jobId: string): Promise<void> {
  await invoke("cancel_library_scan", { jobId });
}

export async function fetchScanJobs(): Promise<ScanJobSummary[]> {
  if (!isTauriRuntime()) return [];
  return invoke<ScanJobSummary[]>("get_scan_jobs");
}

export async function fetchLibraryStats(): Promise<LibraryStats> {
  if (!isTauriRuntime()) {
    return { trackCount: 0, albumCount: 0, artistCount: 0, folderCount: 0 };
  }
  return invoke<LibraryStats>("get_library_stats");
}

export async function fetchTracks(
  offset: number,
  limit: number,
  query?: string,
): Promise<Page<TrackSummary>> {
  if (!isTauriRuntime()) {
    return { items: [], total: 0, offset, limit };
  }
  return invoke<Page<TrackSummary>>("list_library_tracks", {
    offset,
    limit,
    query: query?.trim() ? query : null,
  });
}

export async function fetchAlbums(
  offset: number,
  limit: number,
): Promise<Page<AlbumSummary>> {
  if (!isTauriRuntime()) {
    return { items: [], total: 0, offset, limit };
  }
  return invoke<Page<AlbumSummary>>("list_library_albums", { offset, limit });
}

export async function fetchArtists(
  offset: number,
  limit: number,
): Promise<Page<ArtistSummary>> {
  if (!isTauriRuntime()) {
    return { items: [], total: 0, offset, limit };
  }
  return invoke<Page<ArtistSummary>>("list_library_artists", { offset, limit });
}

export async function fetchFolders(): Promise<FolderSummary[]> {
  if (!isTauriRuntime()) return [];
  return invoke<FolderSummary[]>("list_library_folders");
}

export async function rescanLibrary(): Promise<string> {
  return invoke<string>("rescan_library");
}

export async function artworkSrc(cacheKey?: string | null): Promise<string | null> {
  if (!cacheKey || !isTauriRuntime()) return null;
  const result = await invoke<{ path?: string | null }>("get_artwork_path", {
    cacheKey,
  });
  if (!result.path) return null;
  return convertFileSrc(result.path);
}

export async function pickMusicFolder(): Promise<string | null> {
  if (!isTauriRuntime()) return null;
  const selected = await open({
    directory: true,
    multiple: false,
    title: "Choose a music folder",
  });
  if (typeof selected === "string") return selected;
  return null;
}

export async function onScanProgress(
  handler: (event: ScanProgressEvent) => void,
): Promise<UnlistenFn> {
  if (!isTauriRuntime()) return () => undefined;
  return listen<ScanProgressEvent>("scan://progress", (event) => {
    handler(event.payload);
  });
}

export async function onLibraryUpdated(
  handler: () => void,
): Promise<UnlistenFn> {
  if (!isTauriRuntime()) return () => undefined;
  return listen("library://updated", () => handler());
}

export function formatDuration(ms?: number | null): string {
  if (!ms || ms < 0) return "—:—";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function parentFolder(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const idx = normalized.lastIndexOf("/");
  return idx >= 0 ? normalized.slice(0, idx) : path;
}

export function fileName(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const idx = normalized.lastIndexOf("/");
  return idx >= 0 ? normalized.slice(idx + 1) : path;
}
