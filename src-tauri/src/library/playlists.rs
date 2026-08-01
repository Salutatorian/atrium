use crate::database::Database;
use crate::error::AppError;
use crate::library::models::{Page, TrackSummary};
use crate::library::repository::{decorate_artwork_paths, map_track_row};
use rusqlite::{params, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::path::Path;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlaylistSummary {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub track_count: i64,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SmartPlaylistSummary {
    pub id: String,
    pub name: String,
    pub rules_json: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SmartPlaylistRules {
    #[serde(default = "default_match_all")]
    pub match_mode: String,
    pub rules: Vec<SmartRule>,
}

fn default_match_all() -> String {
    "all".into()
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SmartRule {
    pub field: String,
    pub op: String,
    pub value: String,
}

pub fn list_playlists(db: &Database) -> Result<Vec<PlaylistSummary>, AppError> {
    let conn = db.conn();
    let mut stmt = conn.prepare(
        "SELECT p.id, p.name, p.description, p.updated_at,
                (SELECT COUNT(*) FROM playlist_items i WHERE i.playlist_id = p.id) as track_count
         FROM playlists p
         ORDER BY lower(p.name)",
    )?;
    let rows = stmt
        .query_map([], |row| {
            Ok(PlaylistSummary {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                updated_at: row.get(3)?,
                track_count: row.get(4)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

pub fn create_playlist(
    db: &Database,
    name: &str,
    description: Option<&str>,
) -> Result<PlaylistSummary, AppError> {
    let name = name.trim();
    if name.is_empty() {
        return Err(AppError::Message("Playlist name is required".into()));
    }
    let id = Uuid::new_v4().to_string();
    let conn = db.conn();
    conn.execute(
        "INSERT INTO playlists (id, name, description) VALUES (?1, ?2, ?3)",
        params![id, name, description.map(str::trim).filter(|s| !s.is_empty())],
    )?;
    Ok(PlaylistSummary {
        id,
        name: name.to_string(),
        description: description.map(|s| s.trim().to_string()).filter(|s| !s.is_empty()),
        track_count: 0,
        updated_at: "now".into(),
    })
}

pub fn rename_playlist(db: &Database, id: &str, name: &str) -> Result<(), AppError> {
    let name = name.trim();
    if name.is_empty() {
        return Err(AppError::Message("Playlist name is required".into()));
    }
    let changed = db.conn().execute(
        "UPDATE playlists SET name = ?1, updated_at = datetime('now') WHERE id = ?2",
        params![name, id],
    )?;
    if changed == 0 {
        return Err(AppError::Message("Playlist not found".into()));
    }
    Ok(())
}

pub fn delete_playlist(db: &Database, id: &str) -> Result<(), AppError> {
    let changed = db
        .conn()
        .execute("DELETE FROM playlists WHERE id = ?1", params![id])?;
    if changed == 0 {
        return Err(AppError::Message("Playlist not found".into()));
    }
    Ok(())
}

pub fn list_playlist_tracks(
    db: &Database,
    data_dir: &Path,
    playlist_id: &str,
) -> Result<Vec<TrackSummary>, AppError> {
    let conn = db.conn();
    let mut stmt = conn.prepare(
        "SELECT t.id, t.track_uid, f.path, t.title, t.artist, t.album, t.album_artist, t.genre,
                t.year, t.track_number, t.duration_ms, t.has_artwork, a.cache_key, t.date_added
         FROM playlist_items i
         JOIN tracks t ON t.id = i.track_id
         JOIN files f ON f.id = t.file_id
         LEFT JOIN albums al ON al.id = t.album_id
         LEFT JOIN artwork a ON a.id = al.artwork_id
         WHERE i.playlist_id = ?1 AND t.missing = 0
         ORDER BY i.position",
    )?;
    let items = stmt
        .query_map(params![playlist_id], |row| map_track_row(row))?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(decorate_artwork_paths(data_dir, items))
}

pub fn add_tracks_to_playlist(
    db: &Database,
    playlist_id: &str,
    track_ids: &[i64],
) -> Result<i64, AppError> {
    if track_ids.is_empty() {
        return Ok(0);
    }
    let conn = db.conn();
    let exists: Option<String> = conn
        .query_row(
            "SELECT id FROM playlists WHERE id = ?1",
            params![playlist_id],
            |row| row.get(0),
        )
        .optional()?;
    if exists.is_none() {
        return Err(AppError::Message("Playlist not found".into()));
    }

    let mut next_pos: i64 = conn.query_row(
        "SELECT COALESCE(MAX(position), -1) + 1 FROM playlist_items WHERE playlist_id = ?1",
        params![playlist_id],
        |row| row.get(0),
    )?;

    let mut added = 0i64;
    for track_id in track_ids {
        let already: Option<i64> = conn
            .query_row(
                "SELECT id FROM playlist_items WHERE playlist_id = ?1 AND track_id = ?2",
                params![playlist_id, track_id],
                |row| row.get(0),
            )
            .optional()?;
        if already.is_some() {
            continue;
        }
        let inserted = conn.execute(
            "INSERT INTO playlist_items (playlist_id, track_id, position) VALUES (?1, ?2, ?3)",
            params![playlist_id, track_id, next_pos],
        )?;
        if inserted > 0 {
            added += 1;
            next_pos += 1;
        }
    }
    conn.execute(
        "UPDATE playlists SET updated_at = datetime('now') WHERE id = ?1",
        params![playlist_id],
    )?;
    Ok(added)
}

pub fn remove_track_from_playlist(
    db: &Database,
    playlist_id: &str,
    track_id: i64,
) -> Result<(), AppError> {
    let conn = db.conn();
    let changed = conn.execute(
        "DELETE FROM playlist_items WHERE playlist_id = ?1 AND track_id = ?2",
        params![playlist_id, track_id],
    )?;
    if changed == 0 {
        return Err(AppError::Message("Track not in playlist".into()));
    }
    // Compact positions
    let mut stmt = conn.prepare(
        "SELECT id FROM playlist_items WHERE playlist_id = ?1 ORDER BY position",
    )?;
    let ids: Vec<i64> = stmt
        .query_map(params![playlist_id], |row| row.get(0))?
        .collect::<Result<Vec<_>, _>>()?;
    for (pos, id) in ids.into_iter().enumerate() {
        conn.execute(
            "UPDATE playlist_items SET position = ?1 WHERE id = ?2",
            params![pos as i64, id],
        )?;
    }
    conn.execute(
        "UPDATE playlists SET updated_at = datetime('now') WHERE id = ?1",
        params![playlist_id],
    )?;
    Ok(())
}

pub fn list_smart_playlists(db: &Database) -> Result<Vec<SmartPlaylistSummary>, AppError> {
    let conn = db.conn();
    let mut stmt = conn.prepare(
        "SELECT id, name, rules_json, updated_at FROM smart_playlists ORDER BY lower(name)",
    )?;
    let rows = stmt
        .query_map([], |row| {
            Ok(SmartPlaylistSummary {
                id: row.get(0)?,
                name: row.get(1)?,
                rules_json: row.get(2)?,
                updated_at: row.get(3)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

pub fn create_smart_playlist(
    db: &Database,
    name: &str,
    rules: &SmartPlaylistRules,
) -> Result<SmartPlaylistSummary, AppError> {
    let name = name.trim();
    if name.is_empty() {
        return Err(AppError::Message("Smart playlist name is required".into()));
    }
    validate_rules(rules)?;
    let id = Uuid::new_v4().to_string();
    let rules_json = serde_json::to_string(rules)?;
    db.conn().execute(
        "INSERT INTO smart_playlists (id, name, rules_json) VALUES (?1, ?2, ?3)",
        params![id, name, rules_json],
    )?;
    Ok(SmartPlaylistSummary {
        id,
        name: name.to_string(),
        rules_json,
        updated_at: "now".into(),
    })
}

pub fn update_smart_playlist(
    db: &Database,
    id: &str,
    name: &str,
    rules: &SmartPlaylistRules,
) -> Result<(), AppError> {
    let name = name.trim();
    if name.is_empty() {
        return Err(AppError::Message("Smart playlist name is required".into()));
    }
    validate_rules(rules)?;
    let rules_json = serde_json::to_string(rules)?;
    let changed = db.conn().execute(
        "UPDATE smart_playlists SET name = ?1, rules_json = ?2, updated_at = datetime('now') WHERE id = ?3",
        params![name, rules_json, id],
    )?;
    if changed == 0 {
        return Err(AppError::Message("Smart playlist not found".into()));
    }
    Ok(())
}

pub fn delete_smart_playlist(db: &Database, id: &str) -> Result<(), AppError> {
    let changed = db
        .conn()
        .execute("DELETE FROM smart_playlists WHERE id = ?1", params![id])?;
    if changed == 0 {
        return Err(AppError::Message("Smart playlist not found".into()));
    }
    Ok(())
}

pub fn list_smart_playlist_tracks(
    db: &Database,
    data_dir: &Path,
    id: &str,
    offset: i64,
    limit: i64,
) -> Result<Page<TrackSummary>, AppError> {
    let conn = db.conn();
    let rules_json: String = conn
        .query_row(
            "SELECT rules_json FROM smart_playlists WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .map_err(|_| AppError::Message("Smart playlist not found".into()))?;
    let rules: SmartPlaylistRules = serde_json::from_str(&rules_json)?;
    evaluate_smart_rules(db, data_dir, &rules, offset, limit)
}

pub fn evaluate_smart_rules(
    db: &Database,
    data_dir: &Path,
    rules: &SmartPlaylistRules,
    offset: i64,
    limit: i64,
) -> Result<Page<TrackSummary>, AppError> {
    validate_rules(rules)?;
    let limit = limit.clamp(1, 200);
    let offset = offset.max(0);
    let conn = db.conn();
    let mut stmt = conn.prepare(
        "SELECT t.id, t.track_uid, f.path, t.title, t.artist, t.album, t.album_artist, t.genre,
                t.year, t.track_number, t.duration_ms, t.has_artwork, a.cache_key, t.date_added
         FROM tracks t
         JOIN files f ON f.id = t.file_id
         LEFT JOIN albums al ON al.id = t.album_id
         LEFT JOIN artwork a ON a.id = al.artwork_id
         WHERE t.missing = 0
         ORDER BY COALESCE(t.artist, ''), COALESCE(t.album, ''), COALESCE(t.track_number, 9999), COALESCE(t.title, '')",
    )?;
    let all = stmt
        .query_map([], |row| map_track_row(row))?
        .collect::<Result<Vec<_>, _>>()?;
    let filtered: Vec<TrackSummary> = all
        .into_iter()
        .filter(|track| track_matches_rules(track, rules))
        .collect();
    let total = filtered.len() as i64;
    let page = filtered
        .into_iter()
        .skip(offset as usize)
        .take(limit as usize)
        .collect::<Vec<_>>();
    Ok(Page {
        items: decorate_artwork_paths(data_dir, page),
        total,
        offset,
        limit,
    })
}

fn validate_rules(rules: &SmartPlaylistRules) -> Result<(), AppError> {
    if rules.rules.is_empty() {
        return Err(AppError::Message("Add at least one smart playlist rule".into()));
    }
    if rules.match_mode != "all" && rules.match_mode != "any" {
        return Err(AppError::Message("matchMode must be all or any".into()));
    }
    for rule in &rules.rules {
        if !matches!(
            rule.field.as_str(),
            "title" | "artist" | "album" | "albumArtist" | "genre" | "year"
        ) {
            return Err(AppError::Message(format!("Unsupported field: {}", rule.field)));
        }
        if !matches!(
            rule.op.as_str(),
            "contains" | "equals" | "startsWith" | "gte" | "lte"
        ) {
            return Err(AppError::Message(format!("Unsupported op: {}", rule.op)));
        }
        if rule.value.trim().is_empty() {
            return Err(AppError::Message("Rule value is required".into()));
        }
    }
    Ok(())
}

pub fn track_matches_rules(track: &TrackSummary, rules: &SmartPlaylistRules) -> bool {
    let results = rules.rules.iter().map(|rule| match_rule(track, rule));
    if rules.match_mode == "any" {
        results.into_iter().any(|v| v)
    } else {
        results.into_iter().all(|v| v)
    }
}

fn match_rule(track: &TrackSummary, rule: &SmartRule) -> bool {
    let needle = rule.value.trim();
    match rule.field.as_str() {
        "year" => {
            let Some(year) = track.year else {
                return false;
            };
            let Ok(target) = needle.parse::<i64>() else {
                return false;
            };
            match rule.op.as_str() {
                "equals" => year == target,
                "gte" => year >= target,
                "lte" => year <= target,
                _ => false,
            }
        }
        field => {
            let hay = match field {
                "title" => track.title.as_deref().unwrap_or(""),
                "artist" => track.artist.as_deref().unwrap_or(""),
                "album" => track.album.as_deref().unwrap_or(""),
                "albumArtist" => track.album_artist.as_deref().unwrap_or(""),
                "genre" => track.genre.as_deref().unwrap_or(""),
                _ => "",
            };
            let hay_l = hay.to_lowercase();
            let needle_l = needle.to_lowercase();
            match rule.op.as_str() {
                "contains" => hay_l.contains(&needle_l),
                "equals" => hay_l == needle_l,
                "startsWith" => hay_l.starts_with(&needle_l),
                _ => false,
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_track() -> TrackSummary {
        TrackSummary {
            id: 1,
            track_uid: "u".into(),
            path: "/a.flac".into(),
            title: Some("Blue in Green".into()),
            artist: Some("Miles Davis".into()),
            album: Some("Kind of Blue".into()),
            album_artist: Some("Miles Davis".into()),
            genre: Some("Jazz".into()),
            year: Some(1959),
            track_number: Some(3),
            duration_ms: Some(1000),
            has_artwork: false,
            artwork_cache_key: None,
            date_added: None,
        }
    }

    #[test]
    fn matches_artist_contains_and_year_gte() {
        let rules = SmartPlaylistRules {
            match_mode: "all".into(),
            rules: vec![
                SmartRule {
                    field: "artist".into(),
                    op: "contains".into(),
                    value: "miles".into(),
                },
                SmartRule {
                    field: "year".into(),
                    op: "gte".into(),
                    value: "1950".into(),
                },
            ],
        };
        assert!(track_matches_rules(&sample_track(), &rules));
    }

    #[test]
    fn any_mode_short_circuits() {
        let rules = SmartPlaylistRules {
            match_mode: "any".into(),
            rules: vec![
                SmartRule {
                    field: "genre".into(),
                    op: "equals".into(),
                    value: "Rock".into(),
                },
                SmartRule {
                    field: "title".into(),
                    op: "startsWith".into(),
                    value: "Blue".into(),
                },
            ],
        };
        assert!(track_matches_rules(&sample_track(), &rules));
    }
}
