use rusqlite::{params, OptionalExtension};

use crate::database::Database;
use crate::error::AppError;
use crate::lyrics::lrc::parse_lrc;
use crate::lyrics::types::LyricsPayload;

pub fn get_cached(db: &Database, track_id: i64) -> Result<Option<LyricsPayload>, AppError> {
    let conn = db.conn();
    // Prefer user-edited, then any synced, then newest.
    let row = conn
        .query_row(
            "SELECT plain_text, synced_lrc, source, provider_id, offset_ms, user_edited, source_url
             FROM lyrics
             WHERE track_id = ?1
             ORDER BY user_edited DESC,
                      CASE WHEN synced_lrc IS NOT NULL AND length(trim(synced_lrc)) > 0 THEN 0 ELSE 1 END,
                      id DESC
             LIMIT 1",
            params![track_id],
            |row| {
                Ok((
                    row.get::<_, Option<String>>(0)?,
                    row.get::<_, Option<String>>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, Option<String>>(3)?,
                    row.get::<_, i32>(4)?,
                    row.get::<_, i64>(5)?,
                    row.get::<_, Option<String>>(6)?,
                ))
            },
        )
        .optional()?;

    let Some((plain, synced, source, provider, offset_ms, user_edited, source_url)) = row else {
        return Ok(None);
    };

    let attribution = attribution_for_source(&source);
    let mut payload = LyricsPayload::with_content(
        Some(track_id),
        plain,
        synced,
        source,
        provider.unwrap_or_else(|| "local".into()),
        attribution,
    );
    payload.offset_ms = offset_ms;
    payload.user_edited = user_edited != 0;
    payload.source_url = source_url;
    if payload.lines.is_empty() {
        if let Some(lrc) = &payload.synced_lrc {
            payload.lines = parse_lrc(lrc);
        }
    }
    Ok(Some(payload).filter(|p| p.has_content()))
}

pub fn upsert(
    db: &Database,
    track_id: i64,
    plain_text: Option<&str>,
    synced_lrc: Option<&str>,
    source: &str,
    provider_id: &str,
    offset_ms: i32,
    user_edited: bool,
    source_url: Option<&str>,
) -> Result<LyricsPayload, AppError> {
    let conn = db.conn();
    conn.execute(
        "INSERT INTO lyrics (
            track_id, plain_text, synced_lrc, source, source_url, provider_id,
            offset_ms, user_edited, retrieved_at
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, datetime('now'))
         ON CONFLICT(track_id, source) DO UPDATE SET
            plain_text = excluded.plain_text,
            synced_lrc = excluded.synced_lrc,
            source_url = excluded.source_url,
            provider_id = excluded.provider_id,
            offset_ms = excluded.offset_ms,
            user_edited = excluded.user_edited,
            retrieved_at = datetime('now')",
        params![
            track_id,
            plain_text,
            synced_lrc,
            source,
            source_url,
            provider_id,
            offset_ms,
            user_edited as i64,
        ],
    )?;

    let mut payload = LyricsPayload::with_content(
        Some(track_id),
        plain_text.map(|s| s.to_string()),
        synced_lrc.map(|s| s.to_string()),
        source,
        provider_id,
        attribution_for_source(source),
    );
    payload.offset_ms = offset_ms;
    payload.user_edited = user_edited;
    payload.source_url = source_url.map(|s| s.to_string());
    Ok(payload)
}

pub fn set_offset(db: &Database, track_id: i64, offset_ms: i32) -> Result<LyricsPayload, AppError> {
    let conn = db.conn();
    let updated = conn.execute(
        "UPDATE lyrics SET offset_ms = ?1 WHERE track_id = ?2 AND id = (
            SELECT id FROM lyrics WHERE track_id = ?2
            ORDER BY user_edited DESC, id DESC LIMIT 1
         )",
        params![offset_ms, track_id],
    )?;
    if updated == 0 {
        return Err(AppError::Message("No cached lyrics to update".into()));
    }
    get_cached(db, track_id)?.ok_or_else(|| AppError::Message("Lyrics missing after update".into()))
}

fn attribution_for_source(source: &str) -> String {
    match source {
        "embedded" => "Embedded in file metadata".into(),
        "sidecar-lrc" => "Local .lrc sidecar".into(),
        "sidecar-txt" => "Local .txt sidecar".into(),
        "manual" => "Manually saved".into(),
        "lrclib" => "LRCLIB (lrclib.net)".into(),
        other => format!("Source: {other}"),
    }
}
