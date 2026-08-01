use crate::database::Database;
use crate::error::AppError;
use crate::library::artwork::{
    find_sidecar_artwork, persist_artwork, thumb_path,
};
use crate::audio::types::QueueTrack;
use crate::library::models::{
    AlbumSummary, ArtistSummary, FolderSummary, LibraryStats, Page, ParsedTrack, ScanJobSummary,
    TrackSummary,
};
use rusqlite::{params, OptionalExtension};
use std::fs;
use std::path::{Path, PathBuf};
use uuid::Uuid;

pub fn upsert_parsed_track(
    db: &Database,
    data_dir: &Path,
    parsed: &ParsedTrack,
) -> Result<i64, AppError> {
    let conn = db.conn();
    let path_str = parsed.path.to_string_lossy().to_string();
    let display_path = path_str.clone();
    let folder_path = parsed
        .path
        .parent()
        .map(|p| p.to_path_buf())
        .unwrap_or_else(|| PathBuf::from("."));
    let folder_name = folder_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Music")
        .to_string();

    let root_id = ensure_library_root(db, &folder_path)?;
    let folder_id = ensure_folder(db, root_id, &folder_path, &folder_name)?;

    let mut artwork_cache_key = None;
    if let Some(bytes) = &parsed.artwork_bytes {
        artwork_cache_key = Some(persist_artwork(data_dir, &path_str, bytes)?);
    } else if let Some(sidecar) = find_sidecar_artwork(&parsed.path) {
        if let Ok(bytes) = fs::read(&sidecar) {
            artwork_cache_key = Some(persist_artwork(
                data_dir,
                &sidecar.to_string_lossy(),
                &bytes,
            )?);
        }
    }

    let artwork_id = if let Some(key) = &artwork_cache_key {
        Some(ensure_artwork_row(db, key)?)
    } else {
        None
    };

    let file_id: i64 = match conn
        .query_row(
            "SELECT id, size, mtime FROM files WHERE path = ?1",
            params![path_str],
            |row| Ok((row.get::<_, i64>(0)?, row.get::<_, i64>(1)?, row.get::<_, i64>(2)?)),
        )
        .optional()?
    {
        Some((id, size, mtime)) if size == parsed.size as i64 && mtime == parsed.mtime => {
            conn.execute(
                "UPDATE files SET missing = 0, last_scanned_at = datetime('now') WHERE id = ?1",
                params![id],
            )?;
            id
        }
        Some((id, _, _)) => {
            conn.execute(
                "UPDATE files SET folder_id = ?1, display_path = ?2, size = ?3, mtime = ?4, ctime = ?5,
                 extension = ?6, missing = 0, last_scanned_at = datetime('now') WHERE id = ?7",
                params![
                    folder_id,
                    display_path,
                    parsed.size as i64,
                    parsed.mtime,
                    parsed.ctime,
                    parsed.extension,
                    id
                ],
            )?;
            id
        }
        None => {
            conn.execute(
                "INSERT INTO files (folder_id, path, display_path, size, mtime, ctime, extension, missing, last_scanned_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 0, datetime('now'))",
                params![
                    folder_id,
                    path_str,
                    display_path,
                    parsed.size as i64,
                    parsed.mtime,
                    parsed.ctime,
                    parsed.extension
                ],
            )?;
            conn.last_insert_rowid()
        }
    };

    let album_id = ensure_album(db, parsed, artwork_id)?;

    let existing_track = conn
        .query_row(
            "SELECT id, track_uid FROM tracks WHERE file_id = ?1",
            params![file_id],
            |row| Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?)),
        )
        .optional()?;

    let track_id = if let Some((id, _)) = existing_track {
        conn.execute(
            "UPDATE tracks SET
                album_id = ?1, title = ?2, sort_title = ?2, artist = ?3, album_artist = ?4, album = ?5,
                disc_number = ?6, disc_total = ?7, track_number = ?8, track_total = ?9, genre = ?10,
                year = ?11, composer = ?12, comment = ?13, codec = ?14, container = ?15,
                bitrate = ?16, sample_rate = ?17, bit_depth = ?18, channels = ?19, duration_ms = ?20,
                has_lyrics = ?21, has_artwork = ?22,
                replaygain_track_gain = ?23, replaygain_album_gain = ?24,
                replaygain_track_peak = ?25, replaygain_album_peak = ?26,
                missing = 0, last_scanned_at = datetime('now')
             WHERE id = ?27",
            params![
                album_id,
                parsed.title,
                parsed.artist,
                parsed.album_artist,
                parsed.album,
                parsed.disc_number,
                parsed.disc_total,
                parsed.track_number,
                parsed.track_total,
                parsed.genre,
                parsed.year,
                parsed.composer,
                parsed.comment,
                parsed.codec,
                parsed.container,
                parsed.bitrate,
                parsed.sample_rate,
                parsed.bit_depth,
                parsed.channels,
                parsed.duration_ms,
                parsed.has_lyrics as i64,
                artwork_cache_key.is_some() as i64,
                parsed.replaygain_track_gain.map(|v| v as f64),
                parsed.replaygain_album_gain.map(|v| v as f64),
                parsed.replaygain_track_peak.map(|v| v as f64),
                parsed.replaygain_album_peak.map(|v| v as f64),
                id
            ],
        )?;
        id
    } else {
        let track_uid = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO tracks (
                track_uid, file_id, album_id, title, sort_title, artist, album_artist, album,
                disc_number, disc_total, track_number, track_total, genre, year, composer, comment,
                codec, container, bitrate, sample_rate, bit_depth, channels, duration_ms,
                has_lyrics, has_artwork,
                replaygain_track_gain, replaygain_album_gain, replaygain_track_peak, replaygain_album_peak,
                missing, last_scanned_at
             ) VALUES (
                ?1, ?2, ?3, ?4, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15,
                ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25, ?26, ?27, ?28, 0, datetime('now')
             )",
            params![
                track_uid,
                file_id,
                album_id,
                parsed.title,
                parsed.artist,
                parsed.album_artist,
                parsed.album,
                parsed.disc_number,
                parsed.disc_total,
                parsed.track_number,
                parsed.track_total,
                parsed.genre,
                parsed.year,
                parsed.composer,
                parsed.comment,
                parsed.codec,
                parsed.container,
                parsed.bitrate,
                parsed.sample_rate,
                parsed.bit_depth,
                parsed.channels,
                parsed.duration_ms,
                parsed.has_lyrics as i64,
                artwork_cache_key.is_some() as i64,
                parsed.replaygain_track_gain.map(|v| v as f64),
                parsed.replaygain_album_gain.map(|v| v as f64),
                parsed.replaygain_track_peak.map(|v| v as f64),
                parsed.replaygain_album_peak.map(|v| v as f64),
            ],
        )?;
        conn.last_insert_rowid()
    };

    upsert_fts(
        db,
        track_id,
        parsed,
        &parsed
            .path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or_default()
            .to_string(),
        &folder_name,
    )?;

    Ok(track_id)
}

pub fn file_needs_rescan(db: &Database, path: &Path, size: u64, mtime: i64) -> Result<bool, AppError> {
    let path_str = path.to_string_lossy().to_string();
    let row = db
        .conn()
        .query_row(
            "SELECT size, mtime, missing FROM files WHERE path = ?1",
            params![path_str],
            |row| Ok((row.get::<_, i64>(0)?, row.get::<_, i64>(1)?, row.get::<_, i64>(2)?)),
        )
        .optional()?;

    Ok(match row {
        None => true,
        Some((_, _, missing)) if missing != 0 => true,
        Some((stored_size, stored_mtime, _)) => {
            stored_size != size as i64 || stored_mtime != mtime
        }
    })
}

pub fn list_tracks(
    db: &Database,
    data_dir: &Path,
    offset: i64,
    limit: i64,
    query: Option<&str>,
) -> Result<Page<TrackSummary>, AppError> {
    let conn = db.conn();
    let limit = limit.clamp(1, 200);
    let offset = offset.max(0);

    if let Some(q) = query.map(str::trim).filter(|s| !s.is_empty()) {
        let fts_query = build_fts_query(q);
        let total: i64 = conn.query_row(
            "SELECT COUNT(*) FROM tracks_fts WHERE tracks_fts MATCH ?1",
            params![fts_query],
            |row| row.get(0),
        )?;
        let mut stmt = conn.prepare(
            "SELECT t.id, t.track_uid, f.path, t.title, t.artist, t.album, t.album_artist, t.genre,
                    t.year, t.track_number, t.duration_ms, t.has_artwork, a.cache_key, t.date_added
             FROM tracks_fts
             JOIN tracks t ON t.id = tracks_fts.rowid
             JOIN files f ON f.id = t.file_id
             LEFT JOIN albums al ON al.id = t.album_id
             LEFT JOIN artwork a ON a.id = al.artwork_id
             WHERE tracks_fts MATCH ?1
             ORDER BY bm25(tracks_fts)
             LIMIT ?2 OFFSET ?3",
        )?;
        let items = stmt
            .query_map(params![fts_query, limit, offset], |row| map_track_row(row))
            .map_err(AppError::from)?
            .collect::<Result<Vec<_>, _>>()?;
        return Ok(Page {
            items: decorate_artwork_paths(data_dir, items),
            total,
            offset,
            limit,
        });
    }

    let total: i64 = conn.query_row(
        "SELECT COUNT(*) FROM tracks WHERE missing = 0",
        [],
        |row| row.get(0),
    )?;
    let mut stmt = conn.prepare(
        "SELECT t.id, t.track_uid, f.path, t.title, t.artist, t.album, t.album_artist, t.genre,
                t.year, t.track_number, t.duration_ms, t.has_artwork, a.cache_key, t.date_added
         FROM tracks t
         JOIN files f ON f.id = t.file_id
         LEFT JOIN albums al ON al.id = t.album_id
         LEFT JOIN artwork a ON a.id = al.artwork_id
         WHERE t.missing = 0
         ORDER BY COALESCE(t.artist, ''), COALESCE(t.album, ''), COALESCE(t.track_number, 9999), COALESCE(t.title, '')
         LIMIT ?1 OFFSET ?2",
    )?;
    let items = stmt
        .query_map(params![limit, offset], |row| map_track_row(row))?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(Page {
        items: decorate_artwork_paths(data_dir, items),
        total,
        offset,
        limit,
    })
}

pub fn list_albums(db: &Database, offset: i64, limit: i64) -> Result<Page<AlbumSummary>, AppError> {
    let conn = db.conn();
    let limit = limit.clamp(1, 200);
    let offset = offset.max(0);
    let total: i64 = conn.query_row("SELECT COUNT(*) FROM albums", [], |row| row.get(0))?;
    let mut stmt = conn.prepare(
        "SELECT al.id, al.title, al.album_artist, al.year,
                (SELECT COUNT(*) FROM tracks t WHERE t.album_id = al.id AND t.missing = 0) as track_count,
                a.cache_key
         FROM albums al
         LEFT JOIN artwork a ON a.id = al.artwork_id
         ORDER BY COALESCE(al.album_artist, ''), al.title
         LIMIT ?1 OFFSET ?2",
    )?;
    let items = stmt
        .query_map(params![limit, offset], |row| {
            Ok(AlbumSummary {
                id: row.get(0)?,
                title: row.get(1)?,
                album_artist: row.get(2)?,
                year: row.get(3)?,
                track_count: row.get(4)?,
                artwork_cache_key: row.get(5)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(Page {
        items,
        total,
        offset,
        limit,
    })
}

pub fn list_artists(db: &Database, offset: i64, limit: i64) -> Result<Page<ArtistSummary>, AppError> {
    let conn = db.conn();
    let limit = limit.clamp(1, 200);
    let offset = offset.max(0);
    let total: i64 = conn.query_row(
        "SELECT COUNT(DISTINCT COALESCE(NULLIF(artist, ''), 'Unknown Artist')) FROM tracks WHERE missing = 0",
        [],
        |row| row.get(0),
    )?;
    let mut stmt = conn.prepare(
        "SELECT COALESCE(NULLIF(artist, ''), 'Unknown Artist') as name,
                COUNT(*) as track_count,
                COUNT(DISTINCT album) as album_count
         FROM tracks
         WHERE missing = 0
         GROUP BY COALESCE(NULLIF(artist, ''), 'Unknown Artist')
         ORDER BY name
         LIMIT ?1 OFFSET ?2",
    )?;
    let items = stmt
        .query_map(params![limit, offset], |row| {
            Ok(ArtistSummary {
                name: row.get(0)?,
                track_count: row.get(1)?,
                album_count: row.get(2)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(Page {
        items,
        total,
        offset,
        limit,
    })
}

pub fn list_folders(db: &Database) -> Result<Vec<FolderSummary>, AppError> {
    let conn = db.conn();
    let mut stmt = conn.prepare(
        "SELECT f.id, f.path, f.name,
                (SELECT COUNT(*) FROM files fi
                 JOIN tracks t ON t.file_id = fi.id
                 WHERE fi.folder_id = f.id AND t.missing = 0) as track_count
         FROM folders f
         ORDER BY f.path",
    )?;
    let items = stmt
        .query_map([], |row| {
            Ok(FolderSummary {
                id: row.get(0)?,
                path: row.get(1)?,
                name: row.get(2)?,
                track_count: row.get(3)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(items)
}

pub fn library_stats(db: &Database) -> Result<LibraryStats, AppError> {
    let conn = db.conn();
    Ok(LibraryStats {
        track_count: conn.query_row(
            "SELECT COUNT(*) FROM tracks WHERE missing = 0",
            [],
            |row| row.get(0),
        )?,
        album_count: conn.query_row("SELECT COUNT(*) FROM albums", [], |row| row.get(0))?,
        artist_count: conn.query_row(
            "SELECT COUNT(DISTINCT COALESCE(NULLIF(artist, ''), 'Unknown Artist')) FROM tracks WHERE missing = 0",
            [],
            |row| row.get(0),
        )?,
        folder_count: conn.query_row("SELECT COUNT(*) FROM folders", [], |row| row.get(0))?,
    })
}

pub fn list_scan_jobs(db: &Database) -> Result<Vec<ScanJobSummary>, AppError> {
    let conn = db.conn();
    let mut stmt = conn.prepare(
        "SELECT id, status, discovered, processed, errors, paths_json, created_at, updated_at, completed_at
         FROM scan_jobs
         ORDER BY created_at DESC
         LIMIT 20",
    )?;
    let items = stmt
        .query_map([], |row| {
            let paths_json: String = row.get(5)?;
            let paths: Vec<String> = serde_json::from_str(&paths_json).unwrap_or_default();
            Ok(ScanJobSummary {
                id: row.get(0)?,
                status: row.get(1)?,
                discovered: row.get::<_, i64>(2)? as u64,
                processed: row.get::<_, i64>(3)? as u64,
                errors: row.get::<_, i64>(4)? as u64,
                paths,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
                completed_at: row.get(8)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(items)
}

pub fn create_scan_job(db: &Database, id: &str, paths: &[String]) -> Result<(), AppError> {
    let paths_json = serde_json::to_string(paths)?;
    db.conn().execute(
        "INSERT INTO scan_jobs (id, status, paths_json, discovered, processed, errors)
         VALUES (?1, 'preparing', ?2, 0, 0, 0)",
        params![id, paths_json],
    )?;
    Ok(())
}

pub fn update_scan_job(
    db: &Database,
    id: &str,
    status: &str,
    discovered: u64,
    processed: u64,
    errors: u64,
    cursor_path: Option<&str>,
    completed: bool,
) -> Result<(), AppError> {
    if completed {
        db.conn().execute(
            "UPDATE scan_jobs SET status = ?1, discovered = ?2, processed = ?3, errors = ?4,
             cursor_path = ?5, updated_at = datetime('now'), completed_at = datetime('now')
             WHERE id = ?6",
            params![status, discovered as i64, processed as i64, errors as i64, cursor_path, id],
        )?;
    } else {
        db.conn().execute(
            "UPDATE scan_jobs SET status = ?1, discovered = ?2, processed = ?3, errors = ?4,
             cursor_path = ?5, updated_at = datetime('now')
             WHERE id = ?6",
            params![status, discovered as i64, processed as i64, errors as i64, cursor_path, id],
        )?;
    }
    Ok(())
}

pub fn record_import_error(
    db: &Database,
    job_id: &str,
    path: &str,
    code: &str,
    message: &str,
) -> Result<(), AppError> {
    db.conn().execute(
        "INSERT INTO import_errors (scan_job_id, path, error_code, message)
         VALUES (?1, ?2, ?3, ?4)",
        params![job_id, path, code, message],
    )?;
    Ok(())
}

pub fn tracks_by_ids(db: &Database, track_ids: &[i64]) -> Result<Vec<QueueTrack>, AppError> {
    if track_ids.is_empty() {
        return Ok(Vec::new());
    }
    let conn = db.conn();
    let mut tracks = Vec::with_capacity(track_ids.len());
    for id in track_ids {
        let row = conn
            .query_row(
                "SELECT t.id, f.path, t.title, t.artist, t.album, t.duration_ms, a.cache_key,
                        t.replaygain_track_gain, t.replaygain_album_gain
                 FROM tracks t
                 JOIN files f ON f.id = t.file_id
                 LEFT JOIN albums al ON al.id = t.album_id
                 LEFT JOIN artwork a ON a.id = al.artwork_id
                 WHERE t.id = ?1 AND t.missing = 0",
                params![id],
                |row| {
                    Ok(QueueTrack {
                        track_id: row.get(0)?,
                        path: row.get(1)?,
                        title: row.get(2)?,
                        artist: row.get(3)?,
                        album: row.get(4)?,
                        duration_ms: row.get(5)?,
                        artwork_cache_key: row.get(6)?,
                        replaygain_track_gain: row
                            .get::<_, Option<f64>>(7)?
                            .map(|v| v as f32),
                        replaygain_album_gain: row
                            .get::<_, Option<f64>>(8)?
                            .map(|v| v as f32),
                    })
                },
            )
            .optional()?;
        if let Some(track) = row {
            tracks.push(track);
        }
    }
    Ok(tracks)
}

pub fn resolve_artwork_file(data_dir: &Path, cache_key: &str) -> Option<PathBuf> {
    let thumb = thumb_path(data_dir, cache_key);
    if thumb.exists() {
        return Some(thumb);
    }
    let original = crate::library::artwork::original_path(data_dir, cache_key);
    if original.exists() {
        return Some(original);
    }
    None
}

fn ensure_library_root(db: &Database, folder_path: &Path) -> Result<i64, AppError> {
    let root_path = folder_path.to_string_lossy().to_string();
    let conn = db.conn();
    if let Some(id) = conn
        .query_row(
            "SELECT id FROM library_roots WHERE path = ?1",
            params![root_path],
            |row| row.get::<_, i64>(0),
        )
        .optional()?
    {
        return Ok(id);
    }

    // Prefer nearest existing ancestor root; otherwise insert parent as root.
    let mut stmt = conn.prepare("SELECT id, path FROM library_roots")?;
    let ancestors = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?
        .collect::<Result<Vec<(i64, String)>, _>>()?;
    drop(stmt);
    for (id, path) in ancestors {
        if root_path.starts_with(&path) {
            return Ok(id);
        }
    }

    conn.execute(
        "INSERT INTO library_roots (path, label, enabled) VALUES (?1, ?2, 1)",
        params![root_path, folder_path.file_name().and_then(|n| n.to_str())],
    )?;
    Ok(conn.last_insert_rowid())
}

fn ensure_folder(
    db: &Database,
    root_id: i64,
    folder_path: &Path,
    name: &str,
) -> Result<i64, AppError> {
    let path = folder_path.to_string_lossy().to_string();
    let conn = db.conn();
    if let Some(id) = conn
        .query_row(
            "SELECT id FROM folders WHERE path = ?1",
            params![path],
            |row| row.get::<_, i64>(0),
        )
        .optional()?
    {
        return Ok(id);
    }
    conn.execute(
        "INSERT INTO folders (root_id, parent_id, path, name) VALUES (?1, NULL, ?2, ?3)",
        params![root_id, path, name],
    )?;
    Ok(conn.last_insert_rowid())
}

fn ensure_artwork_row(db: &Database, cache_key: &str) -> Result<i64, AppError> {
    let conn = db.conn();
    if let Some(id) = conn
        .query_row(
            "SELECT id FROM artwork WHERE cache_key = ?1",
            params![cache_key],
            |row| row.get::<_, i64>(0),
        )
        .optional()?
    {
        return Ok(id);
    }
    conn.execute(
        "INSERT INTO artwork (source, cache_key) VALUES ('embedded_or_sidecar', ?1)",
        params![cache_key],
    )?;
    Ok(conn.last_insert_rowid())
}

fn ensure_album(
    db: &Database,
    parsed: &ParsedTrack,
    artwork_id: Option<i64>,
) -> Result<Option<i64>, AppError> {
    let Some(title) = parsed.album.as_ref().filter(|s| !s.is_empty()) else {
        return Ok(None);
    };
    let album_artist = parsed
        .album_artist
        .clone()
        .or_else(|| parsed.artist.clone());
    let conn = db.conn();
    if let Some(id) = conn
        .query_row(
            "SELECT id FROM albums WHERE title = ?1 AND IFNULL(album_artist, '') = IFNULL(?2, '') AND IFNULL(year, -1) = IFNULL(?3, -1)",
            params![title, album_artist, parsed.year],
            |row| row.get::<_, i64>(0),
        )
        .optional()?
    {
        if artwork_id.is_some() {
            conn.execute(
                "UPDATE albums SET artwork_id = COALESCE(artwork_id, ?1) WHERE id = ?2",
                params![artwork_id, id],
            )?;
        }
        return Ok(Some(id));
    }
    conn.execute(
        "INSERT INTO albums (title, sort_title, album_artist, year, artwork_id)
         VALUES (?1, ?1, ?2, ?3, ?4)",
        params![title, album_artist, parsed.year, artwork_id],
    )?;
    Ok(Some(conn.last_insert_rowid()))
}

fn upsert_fts(
    db: &Database,
    track_id: i64,
    parsed: &ParsedTrack,
    file_name: &str,
    folder_name: &str,
) -> Result<(), AppError> {
    let conn = db.conn();
    let _ = conn.execute("DELETE FROM tracks_fts WHERE rowid = ?1", params![track_id]);
    conn.execute(
        "INSERT INTO tracks_fts (rowid, title, artist, album, album_artist, genre, composer, file_name, folder_name)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            track_id,
            parsed.title,
            parsed.artist,
            parsed.album,
            parsed.album_artist,
            parsed.genre,
            parsed.composer,
            file_name,
            folder_name
        ],
    )?;
    Ok(())
}

pub(crate) fn map_track_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<TrackSummary> {
    Ok(TrackSummary {
        id: row.get(0)?,
        track_uid: row.get(1)?,
        path: row.get(2)?,
        title: row.get(3)?,
        artist: row.get(4)?,
        album: row.get(5)?,
        album_artist: row.get(6)?,
        genre: row.get(7)?,
        year: row.get(8)?,
        track_number: row.get(9)?,
        duration_ms: row.get(10)?,
        has_artwork: row.get::<_, i64>(11)? != 0,
        artwork_cache_key: row.get(12)?,
        date_added: row.get(13)?,
    })
}

pub(crate) fn decorate_artwork_paths(
    data_dir: &Path,
    mut items: Vec<TrackSummary>,
) -> Vec<TrackSummary> {
    for item in &mut items {
        if let Some(key) = &item.artwork_cache_key {
            if resolve_artwork_file(data_dir, key).is_none() {
                item.artwork_cache_key = None;
                item.has_artwork = false;
            }
        }
    }
    items
}

pub fn get_track_by_id(
    db: &Database,
    data_dir: &Path,
    track_id: i64,
) -> Result<Option<TrackSummary>, AppError> {
    let conn = db.conn();
    let mut stmt = conn.prepare(
        "SELECT t.id, t.track_uid, f.path, t.title, t.artist, t.album, t.album_artist, t.genre,
                t.year, t.track_number, t.duration_ms, t.has_artwork, a.cache_key, t.date_added
         FROM tracks t
         JOIN files f ON f.id = t.file_id
         LEFT JOIN albums al ON al.id = t.album_id
         LEFT JOIN artwork a ON a.id = al.artwork_id
         WHERE t.id = ?1 AND t.missing = 0",
    )?;
    let track = stmt
        .query_row(params![track_id], |row| map_track_row(row))
        .optional()?;
    Ok(track.map(|t| {
        decorate_artwork_paths(data_dir, vec![t])
            .into_iter()
            .next()
            .expect("decorated track")
    }))
}

pub fn update_track_tags(
    db: &Database,
    data_dir: &Path,
    track_id: i64,
    title: Option<&str>,
    artist: Option<&str>,
    album: Option<&str>,
    album_artist: Option<&str>,
    genre: Option<&str>,
    year: Option<i64>,
    track_number: Option<u32>,
) -> Result<TrackSummary, AppError> {
    use crate::library::metadata::{parse_audio_file, write_basic_tags};
    use std::path::PathBuf;

    let path: String = db.conn().query_row(
        "SELECT f.path FROM tracks t JOIN files f ON f.id = t.file_id WHERE t.id = ?1",
        params![track_id],
        |row| row.get(0),
    )?;
    let path_buf = PathBuf::from(&path);
    write_basic_tags(
        &path_buf,
        title,
        artist,
        album,
        album_artist,
        genre,
        year,
        track_number,
    )?;
    let parsed = parse_audio_file(&path_buf)?;
    upsert_parsed_track(db, data_dir, &parsed)?;
    get_track_by_id(db, data_dir, track_id)?
        .ok_or_else(|| AppError::Message("Track missing after tag write".into()))
}

fn build_fts_query(input: &str) -> String {
    input
        .split_whitespace()
        .map(|token| {
            let cleaned = token.replace('"', "");
            format!("\"{cleaned}\"*")
        })
        .collect::<Vec<_>>()
        .join(" ")
}
