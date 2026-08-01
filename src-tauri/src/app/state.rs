use parking_lot::Mutex;
use std::path::PathBuf;
use std::sync::Arc;

use crate::audio::PlayerEngine;
use crate::database::Database;
use crate::library::ScanManager;
use crate::settings::AppSettings;

pub struct AppState {
    pub data_dir: PathBuf,
    pub db: Arc<Mutex<Database>>,
    pub settings: Arc<Mutex<AppSettings>>,
    pub scan_manager: Arc<ScanManager>,
    pub player: Arc<PlayerEngine>,
}

impl AppState {
    pub fn new(
        data_dir: PathBuf,
        db: Database,
        settings: AppSettings,
        player: PlayerEngine,
    ) -> Self {
        Self {
            data_dir,
            db: Arc::new(Mutex::new(db)),
            settings: Arc::new(Mutex::new(settings)),
            scan_manager: Arc::new(ScanManager::default()),
            player: Arc::new(player),
        }
    }
}
