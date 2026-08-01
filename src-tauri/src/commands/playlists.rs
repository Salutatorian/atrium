use crate::app::AppState;
use crate::error::AppError;
use crate::library::models::{Page, TrackSummary};
use crate::library::playlists::{
    add_tracks_to_playlist, create_playlist, create_smart_playlist, delete_playlist,
    delete_smart_playlist, list_playlist_tracks, list_playlists, list_smart_playlist_tracks,
    list_smart_playlists, remove_track_from_playlist, rename_playlist, update_smart_playlist,
    PlaylistSummary, SmartPlaylistRules, SmartPlaylistSummary,
};
use tauri::State;

#[tauri::command]
pub fn playlists_list(state: State<'_, AppState>) -> Result<Vec<PlaylistSummary>, AppError> {
    let db = state.db.lock();
    list_playlists(&db)
}

#[tauri::command]
pub fn playlists_create(
    state: State<'_, AppState>,
    name: String,
    description: Option<String>,
) -> Result<PlaylistSummary, AppError> {
    let db = state.db.lock();
    create_playlist(&db, &name, description.as_deref())
}

#[tauri::command]
pub fn playlists_rename(
    state: State<'_, AppState>,
    id: String,
    name: String,
) -> Result<(), AppError> {
    let db = state.db.lock();
    rename_playlist(&db, &id, &name)
}

#[tauri::command]
pub fn playlists_delete(state: State<'_, AppState>, id: String) -> Result<(), AppError> {
    let db = state.db.lock();
    delete_playlist(&db, &id)
}

#[tauri::command]
pub fn playlists_list_tracks(
    state: State<'_, AppState>,
    id: String,
) -> Result<Vec<TrackSummary>, AppError> {
    let db = state.db.lock();
    list_playlist_tracks(&db, &state.data_dir, &id)
}

#[tauri::command]
pub fn playlists_add_tracks(
    state: State<'_, AppState>,
    id: String,
    track_ids: Vec<i64>,
) -> Result<i64, AppError> {
    let db = state.db.lock();
    add_tracks_to_playlist(&db, &id, &track_ids)
}

#[tauri::command]
pub fn playlists_remove_track(
    state: State<'_, AppState>,
    id: String,
    track_id: i64,
) -> Result<(), AppError> {
    let db = state.db.lock();
    remove_track_from_playlist(&db, &id, track_id)
}

#[tauri::command]
pub fn smart_playlists_list(
    state: State<'_, AppState>,
) -> Result<Vec<SmartPlaylistSummary>, AppError> {
    let db = state.db.lock();
    list_smart_playlists(&db)
}

#[tauri::command]
pub fn smart_playlists_create(
    state: State<'_, AppState>,
    name: String,
    rules: SmartPlaylistRules,
) -> Result<SmartPlaylistSummary, AppError> {
    let db = state.db.lock();
    create_smart_playlist(&db, &name, &rules)
}

#[tauri::command]
pub fn smart_playlists_update(
    state: State<'_, AppState>,
    id: String,
    name: String,
    rules: SmartPlaylistRules,
) -> Result<(), AppError> {
    let db = state.db.lock();
    update_smart_playlist(&db, &id, &name, &rules)
}

#[tauri::command]
pub fn smart_playlists_delete(state: State<'_, AppState>, id: String) -> Result<(), AppError> {
    let db = state.db.lock();
    delete_smart_playlist(&db, &id)
}

#[tauri::command]
pub fn smart_playlists_list_tracks(
    state: State<'_, AppState>,
    id: String,
    offset: i64,
    limit: i64,
) -> Result<Page<TrackSummary>, AppError> {
    let db = state.db.lock();
    list_smart_playlist_tracks(&db, &state.data_dir, &id, offset, limit)
}
