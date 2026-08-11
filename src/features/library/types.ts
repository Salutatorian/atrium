export type TrackSummary = {
  id: number;
  trackUid: string;
  path: string;
  title?: string | null;
  artist?: string | null;
  album?: string | null;
  albumArtist?: string | null;
  genre?: string | null;
  year?: number | null;
  trackNumber?: number | null;
  durationMs?: number | null;
  hasArtwork: boolean;
  artworkCacheKey?: string | null;
  dateAdded?: string | null;
  /** True when the file is gone from disk or removed from the library index. */
  missing?: boolean;
};

export type AlbumSummary = {
  id: number;
  title: string;
  albumArtist?: string | null;
  year?: number | null;
  trackCount: number;
  artworkCacheKey?: string | null;
};

export type ArtistSummary = {
  name: string;
  trackCount: number;
  albumCount: number;
};

export type FolderSummary = {
  id: number;
  path: string;
  name: string;
  trackCount: number;
};

export type LibraryRootSummary = {
  id: number;
  path: string;
  label: string;
  trackCount: number;
};

export type LibraryStats = {
  trackCount: number;
  albumCount: number;
  artistCount: number;
  folderCount: number;
};

export type Page<T> = {
  items: T[];
  total: number;
  offset: number;
  limit: number;
};

export type ScanProgressEvent = {
  jobId: string;
  status: string;
  discovered: number;
  processed: number;
  errors: number;
  currentPath?: string | null;
  message?: string | null;
  /** Failed files from this scan (when status is completed_with_errors). */
  errorSamples?: ImportErrorSample[];
};

export type ImportErrorSample = {
  path: string;
  code: string;
  message: string;
};

export type ScanJobSummary = {
  id: string;
  status: string;
  discovered: number;
  processed: number;
  errors: number;
  paths: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
};

export type DropClassification = {
  audioFiles: string[];
  folders: string[];
  ignored: string[];
};

export type SingleFilePrompt = {
  filePath: string;
  parentFolder: string;
};
