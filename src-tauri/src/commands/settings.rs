use crate::app::AppState;
use crate::error::AppError;
use crate::settings::{self, AppSettings};
use tauri::State;

#[tauri::command]
pub fn get_settings(state: State<'_, AppState>) -> Result<AppSettings, AppError> {
    Ok(state.settings.lock().clone())
}

#[tauri::command]
pub fn update_settings(
    state: State<'_, AppState>,
    settings: AppSettings,
) -> Result<AppSettings, AppError> {
    settings.validate()?;
    settings::save(&state.data_dir, &settings)?;
    state.player.apply_playback_settings(&settings.playback);
    *state.settings.lock() = settings.clone();
    Ok(settings)
}
