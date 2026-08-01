use crate::app::AppState;
use crate::error::AppError;
use crate::library::listening::{
    clear_history, is_favorite, list_favorites, list_history, list_recently_played, record_play,
    toggle_favorite, HistoryEntry,
};
use crate::library::models::TrackSummary;
use serde::Serialize;
use tauri::State;

#[tauri::command]
pub fn favorites_list(state: State<'_, AppState>) -> Result<Vec<TrackSummary>, AppError> {
    let db = state.db.lock();
    list_favorites(&db, &state.data_dir)
}

#[tauri::command]
pub fn favorites_is_favorite(
    state: State<'_, AppState>,
    track_id: i64,
) -> Result<bool, AppError> {
    let db = state.db.lock();
    is_favorite(&db, track_id)
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FavoriteToggleResult {
    pub favorited: bool,
}

#[tauri::command]
pub fn favorites_toggle(
    state: State<'_, AppState>,
    track_id: i64,
) -> Result<FavoriteToggleResult, AppError> {
    let db = state.db.lock();
    let favorited = toggle_favorite(&db, track_id)?;
    Ok(FavoriteToggleResult { favorited })
}

#[tauri::command]
pub fn history_list(
    state: State<'_, AppState>,
    limit: Option<i64>,
) -> Result<Vec<HistoryEntry>, AppError> {
    let db = state.db.lock();
    list_history(&db, &state.data_dir, limit.unwrap_or(100))
}

#[tauri::command]
pub fn history_recently_played(
    state: State<'_, AppState>,
    limit: Option<i64>,
) -> Result<Vec<TrackSummary>, AppError> {
    let db = state.db.lock();
    list_recently_played(&db, &state.data_dir, limit.unwrap_or(100))
}

#[tauri::command]
pub fn history_clear(state: State<'_, AppState>) -> Result<(), AppError> {
    let db = state.db.lock();
    clear_history(&db)
}

#[tauri::command]
pub fn history_record_play(
    state: State<'_, AppState>,
    track_id: i64,
    duration_listened_ms: Option<i64>,
    completed: Option<bool>,
) -> Result<(), AppError> {
    let db = state.db.lock();
    record_play(
        &db,
        track_id,
        duration_listened_ms,
        completed.unwrap_or(false),
    )
}
