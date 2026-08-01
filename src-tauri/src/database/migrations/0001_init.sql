-- Atrium initial schema (Phase 1)
-- Artwork caches live on disk; this table stores references only.

CREATE TABLE library_roots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL UNIQUE,
    label TEXT,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_scanned_at TEXT
);

CREATE TABLE scan_jobs (
    id TEXT PRIMARY KEY,
    root_id INTEGER REFERENCES library_roots(id) ON DELETE SET NULL,
    status TEXT NOT NULL,
    paths_json TEXT NOT NULL,
    discovered INTEGER NOT NULL DEFAULT 0,
    processed INTEGER NOT NULL DEFAULT 0,
    errors INTEGER NOT NULL DEFAULT 0,
    cursor_path TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT
);

CREATE TABLE folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    root_id INTEGER NOT NULL REFERENCES library_roots(id) ON DELETE CASCADE,
    parent_id INTEGER REFERENCES folders(id) ON DELETE CASCADE,
    path TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    mtime INTEGER
);

CREATE TABLE files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL,
    path TEXT NOT NULL UNIQUE,
    display_path TEXT NOT NULL,
    size INTEGER NOT NULL,
    mtime INTEGER NOT NULL,
    ctime INTEGER,
    extension TEXT NOT NULL,
    content_hash TEXT,
    missing INTEGER NOT NULL DEFAULT 0,
    last_scanned_at TEXT
);

CREATE TABLE artists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sort_name TEXT,
    UNIQUE(name)
);

CREATE TABLE albums (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    sort_title TEXT,
    album_artist TEXT,
    year INTEGER,
    is_compilation INTEGER NOT NULL DEFAULT 0,
    artwork_id INTEGER,
    UNIQUE(title, album_artist, year)
);

CREATE TABLE genres (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE artwork (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    source_path TEXT,
    cache_key TEXT NOT NULL UNIQUE,
    width INTEGER,
    height INTEGER,
    dominant_color TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    track_uid TEXT NOT NULL UNIQUE,
    file_id INTEGER NOT NULL UNIQUE REFERENCES files(id) ON DELETE CASCADE,
    album_id INTEGER REFERENCES albums(id) ON DELETE SET NULL,
    title TEXT,
    sort_title TEXT,
    artist TEXT,
    album_artist TEXT,
    album TEXT,
    disc_number INTEGER,
    disc_total INTEGER,
    track_number INTEGER,
    track_total INTEGER,
    genre TEXT,
    year INTEGER,
    date TEXT,
    composer TEXT,
    comment TEXT,
    codec TEXT,
    container TEXT,
    bitrate INTEGER,
    sample_rate INTEGER,
    bit_depth INTEGER,
    channels INTEGER,
    duration_ms INTEGER,
    has_lyrics INTEGER NOT NULL DEFAULT 0,
    has_artwork INTEGER NOT NULL DEFAULT 0,
    is_compilation INTEGER NOT NULL DEFAULT 0,
    replaygain_track_gain REAL,
    replaygain_album_gain REAL,
    replaygain_track_peak REAL,
    replaygain_album_peak REAL,
    date_added TEXT NOT NULL DEFAULT (datetime('now')),
    last_scanned_at TEXT,
    last_played_at TEXT,
    play_count INTEGER NOT NULL DEFAULT 0,
    skip_count INTEGER NOT NULL DEFAULT 0,
    rating INTEGER,
    favorite INTEGER NOT NULL DEFAULT 0,
    missing INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE album_artists (
    album_id INTEGER NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    artist_id INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    PRIMARY KEY (album_id, artist_id)
);

CREATE TABLE track_artists (
    track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    artist_id INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'artist',
    PRIMARY KEY (track_id, artist_id, role)
);

CREATE TABLE track_genres (
    track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    genre_id INTEGER NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
    PRIMARY KEY (track_id, genre_id)
);

CREATE TABLE playlists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    cover_path TEXT,
    parent_id TEXT REFERENCES playlists(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE playlist_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    UNIQUE(playlist_id, position)
);

CREATE TABLE smart_playlists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    rules_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE queue_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    track_id INTEGER REFERENCES tracks(id) ON DELETE CASCADE,
    external_path TEXT,
    position INTEGER NOT NULL,
    added_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE play_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    track_id INTEGER REFERENCES tracks(id) ON DELETE SET NULL,
    played_at TEXT NOT NULL DEFAULT (datetime('now')),
    duration_listened_ms INTEGER,
    completed INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE track_statistics (
    track_id INTEGER PRIMARY KEY REFERENCES tracks(id) ON DELETE CASCADE,
    play_count INTEGER NOT NULL DEFAULT 0,
    skip_count INTEGER NOT NULL DEFAULT 0,
    total_listen_ms INTEGER NOT NULL DEFAULT 0,
    last_played_at TEXT
);

CREATE TABLE favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(entity_type, entity_id)
);

CREATE TABLE ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    rating INTEGER NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(entity_type, entity_id)
);

CREATE TABLE lyrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    plain_text TEXT,
    synced_lrc TEXT,
    source TEXT NOT NULL,
    source_url TEXT,
    provider_id TEXT,
    language TEXT,
    offset_ms INTEGER NOT NULL DEFAULT 0,
    confidence REAL,
    user_edited INTEGER NOT NULL DEFAULT 0,
    retrieved_at TEXT,
    search_terms TEXT,
    UNIQUE(track_id, source)
);

CREATE TABLE lyric_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lyrics_id INTEGER NOT NULL REFERENCES lyrics(id) ON DELETE CASCADE,
    plain_text TEXT,
    synced_lrc TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    note TEXT
);

CREATE TABLE lyric_search_overrides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    track_id INTEGER NOT NULL UNIQUE REFERENCES tracks(id) ON DELETE CASCADE,
    title TEXT,
    artist TEXT,
    album TEXT,
    duration_ms INTEGER
);

CREATE TABLE themes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    document_json TEXT NOT NULL,
    favorite INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE theme_backgrounds (
    id TEXT PRIMARY KEY,
    theme_id TEXT REFERENCES themes(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    kind TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE keyboard_shortcuts (
    action_id TEXT PRIMARY KEY,
    shortcut TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ignored_paths (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL UNIQUE,
    reason TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE import_errors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_job_id TEXT REFERENCES scan_jobs(id) ON DELETE SET NULL,
    path TEXT NOT NULL,
    error_code TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_tracks_album_id ON tracks(album_id);
CREATE INDEX idx_tracks_artist ON tracks(artist);
CREATE INDEX idx_tracks_date_added ON tracks(date_added);
CREATE INDEX idx_tracks_last_played ON tracks(last_played_at);
CREATE INDEX idx_files_mtime ON files(mtime);
CREATE INDEX idx_playlist_items_playlist ON playlist_items(playlist_id, position);
CREATE INDEX idx_queue_items_position ON queue_items(position);
CREATE INDEX idx_play_history_played_at ON play_history(played_at);

CREATE VIRTUAL TABLE tracks_fts USING fts5(
    title,
    artist,
    album,
    album_artist,
    genre,
    composer,
    file_name,
    folder_name,
    content='',
    contentless_delete=1
);

INSERT INTO settings (key, value_json) VALUES (
    'app',
    '{"schemaVersion":1,"general":{"launchBehavior":"normal","startMinimized":false,"restoreLastPage":true,"restoreQueue":true,"language":"system","checkForUpdates":false},"library":{"watchFolders":false,"includeHiddenFiles":false,"followSymlinks":false,"maxRecursionDepth":32},"playback":{"defaultVolume":0.8,"rememberVolume":true,"autoplayOnDrop":true,"seekStepSeconds":5},"appearance":{"themeId":"atrium-mist","followSystemTheme":false,"density":"comfortable","playerBarStyle":"floating-pill","sidebarExpanded":false,"inspectorOpen":false,"inspectorWidth":320,"reducedMotion":"system"},"lyrics":{"preferSynchronized":true,"fontSize":18,"alignment":"center","globalOffsetMs":0},"privacy":{"allowNetwork":false,"allowLyricsProviders":false,"allowCrashReports":false,"allowAnalytics":false}}'
);
