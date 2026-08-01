mod app;
mod audio;
mod commands;
mod database;
mod diagnostics;
mod error;
mod events;
mod library;
mod lyrics;
mod platform;
mod security;
mod settings;

use app::{AppState, APP_NAME, DATABASE_FILE_NAME};
use audio::PlayerEngine;
use library::artwork::ensure_artwork_dirs;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let data_dir = app
                .path()
                .app_data_dir()
                .map_err(|e| std::io::Error::other(e.to_string()))?;

            std::fs::create_dir_all(&data_dir)?;
            ensure_artwork_dirs(&data_dir)?;

            let db_path = data_dir.join(DATABASE_FILE_NAME);
            let db = database::open_database(&db_path)?;
            let app_settings = settings::load_or_default(&data_dir)?;
            let initial_volume = app_settings.playback.default_volume as f32;
            let player = PlayerEngine::start(app.handle().clone(), initial_volume)?;
            player.apply_playback_settings(&app_settings.playback);

            app.manage(AppState::new(data_dir, db, app_settings, player));

            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_title(APP_NAME);
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_app_info,
            commands::get_settings,
            commands::update_settings,
            commands::classify_drop,
            commands::start_library_scan,
            commands::pause_library_scan,
            commands::resume_library_scan,
            commands::cancel_library_scan,
            commands::get_scan_jobs,
            commands::get_library_stats,
            commands::list_library_tracks,
            commands::list_library_albums,
            commands::list_library_artists,
            commands::list_library_folders,
            commands::get_artwork_path,
            commands::rescan_library,
            commands::get_library_track,
            commands::update_library_track_tags,
            commands::playlists_list,
            commands::playlists_create,
            commands::playlists_rename,
            commands::playlists_delete,
            commands::playlists_list_tracks,
            commands::playlists_add_tracks,
            commands::playlists_remove_track,
            commands::smart_playlists_list,
            commands::smart_playlists_create,
            commands::smart_playlists_update,
            commands::smart_playlists_delete,
            commands::smart_playlists_list_tracks,
            commands::favorites_list,
            commands::favorites_is_favorite,
            commands::favorites_toggle,
            commands::history_list,
            commands::history_recently_played,
            commands::history_clear,
            commands::history_record_play,
            commands::player_get_state,
            commands::player_play,
            commands::player_pause,
            commands::player_toggle,
            commands::player_stop,
            commands::player_next,
            commands::player_previous,
            commands::player_seek,
            commands::player_set_volume,
            commands::player_set_muted,
            commands::player_set_shuffle,
            commands::player_set_repeat,
            commands::player_play_tracks,
            commands::player_play_paths,
            commands::player_add_to_queue,
            commands::player_remove_from_queue,
            commands::player_clear_queue,
            commands::player_get_queue,
            commands::lyrics_resolve,
            commands::lyrics_save,
            commands::lyrics_set_offset,
            commands::lyrics_search_lrclib,
            commands::lyrics_fetch_lrclib,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Atrium");
}
