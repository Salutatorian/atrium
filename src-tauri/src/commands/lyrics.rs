use crate::app::AppState;
use crate::error::AppError;
use crate::lyrics::lrclib;
use crate::lyrics::providers::{LyricsSearchQuery, LyricsSearchResult};
use crate::lyrics::repository;
use crate::lyrics::resolve::{self, ResolveRequest};
use crate::lyrics::types::LyricsPayload;
use tauri::State;

#[tauri::command]
pub fn lyrics_resolve(
    state: State<'_, AppState>,
    track_id: Option<i64>,
    path: String,
    prefer_synchronized: Option<bool>,
) -> Result<LyricsPayload, AppError> {
    let prefer = prefer_synchronized.unwrap_or_else(|| {
        state.settings.lock().lyrics.prefer_synchronized
    });
    let db = state.db.lock();
    resolve::resolve_local(
        &db,
        ResolveRequest {
            track_id,
            path: &path,
            prefer_synchronized: prefer,
        },
    )
}

#[tauri::command]
pub fn lyrics_save(
    state: State<'_, AppState>,
    track_id: i64,
    plain_text: Option<String>,
    synced_lrc: Option<String>,
    offset_ms: Option<i32>,
) -> Result<LyricsPayload, AppError> {
    if track_id <= 0 {
        return Err(AppError::Message(
            "Save lyrics requires a library track".into(),
        ));
    }
    let offset = offset_ms.unwrap_or(0).clamp(-5000, 5000);
    let db = state.db.lock();
    repository::upsert(
        &db,
        track_id,
        plain_text.as_deref(),
        synced_lrc.as_deref(),
        "manual",
        "manual",
        offset,
        true,
        None,
    )
}

#[tauri::command]
pub fn lyrics_set_offset(
    state: State<'_, AppState>,
    track_id: i64,
    offset_ms: i32,
) -> Result<LyricsPayload, AppError> {
    if track_id <= 0 {
        return Err(AppError::Message(
            "Offset requires a library track".into(),
        ));
    }
    let offset = offset_ms.clamp(-5000, 5000);
    let db = state.db.lock();
    repository::set_offset(&db, track_id, offset)
}

#[tauri::command]
pub fn lyrics_search_lrclib(
    state: State<'_, AppState>,
    query: LyricsSearchQuery,
) -> Result<Vec<LyricsSearchResult>, AppError> {
    ensure_network(&state)?;
    lrclib::search(&query)
}

#[tauri::command]
pub fn lyrics_fetch_lrclib(
    state: State<'_, AppState>,
    track_id: Option<i64>,
    query: LyricsSearchQuery,
    result_id: Option<String>,
) -> Result<LyricsPayload, AppError> {
    ensure_network(&state)?;

    let mut payload = if let Some(id) = result_id {
        let doc = lrclib::fetch(&id)?;
        let mut payload = LyricsPayload::with_content(
            track_id.filter(|id| *id > 0),
            doc.plain_text,
            doc.synced_lrc,
            "lrclib",
            "lrclib",
            "LRCLIB (lrclib.net)",
        );
        payload.source_url = Some(format!("https://lrclib.net/api/get/{id}"));
        payload
    } else {
        lrclib::fetch_best_match(&query)?.ok_or_else(|| {
            AppError::Message("No LRCLIB match found".into())
        })?
    };

    payload.track_id = track_id.filter(|id| *id > 0);
    payload.source_url = payload
        .source_url
        .or_else(|| Some("https://lrclib.net".into()));

    if let Some(id) = payload.track_id {
        let db = state.db.lock();
        payload = repository::upsert(
            &db,
            id,
            payload.plain_text.as_deref(),
            payload.synced_lrc.as_deref(),
            "lrclib",
            "lrclib",
            payload.offset_ms,
            false,
            payload.source_url.as_deref(),
        )?;
    }

    Ok(payload)
}

fn ensure_network(state: &State<'_, AppState>) -> Result<(), AppError> {
    let settings = state.settings.lock();
    if !resolve::network_allowed(&settings) {
        return Err(AppError::Message(
            "Network lyrics are disabled. Enable Network and Lyrics providers in Settings → Privacy."
                .into(),
        ));
    }
    Ok(())
}
