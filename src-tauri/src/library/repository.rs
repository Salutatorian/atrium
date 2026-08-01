use crate::database::Database;
use crate::error::AppError;
use crate::library::artwork::{
    find_sidecar_artwork, persist_artwork, thumb_path,
};
use crate::audio::types::QueueTrack;
use crate::library::hash::hash_file_sha256;
use crate::library::models::{
    AlbumSummary, ArtistSummary, FolderSummary, LibraryRootSummary, LibraryStats, Page,
    ParsedTrack, ScanJobSummary, TrackSummary,
};
use crate::library::paths::{normalize_path, normalize_path_string, path_is_within, path_key};
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
    // Index in place — store a stable absolute path; never copy the audio file.
    let path_str = normalize_path_string(&parsed.path);
    let display_path = path_str.clone();
    let folder_path = PathBuf::from(&path_str)
        .parent()
        .map(|p| p.to_path_buf())
        .unwrap_or_else(|| PathBuf::from("."));
    let folder_name = folder_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Music")
        .to_string();

    let root_id = resolve_library_root(db, &PathBuf::from(&path_str), &folder_path)?;
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

    // Content hash is the merge key: same audio bytes → one library row.
    let content_hash = hash_file_sha256(&parsed.path).ok();

    let file_id: i64 = match resolve_file_for_upsert(
        db,
        &path_str,
        content_hash.as_deref(),
        parsed.size as i64,
        parsed.duration_ms,
        parsed.title.as_deref().unwrap_or(""),
    )? {
        Some(existing) => {
            let keep_path = if existing.path == path_str {
                path_str.clone()
            } else if existing.missing != 0 || !Path::new(&existing.path).is_file() {
                // Moved / re-imported: point the kept row at the live file.
                path_str.clone()
            } else {
                // True duplicate copy — keep the original path, still refresh metadata.
                existing.path.clone()
            };
            let keep_folder_id = if keep_path == path_str {
                folder_id
            } else {
                existing.folder_id.unwrap_or(folder_id)
            };
            conn.execute(
                "UPDATE files SET folder_id = ?1, path = ?2, display_path = ?3, size = ?4, mtime = ?5, ctime = ?6,
                 extension = ?7, content_hash = COALESCE(?8, content_hash), missing = 0,
                 last_scanned_at = datetime('now') WHERE id = ?9",
                params![
                    keep_folder_id,
                    keep_path,
                    keep_path,
                    parsed.size as i64,
                    parsed.mtime,
                    parsed.ctime,
                    parsed.extension,
                    content_hash,
                    existing.id
                ],
            )?;
            existing.id
        }
        None => {
            conn.execute(
                "INSERT INTO files (folder_id, path, display_path, size, mtime, ctime, extension, content_hash, missing, last_scanned_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 0, datetime('now'))",
                params![
                    folder_id,
                    path_str,
                    display_path,
                    parsed.size as i64,
                    parsed.mtime,
                    parsed.ctime,
                    parsed.extension,
                    content_hash
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
                artwork_cache_key = ?27,
                missing = 0, last_scanned_at = datetime('now')
             WHERE id = ?28",
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
                artwork_cache_key,
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
                artwork_cache_key,
                missing, last_scanned_at
             ) VALUES (
                ?1, ?2, ?3, ?4, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15,
                ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25, ?26, ?27, ?28, ?29, 0, datetime('now')
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
                artwork_cache_key,
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
    let path_str = normalize_path_string(path);
    let row = find_file_row(db, &path_str)?;

    Ok(match row {
        None => true,
        Some(existing) if existing.missing != 0 => true,
        Some(existing) => existing.size != size as i64 || existing.mtime != mtime,
    })
}

#[derive(Debug, Clone)]
struct FileRow {
    id: i64,
    folder_id: Option<i64>,
    path: String,
    size: i64,
    mtime: i64,
    missing: i64,
}

/// Resolve by path, then content hash, then soft fingerprint (title+size+duration).
fn resolve_file_for_upsert(
    db: &Database,
    path_str: &str,
    content_hash: Option<&str>,
    size: i64,
    duration_ms: Option<i64>,
    title: &str,
) -> Result<Option<FileRow>, AppError> {
    if let Some(row) = find_file_row(db, path_str)? {
        return Ok(Some(row));
    }
    if let Some(hash) = content_hash.filter(|h| !h.is_empty()) {
        if let Some(row) = find_file_by_content_hash(db, hash)? {
            return Ok(Some(row));
        }
    }
    if let Some(row) = find_file_by_fingerprint(db, size, duration_ms, title)? {
        return Ok(Some(row));
    }
    Ok(None)
}

fn find_file_row(db: &Database, path_str: &str) -> Result<Option<FileRow>, AppError> {
    let candidates = [
        path_str.to_string(),
        format!(r"\\?\{path_str}"),
    ];
    for candidate in candidates {
        if let Some(row) = query_file_row(
            db,
            "SELECT id, folder_id, path, size, mtime, missing FROM files WHERE path = ?1",
            params![candidate],
        )? {
            return Ok(Some(row));
        }
    }

    // Windows / case-insensitive filesystems: catch casing-only twins without a full table scan.
    #[cfg(windows)]
    {
        if let Some(row) = query_file_row(
            db,
            "SELECT id, folder_id, path, size, mtime, missing FROM files
             WHERE lower(path) = lower(?1) OR lower(path) = lower(?2)",
            params![path_str, format!(r"\\?\{path_str}")],
        )? {
            return Ok(Some(row));
        }
    }

    Ok(None)
}

fn find_file_by_content_hash(db: &Database, hash: &str) -> Result<Option<FileRow>, AppError> {
    query_file_row(
        db,
        "SELECT id, folder_id, path, size, mtime, missing FROM files WHERE content_hash = ?1",
        params![hash],
    )
}

fn find_file_by_fingerprint(
    db: &Database,
    size: i64,
    duration_ms: Option<i64>,
    title: &str,
) -> Result<Option<FileRow>, AppError> {
    let title = title.trim();
    if title.is_empty() {
        return Ok(None);
    }
    let duration = duration_ms.unwrap_or(0);
    query_file_row(
        db,
        "SELECT f.id, f.folder_id, f.path, f.size, f.mtime, f.missing
         FROM files f
         JOIN tracks t ON t.file_id = f.id
         WHERE f.size = ?1
           AND COALESCE(t.duration_ms, 0) = ?2
           AND lower(trim(t.title)) = lower(trim(?3))
         ORDER BY f.id ASC
         LIMIT 1",
        params![size, duration, title],
    )
}

fn query_file_row(
    db: &Database,
    sql: &str,
    params: impl rusqlite::Params,
) -> Result<Option<FileRow>, AppError> {
    let conn = db.conn();
    Ok(conn
        .query_row(sql, params, |row| {
            Ok(FileRow {
                id: row.get(0)?,
                folder_id: row.get(1)?,
                path: row.get(2)?,
                size: row.get(3)?,
                mtime: row.get(4)?,
                missing: row.get(5)?,
            })
        })
        .optional()?)
}

/// Collapse twin library rows (same content hash, or same title+size+duration).
pub fn collapse_duplicate_tracks(db: &Database) -> Result<u64, AppError> {
    let mut removed = 0_u64;
    removed += collapse_by_content_hash(db)?;
    removed += collapse_by_fingerprint(db)?;
    Ok(removed)
}

fn collapse_by_content_hash(db: &Database) -> Result<u64, AppError> {
    let conn = db.conn();
    let mut stmt = conn.prepare(
        "SELECT content_hash, GROUP_CONCAT(id) FROM files
         WHERE content_hash IS NOT NULL AND content_hash != ''
         GROUP BY content_hash HAVING COUNT(*) > 1",
    )?;
    let groups = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })?
        .collect::<Result<Vec<_>, _>>()?;
    drop(stmt);

    let mut removed = 0_u64;
    for (_hash, ids_csv) in groups {
        let ids = parse_id_list(&ids_csv);
        if ids.len() < 2 {
            continue;
        }
        let keep = ids[0];
        let drop_ids: Vec<i64> = ids.into_iter().skip(1).collect();
        delete_files_preserving_favorites(db, &drop_ids)?;
        removed += drop_ids.len() as u64;
        let _ = keep;
    }
    Ok(removed)
}

fn collapse_by_fingerprint(db: &Database) -> Result<u64, AppError> {
    let conn = db.conn();
    let mut stmt = conn.prepare(
        "SELECT f.size, COALESCE(t.duration_ms, 0), lower(trim(t.title)), GROUP_CONCAT(f.id)
         FROM files f
         JOIN tracks t ON t.file_id = f.id
         GROUP BY f.size, COALESCE(t.duration_ms, 0), lower(trim(t.title))
         HAVING COUNT(*) > 1 AND length(trim(t.title)) > 0",
    )?;
    let groups = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
            ))
        })?
        .collect::<Result<Vec<_>, _>>()?;
    drop(stmt);

    let mut removed = 0_u64;
    for (_size, _dur, _title, ids_csv) in groups {
        let ids = parse_id_list(&ids_csv);
        if ids.len() < 2 {
            continue;
        }
        let drop_ids: Vec<i64> = ids.into_iter().skip(1).collect();
        delete_files_preserving_favorites(db, &drop_ids)?;
        removed += drop_ids.len() as u64;
    }
    Ok(removed)
}

fn parse_id_list(csv: &str) -> Vec<i64> {
    let mut ids: Vec<i64> = csv
        .split(',')
        .filter_map(|s| s.trim().parse().ok())
        .collect();
    ids.sort_unstable();
    ids.dedup();
    ids
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
                    t.year, t.track_number, t.duration_ms, t.has_artwork, COALESCE(a.cache_key, t.artwork_cache_key), t.date_added
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
                t.year, t.track_number, t.duration_ms, t.has_artwork, COALESCE(a.cache_key, t.artwork_cache_key), t.date_added
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
                "SELECT t.id, f.path, t.title, t.artist, t.album, t.duration_ms,
                        COALESCE(a.cache_key, t.artwork_cache_key),
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

/// One-time repair: strip verbatim prefixes and collapse nested library roots.
pub fn repair_library_indexes(db: &Database) -> Result<(), AppError> {
    strip_verbatim_paths(db, "library_roots")?;
    strip_verbatim_paths(db, "folders")?;
    strip_verbatim_paths(db, "files")?;

    let tops = list_top_level_library_roots(db)?;
    for path in tops {
        let folder = Path::new(&path);
        if folder.is_dir() {
            let _ = register_user_library_root(db, folder);
        }
    }
    Ok(())
}

fn strip_verbatim_paths(db: &Database, table: &str) -> Result<(), AppError> {
    let conn = db.conn();
    let sql = format!("SELECT id, path FROM {table}");
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt
        .query_map([], |row| Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?)))?
        .collect::<Result<Vec<_>, _>>()?;
    drop(stmt);

    for (id, path) in rows {
        let Some(clean) = path.strip_prefix(r"\\?\") else {
            continue;
        };
        let clean = clean.to_string();
        let conflict: Option<i64> = conn
            .query_row(
                &format!("SELECT id FROM {table} WHERE path = ?1 AND id != ?2"),
                params![clean, id],
                |row| row.get(0),
            )
            .optional()?;
        if let Some(keep_id) = conflict {
            // Prefer the cleaned row; drop the verbatim duplicate row.
            if table == "files" {
                delete_files_preserving_favorites(db, &[id])?;
            }
            if table == "folders" {
                conn.execute(
                    "UPDATE files SET folder_id = ?1 WHERE folder_id = ?2",
                    params![keep_id, id],
                )?;
            }
            if table != "files" {
                conn.execute(&format!("DELETE FROM {table} WHERE id = ?1"), params![id])?;
            }
        } else {
            conn.execute(
                &format!("UPDATE {table} SET path = ?1 WHERE id = ?2"),
                params![clean, id],
            )?;
            if table == "files" {
                conn.execute(
                    "UPDATE files SET display_path = ?1 WHERE id = ?2",
                    params![clean, id],
                )?;
            }
        }
    }
    Ok(())
}

/// Register a folder the user chose. Indexes that location in place — does not copy files.
/// Collapses any nested roots that were wrongly created under this path.
pub fn register_user_library_root(db: &Database, folder_path: &Path) -> Result<i64, AppError> {
    let root = normalize_path(folder_path);
    if !root.is_dir() {
        return Err(AppError::Message(
            "Library root must be an existing folder".into(),
        ));
    }
    let root_path = root.to_string_lossy().to_string();
    let label = root
        .file_name()
        .and_then(|n| n.to_str())
        .map(|s| s.to_string());

    let conn = db.conn();
    let existing_id = find_root_id_by_key(db, &root)?;
    let root_id = if let Some(id) = existing_id {
        conn.execute(
            "UPDATE library_roots SET enabled = 1, label = COALESCE(?1, label) WHERE id = ?2",
            params![label, id],
        )?;
        id
    } else {
        conn.execute(
            "INSERT INTO library_roots (path, label, enabled) VALUES (?1, ?2, 1)",
            params![root_path, label],
        )?;
        conn.last_insert_rowid()
    };

    prune_descendant_roots(db, root_id, &root)?;
    Ok(root_id)
}

/// Enabled library folders to walk on Rescan (top-level only — no nested duplicates).
pub fn list_top_level_library_roots(db: &Database) -> Result<Vec<String>, AppError> {
    let conn = db.conn();
    let mut stmt = conn.prepare("SELECT path FROM library_roots WHERE enabled = 1")?;
    let paths = stmt
        .query_map([], |row| row.get::<_, String>(0))?
        .collect::<Result<Vec<_>, _>>()?;

    let mut tops: Vec<String> = Vec::new();
    for path in &paths {
        let candidate = PathBuf::from(path);
        let nested = paths.iter().any(|other| {
            other != path && path_is_within(Path::new(other), &candidate)
        });
        if !nested {
            tops.push(normalize_path_string(&candidate));
        }
    }
    tops.sort();
    tops.dedup();
    Ok(tops)
}

/// User-facing library sources (folders they added), with indexed track counts.
pub fn list_library_root_summaries(db: &Database) -> Result<Vec<LibraryRootSummary>, AppError> {
    let conn = db.conn();
    let mut stmt = conn.prepare(
        "SELECT r.id, r.path, COALESCE(NULLIF(r.label, ''), r.path),
                (SELECT COUNT(*)
                 FROM tracks t
                 JOIN files f ON f.id = t.file_id
                 LEFT JOIN folders fo ON fo.id = f.folder_id
                 WHERE t.missing = 0
                   AND (
                     fo.root_id = r.id
                     OR lower(replace(f.path, '\\', '/'))
                        LIKE lower(replace(r.path, '\\', '/')) || '/%'
                     OR lower(replace(f.path, '\\', '/'))
                        = lower(replace(r.path, '\\', '/'))
                   )
                ) as track_count
         FROM library_roots r
         WHERE r.enabled = 1
         ORDER BY r.label COLLATE NOCASE, r.path COLLATE NOCASE",
    )?;
    let items = stmt
        .query_map([], |row| {
            Ok(LibraryRootSummary {
                id: row.get(0)?,
                path: row.get(1)?,
                label: row.get(2)?,
                track_count: row.get(3)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(items)
}

/// Refresh favorite snapshots for tracks about to leave the library.
fn preserve_favorites_for_file_ids(db: &Database, file_ids: &[i64]) -> Result<(), AppError> {
    crate::library::listening::preserve_favorites_for_file_ids(db, file_ids)
}

/// Hard-delete file index rows after snapshotting any liked metadata.
pub fn delete_files_preserving_favorites(
    db: &Database,
    file_ids: &[i64],
) -> Result<(), AppError> {
    preserve_favorites_for_file_ids(db, file_ids)?;
    let conn = db.conn();
    for file_id in file_ids {
        // tracks / playlist_items cascade from files → tracks
        conn.execute("DELETE FROM files WHERE id = ?1", params![file_id])?;
    }
    Ok(())
}

/// Mark indexed files under `scan_roots` as missing when they were not seen this scan.
/// Liked metadata stays: we never delete favorites here — only flag the file gone.
pub fn mark_absent_files_missing(
    db: &Database,
    scan_roots: &[std::path::PathBuf],
    present_paths: &std::collections::HashSet<String>,
) -> Result<u64, AppError> {
    if scan_roots.is_empty() {
        return Ok(0);
    }
    use crate::library::paths::{normalize_path, path_is_within, path_key};

    let conn = db.conn();
    let mut stmt = conn.prepare("SELECT id, path FROM files")?;
    let rows = stmt
        .query_map([], |row| Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?)))?
        .collect::<Result<Vec<_>, _>>()?;
    drop(stmt);

    let roots: Vec<_> = scan_roots.iter().map(|p| normalize_path(p)).collect();
    let mut missing_ids: Vec<i64> = Vec::new();
    for (id, path) in rows {
        let normalized = normalize_path(std::path::Path::new(&path));
        let under_scan = roots.iter().any(|root| path_is_within(root, &normalized));
        if !under_scan {
            continue;
        }
        let key = path_key(&normalized);
        if present_paths.contains(&key) {
            continue;
        }
        missing_ids.push(id);
    }

    preserve_favorites_for_file_ids(db, &missing_ids)?;

    let conn = db.conn();
    for file_id in &missing_ids {
        conn.execute(
            "UPDATE files SET missing = 1 WHERE id = ?1",
            params![file_id],
        )?;
        conn.execute(
            "UPDATE tracks SET missing = 1 WHERE file_id = ?1",
            params![file_id],
        )?;
    }
    Ok(missing_ids.len() as u64)
}

/// Remove a library source from the index only — never deletes music files on disk.
pub fn remove_library_root(db: &Database, root_id: i64) -> Result<(), AppError> {
    let conn = db.conn();
    let root_path: String = conn
        .query_row(
            "SELECT path FROM library_roots WHERE id = ?1",
            params![root_id],
            |row| row.get(0),
        )
        .map_err(|_| AppError::Message("Library folder not found".into()))?;

    let root = normalize_path(Path::new(&root_path));

    let folder_ids: Vec<i64> = {
        let mut stmt = conn.prepare("SELECT id FROM folders WHERE root_id = ?1")?;
        let rows = stmt.query_map(params![root_id], |row| row.get(0))?;
        rows.collect::<Result<Vec<_>, _>>()?
    };

    let mut file_ids: Vec<i64> = Vec::new();
    {
        let mut stmt = conn.prepare("SELECT id, path, folder_id FROM files")?;
        let rows = stmt
            .query_map([], |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, Option<i64>>(2)?,
                ))
            })?
            .collect::<Result<Vec<_>, _>>()?;
        for (id, path, folder_id) in rows {
            let via_folder = folder_id
                .map(|fid| folder_ids.contains(&fid))
                .unwrap_or(false);
            if via_folder || path_is_within(&root, Path::new(&path)) {
                file_ids.push(id);
            }
        }
    }

    // Keep liked songs even after the index rows are gone.
    delete_files_preserving_favorites(db, &file_ids)?;

    conn.execute("DELETE FROM library_roots WHERE id = ?1", params![root_id])?;
    Ok(())
}

fn resolve_library_root(
    db: &Database,
    file_path: &Path,
    folder_path: &Path,
) -> Result<i64, AppError> {
    if let Some(id) = find_covering_root(db, file_path)? {
        return Ok(id);
    }
    // Fallback for a single dropped file with no chosen folder yet.
    insert_library_root(db, folder_path)
}

fn find_covering_root(db: &Database, file_path: &Path) -> Result<Option<i64>, AppError> {
    let conn = db.conn();
    let mut stmt = conn.prepare("SELECT id, path FROM library_roots WHERE enabled = 1")?;
    let roots = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?
        .collect::<Result<Vec<(i64, String)>, _>>()?;
    drop(stmt);

    let mut best: Option<(i64, usize)> = None;
    for (id, path) in roots {
        let root = PathBuf::from(&path);
        if path_is_within(&root, file_path) {
            let key_len = path_key(&root).len();
            if best.map(|(_, len)| key_len > len).unwrap_or(true) {
                best = Some((id, key_len));
            }
        }
    }
    Ok(best.map(|(id, _)| id))
}

fn find_root_id_by_key(db: &Database, folder_path: &Path) -> Result<Option<i64>, AppError> {
    let want = path_key(folder_path);
    let conn = db.conn();
    let mut stmt = conn.prepare("SELECT id, path FROM library_roots")?;
    let roots = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?
        .collect::<Result<Vec<(i64, String)>, _>>()?;
    for (id, path) in roots {
        if path_key(Path::new(&path)) == want {
            return Ok(Some(id));
        }
    }
    Ok(None)
}

fn insert_library_root(db: &Database, folder_path: &Path) -> Result<i64, AppError> {
    if let Some(id) = find_root_id_by_key(db, folder_path)? {
        return Ok(id);
    }
    if let Some(id) = find_covering_root(db, folder_path)? {
        return Ok(id);
    }

    let root = normalize_path(folder_path);
    let root_path = root.to_string_lossy().to_string();
    let conn = db.conn();
    conn.execute(
        "INSERT INTO library_roots (path, label, enabled) VALUES (?1, ?2, 1)",
        params![root_path, root.file_name().and_then(|n| n.to_str())],
    )?;
    Ok(conn.last_insert_rowid())
}

fn prune_descendant_roots(
    db: &Database,
    parent_root_id: i64,
    parent_path: &Path,
) -> Result<(), AppError> {
    let conn = db.conn();
    let mut stmt = conn.prepare("SELECT id, path FROM library_roots WHERE id != ?1")?;
    let children = stmt
        .query_map(params![parent_root_id], |row| Ok((row.get(0)?, row.get(1)?)))?
        .collect::<Result<Vec<(i64, String)>, _>>()?;
    drop(stmt);

    for (child_id, child_path) in children {
        let child = PathBuf::from(&child_path);
        if !path_is_within(parent_path, &child) {
            continue;
        }
        // Keep folder rows; retarget them to the user-chosen root, then drop the nested root.
        conn.execute(
            "UPDATE folders SET root_id = ?1 WHERE root_id = ?2",
            params![parent_root_id, child_id],
        )?;
        conn.execute(
            "UPDATE scan_jobs SET root_id = NULL WHERE root_id = ?1",
            params![child_id],
        )?;
        conn.execute("DELETE FROM library_roots WHERE id = ?1", params![child_id])?;
    }
    Ok(())
}

fn ensure_folder(
    db: &Database,
    root_id: i64,
    folder_path: &Path,
    name: &str,
) -> Result<i64, AppError> {
    let path = normalize_path_string(folder_path);
    let conn = db.conn();
    if let Some(id) = conn
        .query_row(
            "SELECT id FROM folders WHERE path = ?1",
            params![path],
            |row| row.get::<_, i64>(0),
        )
        .optional()?
    {
        conn.execute(
            "UPDATE folders SET root_id = ?1, name = ?2 WHERE id = ?3",
            params![root_id, name, id],
        )?;
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
        missing: false,
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
                t.year, t.track_number, t.duration_ms, t.has_artwork, COALESCE(a.cache_key, t.artwork_cache_key), t.date_added
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
