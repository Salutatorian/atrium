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
}

pub fn list_favorites(
    db: &Database,
    data_dir: &Path,
) -> Result<Vec<TrackSummary>, AppError> {
    let conn = db.conn();
    let mut stmt = conn.prepare(
        "SELECT t.id, t.track_uid, f.path, t.title, t.artist, t.album, t.album_artist, t.genre,
                t.year, t.track_number, t.duration_ms, t.has_artwork, a.cache_key, t.date_added
         FROM favorites fav
         JOIN tracks t ON t.id = CAST(fav.entity_id AS INTEGER)
         JOIN files f ON f.id = t.file_id
         LEFT JOIN albums al ON al.id = t.album_id
         LEFT JOIN artwork a ON a.id = al.artwork_id
         WHERE fav.entity_type = 'track' AND t.missing = 0
         ORDER BY fav.created_at DESC",
    )?;
    let items = stmt
        .query_map([], |row| map_track_row(row))?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(decorate_artwork_paths(data_dir, items))
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
    Ok(found.is_some())
}

pub fn toggle_favorite(db: &Database, track_id: i64) -> Result<bool, AppError> {
    if track_id <= 0 {
        return Err(AppError::Message(
            "Only library tracks can be favorited".into(),
        ));
    }
    let exists = is_favorite(db, track_id)?;
    if exists {
        db.conn().execute(
            "DELETE FROM favorites WHERE entity_type = 'track' AND entity_id = ?1",
            params![track_id.to_string()],
        )?;
        Ok(false)
    } else {
        let track_exists: Option<i64> = db
            .conn()
            .query_row(
                "SELECT id FROM tracks WHERE id = ?1 AND missing = 0",
                params![track_id],
                |row| row.get(0),
            )
            .optional()?;
        if track_exists.is_none() {
            return Err(AppError::Message("Track not found".into()));
        }
        db.conn().execute(
            "INSERT INTO favorites (entity_type, entity_id) VALUES ('track', ?1)",
            params![track_id.to_string()],
        )?;
        Ok(true)
    }
}

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
    let exists: Option<i64> = conn
        .query_row(
            "SELECT id FROM tracks WHERE id = ?1",
            params![track_id],
            |row| row.get(0),
        )
        .optional()?;
    if exists.is_none() {
        return Ok(());
    }

    conn.execute(
        "INSERT INTO play_history (track_id, duration_listened_ms, completed)
         VALUES (?1, ?2, ?3)",
        params![track_id, duration_listened_ms, completed as i64],
    )?;

    conn.execute(
        "INSERT INTO track_statistics (track_id, play_count, skip_count, total_listen_ms, last_played_at)
         VALUES (?1, 1, 0, COALESCE(?2, 0), datetime('now'))
         ON CONFLICT(track_id) DO UPDATE SET
           play_count = play_count + 1,
           total_listen_ms = total_listen_ms + COALESCE(?2, 0),
           last_played_at = datetime('now')",
        params![track_id, duration_listened_ms],
    )?;
    Ok(())
}

pub fn list_history(
    db: &Database,
    data_dir: &Path,
    limit: i64,
) -> Result<Vec<HistoryEntry>, AppError> {
    let limit = limit.clamp(1, 200);
    let conn = db.conn();
    let mut stmt = conn.prepare(
        "SELECT h.id, h.played_at, h.duration_listened_ms, h.completed, h.track_id,
                t.track_uid, f.path, t.title, t.artist, t.album, t.album_artist, t.genre,
                t.year, t.track_number, t.duration_ms, t.has_artwork, a.cache_key, t.date_added
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
            let track = if let Some(id) = track_id {
                let path: Option<String> = row.get(6)?;
                if path.is_some() {
                    Some(TrackSummary {
                        id,
                        track_uid: row.get(5)?,
                        path: row.get(6)?,
                        title: row.get(7)?,
                        artist: row.get(8)?,
                        album: row.get(9)?,
                        album_artist: row.get(10)?,
                        genre: row.get(11)?,
                        year: row.get(12)?,
                        track_number: row.get(13)?,
                        duration_ms: row.get(14)?,
                        has_artwork: row.get::<_, Option<i64>>(15)?.unwrap_or(0) != 0,
                        artwork_cache_key: row.get(16)?,
                        date_added: row.get(17)?,
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
    let mut stmt = conn.prepare(
        "SELECT t.id, t.track_uid, f.path, t.title, t.artist, t.album, t.album_artist, t.genre,
                t.year, t.track_number, t.duration_ms, t.has_artwork, a.cache_key, t.date_added
         FROM track_statistics s
         JOIN tracks t ON t.id = s.track_id
         JOIN files f ON f.id = t.file_id
         LEFT JOIN albums al ON al.id = t.album_id
         LEFT JOIN artwork a ON a.id = al.artwork_id
         WHERE t.missing = 0 AND s.last_played_at IS NOT NULL
         ORDER BY s.last_played_at DESC
         LIMIT ?1",
    )?;
    let items = stmt
        .query_map(params![limit], |row| map_track_row(row))?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(decorate_artwork_paths(data_dir, items))
}

pub fn clear_history(db: &Database) -> Result<(), AppError> {
    db.conn().execute("DELETE FROM play_history", [])?;
    Ok(())
}
