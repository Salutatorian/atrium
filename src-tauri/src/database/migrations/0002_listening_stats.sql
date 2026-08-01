-- Durable listening stats (survive file deletion)

CREATE TABLE IF NOT EXISTS scrobbles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    track_id INTEGER,
    identity_key TEXT NOT NULL,
    title TEXT NOT NULL,
    artist TEXT NOT NULL DEFAULT '',
    album TEXT NOT NULL DEFAULT '',
    duration_ms INTEGER,
    listened_ms INTEGER NOT NULL DEFAULT 0,
    completed INTEGER NOT NULL DEFAULT 0,
    skipped INTEGER NOT NULL DEFAULT 0,
    played_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_scrobbles_played_at ON scrobbles(played_at DESC);
CREATE INDEX IF NOT EXISTS idx_scrobbles_identity ON scrobbles(identity_key);
CREATE INDEX IF NOT EXISTS idx_scrobbles_artist ON scrobbles(artist);
CREATE INDEX IF NOT EXISTS idx_scrobbles_album ON scrobbles(album);

CREATE TABLE IF NOT EXISTS listen_stats (
    identity_key TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    artist TEXT NOT NULL DEFAULT '',
    album TEXT NOT NULL DEFAULT '',
    track_id INTEGER,
    play_count INTEGER NOT NULL DEFAULT 0,
    skip_count INTEGER NOT NULL DEFAULT 0,
    total_listen_ms INTEGER NOT NULL DEFAULT 0,
    last_played_at TEXT,
    first_played_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_listen_stats_plays ON listen_stats(play_count DESC);
CREATE INDEX IF NOT EXISTS idx_listen_stats_listen_ms ON listen_stats(total_listen_ms DESC);
CREATE INDEX IF NOT EXISTS idx_listen_stats_last ON listen_stats(last_played_at DESC);
