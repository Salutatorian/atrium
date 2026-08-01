mod model;

pub use model::*;

use crate::app::SETTINGS_FILE_NAME;
use crate::error::AppError;
use std::fs;
use std::path::{Path, PathBuf};

pub fn settings_path(data_dir: &Path) -> PathBuf {
    data_dir.join(SETTINGS_FILE_NAME)
}

pub fn load_or_default(data_dir: &Path) -> Result<AppSettings, AppError> {
    let path = settings_path(data_dir);
    if !path.exists() {
        let settings = AppSettings::default();
        save(data_dir, &settings)?;
        return Ok(settings);
    }

    let raw = fs::read_to_string(&path)?;
    let settings = serde_json::from_str::<AppSettings>(&raw)?;
    settings.validate()?;
    Ok(settings)
}

pub fn save(data_dir: &Path, settings: &AppSettings) -> Result<(), AppError> {
    settings.validate()?;
    fs::create_dir_all(data_dir)?;
    let path = settings_path(data_dir);
    let raw = serde_json::to_string_pretty(settings)?;
    fs::write(path, raw)?;
    Ok(())
}
