use crate::app::AppState;
use crate::error::AppError;
use crate::library::listening::{
    is_favorite, list_favorites, list_history, list_recently_played, list_scrobbles,
    list_scrobbles_for_day, list_story_years, record_play, record_scrobble, stats_overview,
    stats_top_albums, stats_top_artists, stats_top_tracks, toggle_favorite, year_story, AlbumStat,
    ArtistStat, HistoryEntry, ScrobbleEntry, ScrobbleInput, StatsOverview, TrackStat, YearStory,
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

#[tauri::command]
pub fn stats_record_scrobble(
    state: State<'_, AppState>,
    scrobble: ScrobbleInput,
) -> Result<(), AppError> {
    let db = state.db.lock();
    record_scrobble(&db, scrobble)
}

#[tauri::command]
pub fn stats_get_overview(
    state: State<'_, AppState>,
    range: Option<String>,
) -> Result<StatsOverview, AppError> {
    let db = state.db.lock();
    stats_overview(&db, range.as_deref().unwrap_or("all"))
}

#[tauri::command]
pub fn stats_get_top_tracks(
    state: State<'_, AppState>,
    range: Option<String>,
    limit: Option<i64>,
) -> Result<Vec<TrackStat>, AppError> {
    let db = state.db.lock();
    stats_top_tracks(
        &db,
        range.as_deref().unwrap_or("all"),
        limit.unwrap_or(25),
    )
}

#[tauri::command]
pub fn stats_get_top_artists(
    state: State<'_, AppState>,
    range: Option<String>,
    limit: Option<i64>,
) -> Result<Vec<ArtistStat>, AppError> {
    let db = state.db.lock();
    stats_top_artists(
        &db,
        range.as_deref().unwrap_or("all"),
        limit.unwrap_or(25),
    )
}

#[tauri::command]
pub fn stats_get_top_albums(
    state: State<'_, AppState>,
    range: Option<String>,
    limit: Option<i64>,
) -> Result<Vec<AlbumStat>, AppError> {
    let db = state.db.lock();
    stats_top_albums(
        &db,
        range.as_deref().unwrap_or("all"),
        limit.unwrap_or(25),
    )
}

#[tauri::command]
pub fn stats_list_scrobbles(
    state: State<'_, AppState>,
    limit: Option<i64>,
) -> Result<Vec<ScrobbleEntry>, AppError> {
    let db = state.db.lock();
    list_scrobbles(&db, limit.unwrap_or(100))
}

#[tauri::command]
pub fn stats_list_day_scrobbles(
    state: State<'_, AppState>,
    day: String,
) -> Result<Vec<ScrobbleEntry>, AppError> {
    let db = state.db.lock();
    list_scrobbles_for_day(&db, &day)
}

#[tauri::command]
pub fn stats_list_story_years(state: State<'_, AppState>) -> Result<Vec<i32>, AppError> {
    let db = state.db.lock();
    list_story_years(&db)
}

#[tauri::command]
pub fn stats_get_year_story(
    state: State<'_, AppState>,
    year: i32,
) -> Result<YearStory, AppError> {
    let db = state.db.lock();
    year_story(&db, year)
}
