use crate::app::AppState;
use crate::audio::types::{PlayerSnapshot, QueueTrack, RepeatMode};
use crate::error::AppError;
use crate::library::repository::tracks_by_ids;
use tauri::State;

#[tauri::command]
pub fn player_get_state(state: State<'_, AppState>) -> Result<PlayerSnapshot, AppError> {
    Ok(state.player.snapshot())
}

#[tauri::command]
pub fn player_play(state: State<'_, AppState>) -> Result<PlayerSnapshot, AppError> {
    state.player.play()?;
    Ok(state.player.snapshot())
}

#[tauri::command]
pub fn player_pause(state: State<'_, AppState>) -> Result<PlayerSnapshot, AppError> {
    state.player.pause()?;
    Ok(state.player.snapshot())
}

#[tauri::command]
pub fn player_toggle(state: State<'_, AppState>) -> Result<PlayerSnapshot, AppError> {
    let snapshot = state.player.snapshot();
    match snapshot.status {
        crate::audio::PlayerStatus::Playing => state.player.pause()?,
        _ => state.player.play()?,
    }
    Ok(state.player.snapshot())
}

#[tauri::command]
pub fn player_stop(state: State<'_, AppState>) -> Result<PlayerSnapshot, AppError> {
    state.player.stop()?;
    Ok(state.player.snapshot())
}

#[tauri::command]
pub fn player_next(state: State<'_, AppState>) -> Result<PlayerSnapshot, AppError> {
    state.player.next()?;
    Ok(state.player.snapshot())
}

#[tauri::command]
pub fn player_previous(state: State<'_, AppState>) -> Result<PlayerSnapshot, AppError> {
    state.player.previous()?;
    Ok(state.player.snapshot())
}

#[tauri::command]
pub fn player_seek(state: State<'_, AppState>, position_ms: u64) -> Result<PlayerSnapshot, AppError> {
    state.player.seek(position_ms)?;
    Ok(state.player.snapshot())
}

#[tauri::command]
pub fn player_set_volume(state: State<'_, AppState>, volume: f32) -> Result<PlayerSnapshot, AppError> {
    state.player.set_volume(volume)?;
    Ok(state.player.snapshot())
}

#[tauri::command]
pub fn player_set_muted(state: State<'_, AppState>, muted: bool) -> Result<PlayerSnapshot, AppError> {
    state.player.set_muted(muted)?;
    Ok(state.player.snapshot())
}

#[tauri::command]
pub fn player_set_shuffle(
    state: State<'_, AppState>,
    enabled: bool,
) -> Result<PlayerSnapshot, AppError> {
    state.player.set_shuffle(enabled)?;
    Ok(state.player.snapshot())
}

#[tauri::command]
pub fn player_set_repeat(
    state: State<'_, AppState>,
    mode: RepeatMode,
) -> Result<PlayerSnapshot, AppError> {
    state.player.set_repeat(mode)?;
    Ok(state.player.snapshot())
}

#[tauri::command]
pub fn player_play_tracks(
    state: State<'_, AppState>,
    track_ids: Vec<i64>,
    start_index: Option<usize>,
) -> Result<PlayerSnapshot, AppError> {
    let tracks = {
        let db = state.db.lock();
        tracks_by_ids(&db, &track_ids)?
    };
    if tracks.is_empty() {
        return Err(AppError::Message("No playable tracks selected".into()));
    }
    let start = start_index.unwrap_or(0);
    state.player.replace_queue(tracks, start, true)?;
    Ok(state.player.snapshot())
}

/// Play ad-hoc file paths (e.g. drop-to-play) without requiring a library row first.
#[tauri::command]
pub fn player_play_paths(
    state: State<'_, AppState>,
    paths: Vec<String>,
    start_index: Option<usize>,
) -> Result<PlayerSnapshot, AppError> {
    if paths.is_empty() {
        return Err(AppError::Message("No playable files selected".into()));
    }
    let tracks: Vec<QueueTrack> = paths
        .into_iter()
        .enumerate()
        .map(|(i, path)| {
            let title = std::path::Path::new(&path)
                .file_stem()
                .and_then(|s| s.to_str())
                .map(|s| s.to_string());
            QueueTrack {
                track_id: -(i as i64 + 1),
                path,
                title,
                artist: None,
                album: None,
                duration_ms: None,
                artwork_cache_key: None,
                replaygain_track_gain: None,
                replaygain_album_gain: None,
            }
        })
        .collect();
    let start = start_index.unwrap_or(0);
    state.player.replace_queue(tracks, start, true)?;
    Ok(state.player.snapshot())
}

#[tauri::command]
pub fn player_add_to_queue(
    state: State<'_, AppState>,
    track_ids: Vec<i64>,
    next: Option<bool>,
) -> Result<PlayerSnapshot, AppError> {
    let tracks = {
        let db = state.db.lock();
        tracks_by_ids(&db, &track_ids)?
    };
    if next.unwrap_or(false) {
        state.player.add_next(tracks)?;
    } else {
        state.player.add_end(tracks)?;
    }
    Ok(state.player.snapshot())
}

#[tauri::command]
pub fn player_remove_from_queue(
    state: State<'_, AppState>,
    index: usize,
) -> Result<PlayerSnapshot, AppError> {
    state.player.remove(index)?;
    Ok(state.player.snapshot())
}

#[tauri::command]
pub fn player_clear_queue(state: State<'_, AppState>) -> Result<PlayerSnapshot, AppError> {
    state.player.clear()?;
    Ok(state.player.snapshot())
}

#[tauri::command]
pub fn player_get_queue(state: State<'_, AppState>) -> Result<Vec<QueueTrack>, AppError> {
    Ok(state.player.snapshot().queue)
}
