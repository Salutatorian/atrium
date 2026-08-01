# Database schema — Atrium

SQLite is the local source of truth. Migrations live in `src-tauri/src/database/migrations/`.

## Connection policy

- Enable WAL mode when opening the app database
- Use a single writer connection with serialized access
- Read queries may use additional connections later; Phase 1 uses one managed connection
- Foreign keys enabled
- Busy timeout configured for scan batches

## Tables (target model)

Phase 1 creates the core tables and settings seed. Remaining tables are included in the initial migration as empty structures so later phases avoid destructive reshuffles where practical.

| Table | Purpose |
| --- | --- |
| `schema_migrations` | Applied migration versions |
| `library_roots` | Managed import roots |
| `scan_jobs` | Resumable scan state |
| `folders` | Folder nodes under roots |
| `files` | Filesystem identity (path, size, mtime) |
| `tracks` | Indexed audio tracks |
| `albums` | Album grouping |
| `artists` | Artist entities |
| `album_artists` | Album ↔ artist |
| `track_artists` | Track ↔ artist |
| `genres` | Genre entities |
| `track_genres` | Track ↔ genre |
| `artwork` | Artwork references (paths/hashes, not giant blobs) |
| `playlists` | Manual playlists |
| `playlist_items` | Ordered playlist membership |
| `smart_playlists` | Rule definitions |
| `queue_items` | Persisted queue |
| `play_history` | Listening history |
| `track_statistics` | Play/skip aggregates |
| `favorites` | Favorite tracks/albums |
| `ratings` | User ratings |
| `lyrics` | Cached lyrics |
| `lyric_versions` | Edit history |
| `lyric_search_overrides` | Manual search substitutions |
| `themes` | Saved theme documents |
| `theme_backgrounds` | Background asset references |
| `settings` | Key/value typed settings JSON |
| `keyboard_shortcuts` | Remappable shortcuts |
| `ignored_paths` | Scan exclusions |
| `import_errors` | Per-file import failures |

## Track identity

- Stable internal UUID (`track_uid`)
- Canonical absolute path
- Fast change detection via path + size + mtime
- Optional content hash / acoustic fingerprint columns reserved; not computed on first import

## Search

FTS5 virtual table `tracks_fts` covers title, artist, album, album artist, genre, composer, file name, folder name. Phase 2 wires ranking and pagination.

## Phase 1 migration scope

Migration `0001_init.sql`:

- Creates all listed tables with essential columns
- Seeds default settings
- Creates FTS5 skeleton
- Does not import music yet
