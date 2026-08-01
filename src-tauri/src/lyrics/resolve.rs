use std::path::Path;

use crate::database::Database;
use crate::error::AppError;
use crate::lyrics::local::{read_embedded, read_sidecar};
use crate::lyrics::repository;
use crate::lyrics::types::LyricsPayload;
use crate::settings::AppSettings;

pub struct ResolveRequest<'a> {
    pub track_id: Option<i64>,
    pub path: &'a str,
    pub prefer_synchronized: bool,
}

pub fn resolve_local(
    db: &Database,
    request: ResolveRequest<'_>,
) -> Result<LyricsPayload, AppError> {
    let track_id = request.track_id.filter(|id| *id > 0);

    if let Some(id) = track_id {
        if let Some(cached) = repository::get_cached(db, id)? {
            return Ok(pick_preferred(cached, request.prefer_synchronized));
        }
    }

    let path = Path::new(request.path);
    let mut candidates = Vec::new();

    if let Some(embedded) = read_embedded(path, track_id)? {
        candidates.push(embedded);
    }
    if let Some(sidecar) = read_sidecar(path, track_id)? {
        candidates.push(sidecar);
    }

    let Some(best) = select_best(candidates, request.prefer_synchronized) else {
        let mut empty = LyricsPayload::empty();
        empty.track_id = track_id;
        return Ok(empty);
    };

    if let Some(id) = track_id {
        let saved = repository::upsert(
            db,
            id,
            best.plain_text.as_deref(),
            best.synced_lrc.as_deref(),
            &best.source,
            &best.provider_id,
            best.offset_ms,
            false,
            best.source_url.as_deref(),
        )?;
        return Ok(saved);
    }

    Ok(best)
}

pub fn network_allowed(settings: &AppSettings) -> bool {
    settings.privacy.allow_network && settings.privacy.allow_lyrics_providers
}

fn select_best(mut candidates: Vec<LyricsPayload>, prefer_synchronized: bool) -> Option<LyricsPayload> {
    if candidates.is_empty() {
        return None;
    }
    candidates.sort_by_key(|payload| {
        let synced = payload.synced_lrc.as_ref().is_some_and(|s| !s.trim().is_empty());
        let rank = if prefer_synchronized {
            if synced {
                0
            } else {
                1
            }
        } else if synced {
            1
        } else {
            0
        };
        (rank, source_rank(&payload.source))
    });
    candidates.into_iter().next()
}

fn pick_preferred(payload: LyricsPayload, prefer_synchronized: bool) -> LyricsPayload {
    let _ = prefer_synchronized;
    payload
}

fn source_rank(source: &str) -> u8 {
    match source {
        "embedded" => 0,
        "sidecar-lrc" => 1,
        "sidecar-txt" => 2,
        "manual" => 3,
        "lrclib" => 4,
        _ => 9,
    }
}
