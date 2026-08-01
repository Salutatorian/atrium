use crate::app::AppState;
use crate::error::AppError;
use crate::settings::{self, AppSettings};
use tauri::{AppHandle, State};
use tauri_plugin_autostart::ManagerExt;

#[tauri::command]
pub fn get_settings(state: State<'_, AppState>) -> Result<AppSettings, AppError> {
    Ok(state.settings.lock().clone())
}

#[tauri::command]
pub fn update_settings(
    app: AppHandle,
    state: State<'_, AppState>,
    settings: AppSettings,
) -> Result<AppSettings, AppError> {
    settings.validate()?;
    settings::save(&state.data_dir, &settings)?;
    state.player.apply_playback_settings(&settings.playback);

    // Keep OS login item aligned with the setting (Windows / macOS / Linux).
    let autolaunch = app.autolaunch();
    if settings.general.launch_at_login {
        autolaunch
            .enable()
            .map_err(|e| AppError::Message(format!("Could not enable launch at login: {e}")))?;
    } else {
        autolaunch
            .disable()
            .map_err(|e| AppError::Message(format!("Could not disable launch at login: {e}")))?;
    }

    *state.settings.lock() = settings.clone();
    Ok(settings)
}
