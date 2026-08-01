use crate::app::AppState;
use crate::error::AppError;
use crate::library::models::{
    AlbumSummary, ArtistSummary, DropClassification, FolderSummary, LibraryStats, Page,
    ScanJobSummary, TrackSummary,
};
use crate::library::repository::{
    library_stats, list_albums, list_artists, list_folders, list_scan_jobs, list_tracks,
    resolve_artwork_file,
};
use crate::library::scanner::classify_drop_paths;
use serde::Serialize;
use tauri::{AppHandle, State};

#[tauri::command]
pub fn classify_drop(paths: Vec<String>) -> Result<DropClassification, AppError> {
    Ok(classify_drop_paths(paths))
}

#[tauri::command]
pub fn start_library_scan(
    app: AppHandle,
    state: State<'_, AppState>,
    paths: Vec<String>,
    force: Option<bool>,
) -> Result<String, AppError> {
    state
        .scan_manager
        .start_scan(app, paths, force.unwrap_or(false))
}

#[tauri::command]
pub fn pause_library_scan(state: State<'_, AppState>, job_id: String) -> Result<(), AppError> {
    state.scan_manager.pause(&job_id)
}

#[tauri::command]
pub fn resume_library_scan(state: State<'_, AppState>, job_id: String) -> Result<(), AppError> {
    state.scan_manager.resume(&job_id)
}

#[tauri::command]
pub fn cancel_library_scan(state: State<'_, AppState>, job_id: String) -> Result<(), AppError> {
    state.scan_manager.cancel(&job_id)
}

#[tauri::command]
pub fn get_scan_jobs(state: State<'_, AppState>) -> Result<Vec<ScanJobSummary>, AppError> {
    let db = state.db.lock();
    list_scan_jobs(&db)
}

#[tauri::command]
pub fn get_library_stats(state: State<'_, AppState>) -> Result<LibraryStats, AppError> {
    let db = state.db.lock();
    library_stats(&db)
}

#[tauri::command]
pub fn list_library_tracks(
    state: State<'_, AppState>,
    offset: i64,
    limit: i64,
    query: Option<String>,
) -> Result<Page<TrackSummary>, AppError> {
    let db = state.db.lock();
    list_tracks(&db, &state.data_dir, offset, limit, query.as_deref())
}

#[tauri::command]
pub fn list_library_albums(
    state: State<'_, AppState>,
    offset: i64,
    limit: i64,
) -> Result<Page<AlbumSummary>, AppError> {
    let db = state.db.lock();
    list_albums(&db, offset, limit)
}

#[tauri::command]
pub fn list_library_artists(
    state: State<'_, AppState>,
    offset: i64,
    limit: i64,
) -> Result<Page<ArtistSummary>, AppError> {
    let db = state.db.lock();
    list_artists(&db, offset, limit)
}

#[tauri::command]
pub fn list_library_folders(state: State<'_, AppState>) -> Result<Vec<FolderSummary>, AppError> {
    let db = state.db.lock();
    list_folders(&db)
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ArtworkPathResponse {
    pub path: Option<String>,
}

#[tauri::command]
pub fn get_artwork_path(
    state: State<'_, AppState>,
    cache_key: String,
) -> Result<ArtworkPathResponse, AppError> {
    let path = resolve_artwork_file(&state.data_dir, &cache_key)
        .map(|p| p.to_string_lossy().to_string());
    Ok(ArtworkPathResponse { path })
}

#[tauri::command]
pub fn rescan_library(app: AppHandle, state: State<'_, AppState>) -> Result<String, AppError> {
    let roots = {
        let db = state.db.lock();
        let mut stmt = db
            .conn()
            .prepare("SELECT path FROM library_roots WHERE enabled = 1")
            .map_err(AppError::from)?;
        let paths = stmt
            .query_map([], |row| row.get::<_, String>(0))
            .map_err(AppError::from)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(AppError::from)?;
        paths
    };

    if roots.is_empty() {
        return Err(AppError::Message(
            "No library folders yet. Drop music or choose a folder to import.".into(),
        ));
    }

    state.scan_manager.start_scan(app, roots, false)
}
