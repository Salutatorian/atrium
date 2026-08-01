use crate::database::Database;
use crate::error::AppError;
use crate::library::models::TrackSummary;
use crate::library::repository::{decorate_artwork_paths, map_track_row};
use rusqlite::{params, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryEntry {
    pub id: i64,
    pub played_at: String,
    pub duration_listened_ms: Option<i64>,
    pub completed: bool,
    pub track: Option<TrackSummary>,
    pub title: Option<String>,
    pub artist: Option<String>,
    pub album: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScrobbleInput {
    pub track_id: Option<i64>,
    pub title: String,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub duration_ms: Option<i64>,
    pub listened_ms: i64,
    pub completed: bool,
    /// Stable id so crash-recovery flushes do not double-count.
    pub client_event_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StatsOverview {
    pub total_scrobbles: i64,
    pub unique_tracks: i64,
    pub unique_artists: i64,
    pub total_listen_ms: i64,
    pub completed_plays: i64,
    pub skips: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrackStat {
    pub identity_key: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub track_id: Option<i64>,
    pub play_count: i64,
    pub skip_count: i64,
    pub total_listen_ms: i64,
    pub last_played_at: Option<String>,
    pub first_played_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ArtistStat {
    pub artist: String,
    pub play_count: i64,
    pub total_listen_ms: i64,
    pub track_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AlbumStat {
    pub album: String,
    pub artist: String,
    pub play_count: i64,
    pub total_listen_ms: i64,
    pub track_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScrobbleEntry {
    pub id: i64,
    pub played_at: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub listened_ms: i64,
    pub duration_ms: Option<i64>,
    pub completed: bool,
    pub skipped: bool,
    pub track_id: Option<i64>,
}

fn identity_key(title: &str, artist: &str, album: &str) -> String {
    format!(
        "{}||{}||{}",
        title.trim().to_lowercase(),
        artist.trim().to_lowercase(),
        album.trim().to_lowercase()
    )
}

fn range_clause(range: &str) -> &'static str {
    match range {
        "week" => "played_at >= datetime('now', '-7 days')",
        "month" => "played_at >= datetime('now', '-30 days')",
        // Calendar year — resets each Jan 1. All-time stays permanent.
        "year" => "played_at >= date('now', 'start of year')",
        _ => "1=1",
    }
}

pub fn list_favorites(
    db: &Database,
    data_dir: &Path,
) -> Result<Vec<TrackSummary>, AppError> {
    relink_favorites_to_live_tracks(db)?;
    let conn = db.conn();
    let mut stmt = conn.prepare(
        "SELECT
            CAST(fav.entity_id AS INTEGER) as id,
            COALESCE(NULLIF(t.track_uid, ''), fav.track_uid, '') as track_uid,
            COALESCE(NULLIF(f.path, ''), fav.path, '') as path,
            COALESCE(NULLIF(t.title, ''), fav.title) as title,
            COALESCE(NULLIF(t.artist, ''), fav.artist) as artist,
            COALESCE(NULLIF(t.album, ''), fav.album) as album,
            COALESCE(NULLIF(t.album_artist, ''), fav.album_artist) as album_artist,
            COALESCE(NULLIF(t.genre, ''), fav.genre) as genre,
            COALESCE(t.year, fav.year) as year,
            COALESCE(t.track_number, fav.track_number) as track_number,
            COALESCE(t.duration_ms, fav.duration_ms) as duration_ms,
            CASE
              WHEN t.id IS NOT NULL
                   AND t.missing = 0
                   AND COALESCE(f.missing, 1) = 0
                   AND t.has_artwork = 1
                THEN 1
              WHEN fav.has_artwork = 1 THEN 1
              ELSE 0
            END as has_artwork,
            COALESCE(a.cache_key, t.artwork_cache_key, fav.artwork_cache_key) as artwork_cache_key,
            COALESCE(t.date_added, fav.created_at) as date_added,
            CASE
              WHEN t.id IS NULL THEN 1
              WHEN t.missing != 0 THEN 1
              WHEN COALESCE(f.missing, 1) != 0 THEN 1
              ELSE 0
            END as is_missing
         FROM favorites fav
         LEFT JOIN tracks t ON t.id = CAST(fav.entity_id AS INTEGER)
         LEFT JOIN files f ON f.id = t.file_id
         LEFT JOIN albums al ON al.id = t.album_id
         LEFT JOIN artwork a ON a.id = al.artwork_id
         WHERE fav.entity_type = 'track'
         ORDER BY fav.created_at DESC",
    )?;
    let items = stmt
        .query_map([], |row| {
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
                missing: row.get::<_, i64>(14)? != 0,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(decorate_artwork_paths(data_dir, items))
}

/// If a liked file is re-imported under a new track id, point the heart at the live row.
fn relink_favorites_to_live_tracks(db: &Database) -> Result<(), AppError> {
    db.conn().execute_batch(
        "
        UPDATE favorites
        SET entity_id = (
          SELECT CAST(t.id AS TEXT)
          FROM tracks t
          WHERE t.track_uid = favorites.track_uid
            AND t.missing = 0
          ORDER BY t.id DESC
          LIMIT 1
        )
        WHERE entity_type = 'track'
          AND track_uid IS NOT NULL
          AND track_uid != ''
          AND EXISTS (
            SELECT 1 FROM tracks t
            WHERE t.track_uid = favorites.track_uid AND t.missing = 0
          )
          AND NOT EXISTS (
            SELECT 1 FROM tracks t
            WHERE t.id = CAST(favorites.entity_id AS INTEGER)
              AND t.missing = 0
          );
        ",
    )?;
    Ok(())
}

pub fn is_favorite(db: &Database, track_id: i64) -> Result<bool, AppError> {
    if track_id <= 0 {
        return Ok(false);
    }
    let found: Option<i64> = db
        .conn()
        .query_row(
            "SELECT id FROM favorites WHERE entity_type = 'track' AND entity_id = ?1",
            params![track_id.to_string()],
            |row| row.get(0),
        )
        .optional()?;
    if found.is_some() {
        return Ok(true);
    }
    // Re-imported file: match durable snapshot by track_uid
    let found_uid: Option<i64> = db
        .conn()
        .query_row(
            "SELECT fav.id
             FROM favorites fav
             JOIN tracks t ON t.track_uid = fav.track_uid
             WHERE fav.entity_type = 'track'
               AND t.id = ?1
               AND fav.track_uid IS NOT NULL
               AND fav.track_uid != ''",
            params![track_id],
            |row| row.get(0),
        )
        .optional()?;
    Ok(found_uid.is_some())
}

/// Copy live track metadata into the favorites row. Safe to call before deleting index rows.
pub fn snapshot_favorite_row(db: &Database, track_id: i64) -> Result<(), AppError> {
    db.conn().execute(
        "UPDATE favorites
         SET
           title = (SELECT title FROM tracks WHERE id = ?1),
           artist = (SELECT artist FROM tracks WHERE id = ?1),
           album = (SELECT album FROM tracks WHERE id = ?1),
           album_artist = (SELECT album_artist FROM tracks WHERE id = ?1),
           genre = (SELECT genre FROM tracks WHERE id = ?1),
           year = (SELECT year FROM tracks WHERE id = ?1),
           track_number = (SELECT track_number FROM tracks WHERE id = ?1),
           duration_ms = (SELECT duration_ms FROM tracks WHERE id = ?1),
           path = (
             SELECT f.path FROM tracks t
             JOIN files f ON f.id = t.file_id
             WHERE t.id = ?1
           ),
           track_uid = (SELECT track_uid FROM tracks WHERE id = ?1),
           artwork_cache_key = COALESCE(
             (
               SELECT a.cache_key
               FROM tracks t
               LEFT JOIN albums al ON al.id = t.album_id
               LEFT JOIN artwork a ON a.id = al.artwork_id
               WHERE t.id = ?1
             ),
             (SELECT artwork_cache_key FROM tracks WHERE id = ?1)
           ),
           has_artwork = (
             SELECT CASE WHEN has_artwork = 1 THEN 1 ELSE 0 END FROM tracks WHERE id = ?1
           )
         WHERE entity_type = 'track' AND entity_id = ?2",
        params![track_id, track_id.to_string()],
    )?;
    Ok(())
}

/// Snapshot every liked track tied to these files (call before hard-deleting index rows).
pub fn preserve_favorites_for_file_ids(db: &Database, file_ids: &[i64]) -> Result<(), AppError> {
    if file_ids.is_empty() {
        return Ok(());
    }
    let conn = db.conn();
    for file_id in file_ids {
        let track_id: Option<i64> = conn
            .query_row(
                "SELECT id FROM tracks WHERE file_id = ?1",
                params![file_id],
                |row| row.get(0),
            )
            .optional()?;
        let Some(track_id) = track_id else {
            continue;
        };
        let liked = is_favorite(db, track_id)?;
        if liked {
            snapshot_favorite_row(db, track_id)?;
        }
    }
    Ok(())
}

pub fn toggle_favorite(db: &Database, track_id: i64) -> Result<bool, AppError> {
    if track_id <= 0 {
        return Err(AppError::Message(
            "Only library tracks can be favorited".into(),
        ));
    }
    let exists = is_favorite(db, track_id)?;
    if exists {
        // Remove by id and by matching track_uid so re-imports don't leave orphans.
        let track_uid: Option<String> = db
            .conn()
            .query_row(
                "SELECT track_uid FROM tracks WHERE id = ?1",
                params![track_id],
                |row| row.get(0),
            )
            .optional()?;
        db.conn().execute(
            "DELETE FROM favorites WHERE entity_type = 'track' AND entity_id = ?1",
            params![track_id.to_string()],
        )?;
        if let Some(uid) = track_uid.filter(|u| !u.is_empty()) {
            db.conn().execute(
                "DELETE FROM favorites WHERE entity_type = 'track' AND track_uid = ?1",
                params![uid],
            )?;
        }
        Ok(false)
    } else {
        let track_exists: Option<i64> = db
            .conn()
            .query_row(
                "SELECT id FROM tracks WHERE id = ?1",
                params![track_id],
                |row| row.get(0),
            )
            .optional()?;
        if track_exists.is_none() {
            // Orphaned liked row (file gone): allow unlike via entity_id only.
            let orphan: Option<i64> = db
                .conn()
                .query_row(
                    "SELECT id FROM favorites WHERE entity_type = 'track' AND entity_id = ?1",
                    params![track_id.to_string()],
                    |row| row.get(0),
                )
                .optional()?;
            if orphan.is_some() {
                db.conn().execute(
                    "DELETE FROM favorites WHERE entity_type = 'track' AND entity_id = ?1",
                    params![track_id.to_string()],
                )?;
                return Ok(false);
            }
            return Err(AppError::Message("Track not found".into()));
        }
        db.conn().execute(
            "INSERT INTO favorites (entity_type, entity_id) VALUES ('track', ?1)",
            params![track_id.to_string()],
        )?;
        snapshot_favorite_row(db, track_id)?;
        Ok(true)
    }
}

/// Records one listen. Metadata is snapshotted so stats survive file deletion.
pub fn record_scrobble(db: &Database, input: ScrobbleInput) -> Result<(), AppError> {
    let listened = input.listened_ms.max(0);
    // Ignore tiny accidental blips.
    if listened < 3_000 && !input.completed {
        return Ok(());
    }

    let title = {
        let t = input.title.trim();
        if t.is_empty() {
            "Unknown title"
        } else {
            t
        }
    }
    .to_string();
    let artist = input
        .artist
        .as_deref()
        .unwrap_or("")
        .trim()
        .to_string();
    let album = input
        .album
        .as_deref()
        .unwrap_or("")
        .trim()
        .to_string();
    let key = identity_key(&title, &artist, &album);

    let duration = input.duration_ms.filter(|d| *d > 0);
    let completed = input.completed
        || duration
            .map(|d| listened >= (d / 2).min(240_000).max(30_000))
            .unwrap_or(listened >= 30_000);
    // Quick bail still flagged as skip, but every real listen counts as a play.
    let skipped = !completed && listened < 30_000;

    let track_id = input.track_id.filter(|id| *id > 0);
    let client_event_id = input
        .client_event_id
        .as_deref()
        .map(str::trim)
        .filter(|id| !id.is_empty())
        .map(str::to_string);
    let conn = db.conn();

    if let Some(ref event_id) = client_event_id {
        let exists: Option<i64> = conn
            .query_row(
                "SELECT id FROM scrobbles WHERE client_event_id = ?1",
                params![event_id],
                |row| row.get(0),
            )
            .optional()?;
        if exists.is_some() {
            return Ok(());
        }
    }

    conn.execute(
        "INSERT INTO scrobbles
            (track_id, identity_key, title, artist, album, duration_ms, listened_ms, completed, skipped, client_event_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            track_id,
            key,
            title,
            artist,
            album,
            duration,
            listened,
            completed as i64,
            skipped as i64,
            client_event_id
        ],
    )?;

    conn.execute(
        "INSERT INTO listen_stats
            (identity_key, title, artist, album, track_id, play_count, skip_count, total_listen_ms, last_played_at, first_played_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, datetime('now'), datetime('now'))
         ON CONFLICT(identity_key) DO UPDATE SET
           title = excluded.title,
           artist = excluded.artist,
           album = excluded.album,
           track_id = COALESCE(excluded.track_id, listen_stats.track_id),
           play_count = listen_stats.play_count + excluded.play_count,
           skip_count = listen_stats.skip_count + excluded.skip_count,
           total_listen_ms = listen_stats.total_listen_ms + excluded.total_listen_ms,
           last_played_at = datetime('now')",
        params![
            key,
            title,
            artist,
            album,
            track_id,
            1, // always count unfinished listens
            if skipped { 1 } else { 0 },
            listened
        ],
    )?;

    // Keep legacy tables in sync when we still have a library track id.
    if let Some(id) = track_id {
        let exists: Option<i64> = conn
            .query_row(
                "SELECT id FROM tracks WHERE id = ?1",
                params![id],
                |row| row.get(0),
            )
            .optional()?;
        if exists.is_some() {
            conn.execute(
                "INSERT INTO play_history (track_id, duration_listened_ms, completed)
                 VALUES (?1, ?2, ?3)",
                params![id, listened, completed as i64],
            )?;
            conn.execute(
                "INSERT INTO track_statistics (track_id, play_count, skip_count, total_listen_ms, last_played_at)
                 VALUES (?1, ?2, ?3, ?4, datetime('now'))
                 ON CONFLICT(track_id) DO UPDATE SET
                   play_count = play_count + excluded.play_count,
                   skip_count = skip_count + excluded.skip_count,
                   total_listen_ms = total_listen_ms + excluded.total_listen_ms,
                   last_played_at = datetime('now')",
                params![
                    id,
                    1, // always count unfinished listens
                    if skipped { 1 } else { 0 },
                    listened
                ],
            )?;
        }
    }

    Ok(())
}

/// Backward-compatible wrapper used by older callers.
pub fn record_play(
    db: &Database,
    track_id: i64,
    duration_listened_ms: Option<i64>,
    completed: bool,
) -> Result<(), AppError> {
    if track_id <= 0 {
        return Ok(());
    }
    let conn = db.conn();
    let meta: Option<(
        Option<String>,
        Option<String>,
        Option<String>,
        Option<i64>,
    )> = conn
        .query_row(
            "SELECT title, artist, album, duration_ms FROM tracks WHERE id = ?1",
            params![track_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )
        .optional()?;
    let Some((title, artist, album, duration_ms)) = meta else {
        return Ok(());
    };
    record_scrobble(
        db,
        ScrobbleInput {
            track_id: Some(track_id),
            title: title.unwrap_or_else(|| "Unknown title".into()),
            artist,
            album,
            duration_ms,
            listened_ms: duration_listened_ms.unwrap_or(0),
            completed,
            client_event_id: None,
        },
    )
}

pub fn list_history(
    db: &Database,
    data_dir: &Path,
    limit: i64,
) -> Result<Vec<HistoryEntry>, AppError> {
    let limit = limit.clamp(1, 200);
    // Prefer durable scrobbles when available.
    let conn = db.conn();
    let scrobble_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM scrobbles", [], |row| row.get(0))
        .unwrap_or(0);
    if scrobble_count > 0 {
        let mut stmt = conn.prepare(
            "SELECT id, played_at, listened_ms, completed, track_id, title, artist, album
             FROM scrobbles
             ORDER BY played_at DESC
             LIMIT ?1",
        )?;
        let rows = stmt
            .query_map(params![limit], |row| {
                Ok(HistoryEntry {
                    id: row.get(0)?,
                    played_at: row.get(1)?,
                    duration_listened_ms: row.get(2)?,
                    completed: row.get::<_, i64>(3)? != 0,
                    track: None,
                    title: Some(row.get(5)?),
                    artist: Some(row.get(6)?),
                    album: Some(row.get(7)?),
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        return Ok(rows);
    }

    let mut stmt = conn.prepare(
        "SELECT h.id, h.played_at, h.duration_listened_ms, h.completed, h.track_id,
                t.track_uid, f.path, t.title, t.artist, t.album, t.album_artist, t.genre,
                t.year, t.track_number, t.duration_ms, t.has_artwork, COALESCE(a.cache_key, t.artwork_cache_key), t.date_added
         FROM play_history h
         LEFT JOIN tracks t ON t.id = h.track_id AND t.missing = 0
         LEFT JOIN files f ON f.id = t.file_id
         LEFT JOIN albums al ON al.id = t.album_id
         LEFT JOIN artwork a ON a.id = al.artwork_id
         ORDER BY h.played_at DESC
         LIMIT ?1",
    )?;
    let rows = stmt
        .query_map(params![limit], |row| {
            let track_id: Option<i64> = row.get(4)?;
            let title: Option<String> = row.get(7)?;
            let artist: Option<String> = row.get(8)?;
            let album: Option<String> = row.get(9)?;
            let track = if let Some(id) = track_id {
                let path: Option<String> = row.get(6)?;
                if path.is_some() {
                    Some(TrackSummary {
                        id,
                        track_uid: row.get(5)?,
                        path: row.get(6)?,
                        title: title.clone(),
                        artist: artist.clone(),
                        album: album.clone(),
                        album_artist: row.get(10)?,
                        genre: row.get(11)?,
                        year: row.get(12)?,
                        track_number: row.get(13)?,
                        duration_ms: row.get(14)?,
                        has_artwork: row.get::<_, Option<i64>>(15)?.unwrap_or(0) != 0,
                        artwork_cache_key: row.get(16)?,
                        date_added: row.get(17)?,
                        missing: false,
                    })
                } else {
                    None
                }
            } else {
                None
            };
            Ok(HistoryEntry {
                id: row.get(0)?,
                played_at: row.get(1)?,
                duration_listened_ms: row.get(2)?,
                completed: row.get::<_, i64>(3)? != 0,
                track,
                title,
                artist,
                album,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    let mut out = Vec::with_capacity(rows.len());
    for mut entry in rows {
        if let Some(track) = entry.track.take() {
            entry.track = decorate_artwork_paths(data_dir, vec![track])
                .into_iter()
                .next();
        }
        out.push(entry);
    }
    Ok(out)
}

pub fn list_recently_played(
    db: &Database,
    data_dir: &Path,
    limit: i64,
) -> Result<Vec<TrackSummary>, AppError> {
    let limit = limit.clamp(1, 200);
    let conn = db.conn();
    // Prefer durable listen_stats so recently-played survives downtime / track_statistics loss.
    let mut stmt = conn.prepare(
        "SELECT t.id, t.track_uid, f.path, t.title, t.artist, t.album, t.album_artist, t.genre,
                t.year, t.track_number, t.duration_ms, t.has_artwork, COALESCE(a.cache_key, t.artwork_cache_key), t.date_added
         FROM listen_stats s
         JOIN tracks t ON t.id = s.track_id
         JOIN files f ON f.id = t.file_id
         LEFT JOIN albums al ON al.id = t.album_id
         LEFT JOIN artwork a ON a.id = al.artwork_id
         WHERE t.missing = 0
           AND s.track_id IS NOT NULL
           AND s.last_played_at IS NOT NULL
         ORDER BY s.last_played_at DESC
         LIMIT ?1",
    )?;
    let from_stats = stmt
        .query_map(params![limit], |row| map_track_row(row))?
        .collect::<Result<Vec<_>, _>>()?;
    if !from_stats.is_empty() {
        return Ok(decorate_artwork_paths(data_dir, from_stats));
    }

    // Fallback for libraries that only have legacy track_statistics rows.
    let mut legacy = conn.prepare(
        "SELECT t.id, t.track_uid, f.path, t.title, t.artist, t.album, t.album_artist, t.genre,
                t.year, t.track_number, t.duration_ms, t.has_artwork, COALESCE(a.cache_key, t.artwork_cache_key), t.date_added
         FROM track_statistics s
         JOIN tracks t ON t.id = s.track_id
         JOIN files f ON f.id = t.file_id
         LEFT JOIN albums al ON al.id = t.album_id
         LEFT JOIN artwork a ON a.id = al.artwork_id
         WHERE t.missing = 0 AND s.last_played_at IS NOT NULL
         ORDER BY s.last_played_at DESC
         LIMIT ?1",
    )?;
    let items = legacy
        .query_map(params![limit], |row| map_track_row(row))?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(decorate_artwork_paths(data_dir, items))
}

pub fn stats_overview(db: &Database, range: &str) -> Result<StatsOverview, AppError> {
    let clause = range_clause(range);
    let sql = format!(
        "SELECT
            COUNT(*) as total_scrobbles,
            COUNT(DISTINCT identity_key) as unique_tracks,
            COUNT(DISTINCT CASE WHEN artist != '' THEN artist END) as unique_artists,
            COALESCE(SUM(listened_ms), 0) as total_listen_ms,
            COALESCE(SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END), 0) as completed_plays,
            COALESCE(SUM(CASE WHEN skipped = 1 THEN 1 ELSE 0 END), 0) as skips
         FROM scrobbles
         WHERE {clause}"
    );
    let conn = db.conn();
    conn.query_row(&sql, [], |row| {
        Ok(StatsOverview {
            total_scrobbles: row.get(0)?,
            unique_tracks: row.get(1)?,
            unique_artists: row.get(2)?,
            total_listen_ms: row.get(3)?,
            completed_plays: row.get(4)?,
            skips: row.get(5)?,
        })
    })
    .map_err(Into::into)
}

pub fn stats_top_tracks(
    db: &Database,
    range: &str,
    limit: i64,
) -> Result<Vec<TrackStat>, AppError> {
    let limit = limit.clamp(1, 100);
    let clause = range_clause(range);
    let sql = format!(
        "SELECT identity_key,
                MAX(title) as title,
                MAX(artist) as artist,
                MAX(album) as album,
                MAX(track_id) as track_id,
                SUM(1) as play_count,
                SUM(CASE WHEN skipped = 1 THEN 1 ELSE 0 END) as skip_count,
                SUM(listened_ms) as total_listen_ms,
                MAX(played_at) as last_played_at,
                MIN(played_at) as first_played_at
         FROM scrobbles
         WHERE {clause}
         GROUP BY identity_key
         ORDER BY total_listen_ms DESC, play_count DESC
         LIMIT ?1"
    );
    let conn = db.conn();
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt
        .query_map(params![limit], |row| {
            Ok(TrackStat {
                identity_key: row.get(0)?,
                title: row.get(1)?,
                artist: row.get::<_, Option<String>>(2)?.unwrap_or_default(),
                album: row.get::<_, Option<String>>(3)?.unwrap_or_default(),
                track_id: row.get(4)?,
                play_count: row.get(5)?,
                skip_count: row.get(6)?,
                total_listen_ms: row.get(7)?,
                last_played_at: row.get(8)?,
                first_played_at: row.get(9)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

pub fn stats_top_artists(
    db: &Database,
    range: &str,
    limit: i64,
) -> Result<Vec<ArtistStat>, AppError> {
    let limit = limit.clamp(1, 100);
    let clause = range_clause(range);
    let sql = format!(
        "SELECT CASE WHEN artist = '' THEN 'Unknown artist' ELSE artist END as artist,
                SUM(1) as play_count,
                SUM(listened_ms) as total_listen_ms,
                COUNT(DISTINCT identity_key) as track_count
         FROM scrobbles
         WHERE {clause}
         GROUP BY CASE WHEN artist = '' THEN 'Unknown artist' ELSE artist END
         ORDER BY total_listen_ms DESC, play_count DESC
         LIMIT ?1"
    );
    let conn = db.conn();
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt
        .query_map(params![limit], |row| {
            Ok(ArtistStat {
                artist: row.get(0)?,
                play_count: row.get(1)?,
                total_listen_ms: row.get(2)?,
                track_count: row.get(3)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

pub fn stats_top_albums(
    db: &Database,
    range: &str,
    limit: i64,
) -> Result<Vec<AlbumStat>, AppError> {
    let limit = limit.clamp(1, 100);
    let clause = range_clause(range);
    let sql = format!(
        "SELECT CASE WHEN album = '' THEN 'Unknown album' ELSE album END as album,
                CASE WHEN artist = '' THEN 'Unknown artist' ELSE artist END as artist,
                SUM(1) as play_count,
                SUM(listened_ms) as total_listen_ms,
                COUNT(DISTINCT identity_key) as track_count
         FROM scrobbles
         WHERE {clause}
         GROUP BY CASE WHEN album = '' THEN 'Unknown album' ELSE album END,
                  CASE WHEN artist = '' THEN 'Unknown artist' ELSE artist END
         ORDER BY total_listen_ms DESC, play_count DESC
         LIMIT ?1"
    );
    let conn = db.conn();
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt
        .query_map(params![limit], |row| {
            Ok(AlbumStat {
                album: row.get(0)?,
                artist: row.get(1)?,
                play_count: row.get(2)?,
                total_listen_ms: row.get(3)?,
                track_count: row.get(4)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

pub fn list_scrobbles(db: &Database, limit: i64) -> Result<Vec<ScrobbleEntry>, AppError> {
    let limit = limit.clamp(1, 300);
    let conn = db.conn();
    let mut stmt = conn.prepare(
        "SELECT id, played_at, title, artist, album, listened_ms, duration_ms, completed, skipped, track_id
         FROM scrobbles
         ORDER BY played_at DESC
         LIMIT ?1",
    )?;
    let rows = stmt
        .query_map(params![limit], |row| {
            Ok(ScrobbleEntry {
                id: row.get(0)?,
                played_at: row.get(1)?,
                title: row.get(2)?,
                artist: row.get::<_, Option<String>>(3)?.unwrap_or_default(),
                album: row.get::<_, Option<String>>(4)?.unwrap_or_default(),
                listened_ms: row.get(5)?,
                duration_ms: row.get(6)?,
                completed: row.get::<_, i64>(7)? != 0,
                skipped: row.get::<_, i64>(8)? != 0,
                track_id: row.get(9)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

/// Every listen on a calendar day (YYYY-MM-DD), oldest → newest — repeats included.
pub fn list_scrobbles_for_day(db: &Database, day: &str) -> Result<Vec<ScrobbleEntry>, AppError> {
    let day = day.trim();
    if day.len() != 10 || !day.chars().all(|c| c.is_ascii_digit() || c == '-') {
        return Err(AppError::Message("Day must be YYYY-MM-DD".into()));
    }
    let conn = db.conn();
    let mut stmt = conn.prepare(
        "SELECT id, played_at, title, artist, album, listened_ms, duration_ms, completed, skipped, track_id
         FROM scrobbles
         WHERE date(played_at) = date(?1)
         ORDER BY played_at ASC",
    )?;
    let rows = stmt
        .query_map(params![day], |row| {
            Ok(ScrobbleEntry {
                id: row.get(0)?,
                played_at: row.get(1)?,
                title: row.get(2)?,
                artist: row.get::<_, Option<String>>(3)?.unwrap_or_default(),
                album: row.get::<_, Option<String>>(4)?.unwrap_or_default(),
                listened_ms: row.get(5)?,
                duration_ms: row.get(6)?,
                completed: row.get::<_, i64>(7)? != 0,
                skipped: row.get::<_, i64>(8)? != 0,
                track_id: row.get(9)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoryMoment {
    pub title: String,
    pub artist: String,
    pub played_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoryDay {
    pub day: String,
    pub total_listen_ms: i64,
    pub scrobbles: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoryMonth {
    pub month: i64,
    pub total_listen_ms: i64,
    pub scrobbles: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct YearStory {
    pub year: i32,
    pub total_listen_ms: i64,
    pub total_scrobbles: i64,
    pub unique_tracks: i64,
    pub unique_artists: i64,
    pub unfinished_listens: i64,
    pub top_tracks: Vec<TrackStat>,
    pub top_artists: Vec<ArtistStat>,
    pub first_listen: Option<StoryMoment>,
    pub last_listen: Option<StoryMoment>,
    pub deepest_day: Option<StoryDay>,
    pub months: Vec<StoryMonth>,
}

fn year_bounds(year: i32) -> (String, String) {
    (
        format!("{year:04}-01-01 00:00:00"),
        format!("{:04}-01-01 00:00:00", year + 1),
    )
}

pub fn list_story_years(db: &Database) -> Result<Vec<i32>, AppError> {
    let conn = db.conn();
    let mut stmt = conn.prepare(
        "SELECT DISTINCT CAST(strftime('%Y', played_at) AS INTEGER) as y
         FROM scrobbles
         WHERE played_at IS NOT NULL
         ORDER BY y DESC",
    )?;
    let years = stmt
        .query_map([], |row| row.get::<_, i32>(0))?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(years)
}

pub fn year_story(db: &Database, year: i32) -> Result<YearStory, AppError> {
    if !(1970..=2100).contains(&year) {
        return Err(AppError::Message("Year out of range".into()));
    }
    let (start, end) = year_bounds(year);
    let conn = db.conn();

    let overview = conn.query_row(
        "SELECT
            COUNT(*) as total_scrobbles,
            COUNT(DISTINCT identity_key) as unique_tracks,
            COUNT(DISTINCT CASE WHEN artist != '' THEN artist END) as unique_artists,
            COALESCE(SUM(listened_ms), 0) as total_listen_ms,
            COALESCE(SUM(CASE WHEN completed = 0 THEN 1 ELSE 0 END), 0) as unfinished
         FROM scrobbles
         WHERE played_at >= ?1 AND played_at < ?2",
        params![start, end],
        |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, i64>(2)?,
                row.get::<_, i64>(3)?,
                row.get::<_, i64>(4)?,
            ))
        },
    )?;

    let mut track_stmt = conn.prepare(
        "SELECT identity_key,
                MAX(title) as title,
                MAX(artist) as artist,
                MAX(album) as album,
                MAX(track_id) as track_id,
                SUM(1) as play_count,
                SUM(CASE WHEN skipped = 1 THEN 1 ELSE 0 END) as skip_count,
                SUM(listened_ms) as total_listen_ms,
                MAX(played_at) as last_played_at,
                MIN(played_at) as first_played_at
         FROM scrobbles
         WHERE played_at >= ?1 AND played_at < ?2
         GROUP BY identity_key
         ORDER BY total_listen_ms DESC, play_count DESC
         LIMIT 5",
    )?;
    let top_tracks = track_stmt
        .query_map(params![start, end], |row| {
            Ok(TrackStat {
                identity_key: row.get(0)?,
                title: row.get(1)?,
                artist: row.get::<_, Option<String>>(2)?.unwrap_or_default(),
                album: row.get::<_, Option<String>>(3)?.unwrap_or_default(),
                track_id: row.get(4)?,
                play_count: row.get(5)?,
                skip_count: row.get(6)?,
                total_listen_ms: row.get(7)?,
                last_played_at: row.get(8)?,
                first_played_at: row.get(9)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    let mut artist_stmt = conn.prepare(
        "SELECT CASE WHEN artist = '' THEN 'Unknown artist' ELSE artist END as artist,
                SUM(1) as play_count,
                SUM(listened_ms) as total_listen_ms,
                COUNT(DISTINCT identity_key) as track_count
         FROM scrobbles
         WHERE played_at >= ?1 AND played_at < ?2
         GROUP BY CASE WHEN artist = '' THEN 'Unknown artist' ELSE artist END
         ORDER BY total_listen_ms DESC, play_count DESC
         LIMIT 5",
    )?;
    let top_artists = artist_stmt
        .query_map(params![start, end], |row| {
            Ok(ArtistStat {
                artist: row.get(0)?,
                play_count: row.get(1)?,
                total_listen_ms: row.get(2)?,
                track_count: row.get(3)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    let first_listen = conn
        .query_row(
            "SELECT title, artist, played_at FROM scrobbles
             WHERE played_at >= ?1 AND played_at < ?2
             ORDER BY played_at ASC LIMIT 1",
            params![start, end],
            |row| {
                Ok(StoryMoment {
                    title: row.get(0)?,
                    artist: row.get::<_, Option<String>>(1)?.unwrap_or_default(),
                    played_at: row.get(2)?,
                })
            },
        )
        .optional()?;

    let last_listen = conn
        .query_row(
            "SELECT title, artist, played_at FROM scrobbles
             WHERE played_at >= ?1 AND played_at < ?2
             ORDER BY played_at DESC LIMIT 1",
            params![start, end],
            |row| {
                Ok(StoryMoment {
                    title: row.get(0)?,
                    artist: row.get::<_, Option<String>>(1)?.unwrap_or_default(),
                    played_at: row.get(2)?,
                })
            },
        )
        .optional()?;

    let deepest_day = conn
        .query_row(
            "SELECT date(played_at) as day,
                    COALESCE(SUM(listened_ms), 0) as total_listen_ms,
                    COUNT(*) as scrobbles
             FROM scrobbles
             WHERE played_at >= ?1 AND played_at < ?2
             GROUP BY date(played_at)
             ORDER BY total_listen_ms DESC, scrobbles DESC
             LIMIT 1",
            params![start, end],
            |row| {
                Ok(StoryDay {
                    day: row.get(0)?,
                    total_listen_ms: row.get(1)?,
                    scrobbles: row.get(2)?,
                })
            },
        )
        .optional()?;

    let mut month_stmt = conn.prepare(
        "SELECT CAST(strftime('%m', played_at) AS INTEGER) as month,
                COALESCE(SUM(listened_ms), 0) as total_listen_ms,
                COUNT(*) as scrobbles
         FROM scrobbles
         WHERE played_at >= ?1 AND played_at < ?2
         GROUP BY strftime('%m', played_at)
         ORDER BY month ASC",
    )?;
    let months = month_stmt
        .query_map(params![start, end], |row| {
            Ok(StoryMonth {
                month: row.get(0)?,
                total_listen_ms: row.get(1)?,
                scrobbles: row.get(2)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(YearStory {
        year,
        total_listen_ms: overview.3,
        total_scrobbles: overview.0,
        unique_tracks: overview.1,
        unique_artists: overview.2,
        unfinished_listens: overview.4,
        top_tracks,
        top_artists,
        first_listen,
        last_listen,
        deepest_day,
        months,
    })
}

#[cfg(test)]
mod durable_favorites_tests {
    use super::*;
    use crate::database::open_database;
    use crate::library::repository::delete_files_preserving_favorites;
    use tempfile::tempdir;

    fn seed_track(db: &Database, title: &str, artist: &str) -> i64 {
        let conn = db.conn();
        conn.execute(
            "INSERT INTO files (path, display_path, size, mtime, extension, missing)
             VALUES (?1, ?1, 100, 1, 'mp3', 0)",
            params![format!("C:/music/{title}.mp3")],
        )
        .unwrap();
        let file_id = conn.last_insert_rowid();
        conn.execute(
            "INSERT INTO tracks (
                track_uid, file_id, title, sort_title, artist, album, duration_ms, missing
             ) VALUES (?1, ?2, ?3, ?3, ?4, 'Album', 180000, 0)",
            params![format!("uid-{title}"), file_id, title, artist],
        )
        .unwrap();
        conn.last_insert_rowid()
    }

    #[test]
    fn liked_metadata_survives_file_index_delete_until_unlike() {
        let dir = tempdir().unwrap();
        let db = open_database(&dir.path().join("t.db")).unwrap();
        let track_id = seed_track(&db, "Forever Song", "Keep Artist");
        assert!(toggle_favorite(&db, track_id).unwrap());

        let file_id: i64 = db
            .conn()
            .query_row(
                "SELECT file_id FROM tracks WHERE id = ?1",
                params![track_id],
                |row| row.get(0),
            )
            .unwrap();
        delete_files_preserving_favorites(&db, &[file_id]).unwrap();

        let gone: Option<i64> = db
            .conn()
            .query_row(
                "SELECT id FROM tracks WHERE id = ?1",
                params![track_id],
                |row| row.get(0),
            )
            .optional()
            .unwrap();
        assert!(gone.is_none());

        let liked = list_favorites(&db, dir.path()).unwrap();
        assert_eq!(liked.len(), 1);
        assert_eq!(liked[0].title.as_deref(), Some("Forever Song"));
        assert_eq!(liked[0].artist.as_deref(), Some("Keep Artist"));
        assert_eq!(liked[0].album.as_deref(), Some("Album"));
        assert!(liked[0].missing);

        assert!(!toggle_favorite(&db, track_id).unwrap());
        assert!(list_favorites(&db, dir.path()).unwrap().is_empty());
    }
}
