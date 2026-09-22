//! OS now-playing / taskbar transport (Windows SMTC, macOS Now Playing, Linux MPRIS).

use std::path::{Path, PathBuf};
use std::time::Duration;

use parking_lot::Mutex;
use souvlaki::{
    MediaControlEvent, MediaControls, MediaMetadata, MediaPlayback, MediaPosition, PlatformConfig,
    SeekDirection,
};
use tauri::{AppHandle, Manager};

use crate::app::brand::{APP_ID, APP_NAME};
use crate::app::AppState;
use crate::audio::types::{PlayerStatus, QueueTrack};
use crate::library::artwork::original_path;
use crate::tray;

pub struct OsMedia {
    controls: Mutex<MediaControls>,
    data_dir: PathBuf,
}

pub fn setup(app: &AppHandle) -> tauri::Result<()> {
    let hwnd = main_hwnd(app);
    let config = PlatformConfig {
        dbus_name: APP_ID,
        display_name: APP_NAME,
        hwnd,
    };

    let mut controls = match MediaControls::new(config) {
        Ok(controls) => controls,
        Err(err) => {
            eprintln!("OS media controls unavailable: {err}");
            return Ok(());
        }
    };

    let handle = app.clone();
    if let Err(err) = controls.attach(move |event| on_media_event(&handle, event)) {
        eprintln!("OS media controls attach failed: {err}");
        return Ok(());
    }

    let data_dir = app
        .try_state::<AppState>()
        .map(|state| state.data_dir.clone())
        .unwrap_or_default();

    app.manage(OsMedia {
        controls: Mutex::new(controls),
        data_dir,
    });
    Ok(())
}

pub fn publish(app: &AppHandle, status: PlayerStatus, track: Option<&QueueTrack>, position_ms: u64) {
    let Some(media) = app.try_state::<OsMedia>() else {
        return;
    };
    let Some(mut controls) = media.controls.try_lock() else {
        return;
    };

    let title = track.and_then(|t| t.title.as_deref()).unwrap_or("Atrium");
    let artist = track.and_then(|t| t.artist.as_deref());
    let album = track.and_then(|t| t.album.as_deref());
    let duration = track.and_then(|t| t.duration_ms).and_then(|ms| {
        if ms > 0 {
            Some(Duration::from_millis(ms as u64))
        } else {
            None
        }
    });
    let cover = track
        .and_then(|t| t.artwork_cache_key.as_deref())
        .map(|key| original_path(&media.data_dir, key))
        .filter(|path| path.is_file())
        .and_then(|path| path_to_file_url(&path));
    let cover_ref = cover.as_deref();

    let _ = controls.set_metadata(MediaMetadata {
        title: Some(title),
        artist,
        album,
        cover_url: cover_ref,
        duration,
    });

    let progress = Some(MediaPosition(Duration::from_millis(position_ms)));
    let playback = match status {
        PlayerStatus::Playing => MediaPlayback::Playing { progress },
        PlayerStatus::Paused => MediaPlayback::Paused { progress },
        PlayerStatus::Stopped => MediaPlayback::Stopped,
    };
    let _ = controls.set_playback(playback);

    #[cfg(windows)]
    crate::platform::windows::sync_play_pause(app, matches!(status, PlayerStatus::Playing));
}

fn on_media_event(app: &AppHandle, event: MediaControlEvent) {
    match event {
        MediaControlEvent::Toggle => {
            let Some(state) = app.try_state::<AppState>() else {
                return;
            };
            match state.player.snapshot().status {
                PlayerStatus::Playing => {
                    let _ = state.player.pause();
                }
                _ => {
                    let _ = state.player.play();
                }
            }
        }
        MediaControlEvent::Play => {
            if let Some(state) = app.try_state::<AppState>() {
                let _ = state.player.play();
            }
        }
        MediaControlEvent::Pause | MediaControlEvent::Stop => {
            if let Some(state) = app.try_state::<AppState>() {
                let _ = state.player.pause();
            }
        }
        MediaControlEvent::Next => {
            if let Some(state) = app.try_state::<AppState>() {
                let _ = state.player.next();
            }
        }
        MediaControlEvent::Previous => {
            if let Some(state) = app.try_state::<AppState>() {
                let _ = state.player.previous();
            }
        }
        MediaControlEvent::SetPosition(position) => {
            if let Some(state) = app.try_state::<AppState>() {
                let _ = state.player.seek(position.0.as_millis() as u64);
            }
        }
        MediaControlEvent::Seek(direction) => {
            let Some(state) = app.try_state::<AppState>() else {
                return;
            };
            let snap = state.player.snapshot();
            let delta = 5_000_u64;
            let next = match direction {
                SeekDirection::Forward => snap.position_ms.saturating_add(delta),
                SeekDirection::Backward => snap.position_ms.saturating_sub(delta),
            };
            let _ = state.player.seek(next.min(snap.duration_ms));
        }
        MediaControlEvent::SeekBy(direction, duration) => {
            let Some(state) = app.try_state::<AppState>() else {
                return;
            };
            let snap = state.player.snapshot();
            let delta = duration.as_millis() as u64;
            let next = match direction {
                SeekDirection::Forward => snap.position_ms.saturating_add(delta),
                SeekDirection::Backward => snap.position_ms.saturating_sub(delta),
            };
            let _ = state.player.seek(next.min(snap.duration_ms));
        }
        MediaControlEvent::SetVolume(volume) => {
            if let Some(state) = app.try_state::<AppState>() {
                let _ = state.player.set_volume(volume.clamp(0.0, 1.0) as f32);
            }
        }
        MediaControlEvent::Raise => tray::show_main_window(app),
        MediaControlEvent::Quit => tray::quit_app(app),
        MediaControlEvent::OpenUri(_) => {}
    }
}

fn path_to_file_url(path: &Path) -> Option<String> {
    let abs = path.canonicalize().ok().unwrap_or_else(|| path.to_path_buf());
    let raw = abs.to_string_lossy().replace('\\', "/");
    let raw = raw.trim_start_matches("//?/");
    if raw.starts_with('/') {
        Some(format!("file://{raw}"))
    } else {
        Some(format!("file:///{raw}"))
    }
}

#[cfg(target_os = "windows")]
fn main_hwnd(app: &AppHandle) -> Option<*mut std::ffi::c_void> {
    let window = app.get_webview_window("main")?;
    let hwnd = window.hwnd().ok()?;
    Some(hwnd.0 as *mut std::ffi::c_void)
}

#[cfg(not(target_os = "windows"))]
fn main_hwnd(_app: &AppHandle) -> Option<*mut std::ffi::c_void> {
    None
}
