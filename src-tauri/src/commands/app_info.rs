use crate::app::{AppState, APP_ID, APP_NAME};
use crate::error::AppError;
use serde::Serialize;
use tauri::State;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    pub name: String,
    pub app_id: String,
    pub version: String,
    pub data_dir: String,
    pub phase: String,
}

#[tauri::command]
pub fn get_app_info(state: State<'_, AppState>) -> Result<AppInfo, AppError> {
    Ok(AppInfo {
        name: APP_NAME.into(),
        app_id: APP_ID.into(),
        version: env!("CARGO_PKG_VERSION").into(),
        data_dir: state.data_dir.display().to_string(),
        phase: "4-personalization".into(),
    })
}
