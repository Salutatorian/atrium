use crate::app::PLAYBACK_SESSION_FILE_NAME;
use crate::audio::types::{QueueTrack, RepeatMode};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlaybackSession {
    pub queue: Vec<QueueTrack>,
    pub queue_index: usize,
    pub position_ms: u64,
    #[serde(default)]
    pub shuffle: bool,
    #[serde(default)]
    pub repeat: RepeatMode,
}

fn session_path(data_dir: &Path) -> PathBuf {
    data_dir.join(PLAYBACK_SESSION_FILE_NAME)
}

pub fn load(data_dir: &Path) -> Option<PlaybackSession> {
    let bytes = fs::read(session_path(data_dir)).ok()?;
    serde_json::from_slice(&bytes).ok()
}

pub fn load_sanitized(data_dir: &Path) -> Option<PlaybackSession> {
    let loaded = load(data_dir)?;
    match sanitize(loaded) {
        Some(session) => Some(session),
        None => {
            save(data_dir, None);
            None
        }
    }
}

pub fn save(data_dir: &Path, session: Option<&PlaybackSession>) {
    let path = session_path(data_dir);
    let Some(session) = session.filter(|s| !s.queue.is_empty()) else {
        let _ = fs::remove_file(&path);
        return;
    };
    let Ok(bytes) = serde_json::to_vec_pretty(session) else {
        return;
    };
    let tmp = path.with_extension("json.tmp");
    if fs::write(&tmp, &bytes).is_err() {
        return;
    }
    let _ = fs::remove_file(&path);
    if fs::rename(&tmp, &path).is_err() {
        let _ = fs::remove_file(&tmp);
    }
}

/// Drop tracks whose files (or folders) are gone. If the current track is gone,
/// keep the remaining queue and reset position to 0.
pub fn sanitize(mut session: PlaybackSession) -> Option<PlaybackSession> {
    if session.queue.is_empty() {
        return None;
    }
    let original_index = session.queue_index.min(session.queue.len() - 1);
    let original_path = session.queue.get(original_index).map(|t| t.path.clone());
    session.queue.retain(|t| Path::new(&t.path).is_file());
    if session.queue.is_empty() {
        return None;
    }
    match original_path {
        Some(path) => {
            if let Some(new_idx) = session.queue.iter().position(|t| t.path == path) {
                session.queue_index = new_idx;
            } else {
                session.queue_index = original_index.min(session.queue.len() - 1);
                session.position_ms = 0;
            }
        }
        None => {
            session.queue_index = 0;
            session.position_ms = 0;
        }
    }
    Some(session)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn track(path: &str) -> QueueTrack {
        QueueTrack {
            track_id: 1,
            path: path.to_string(),
            title: Some("Track".into()),
            artist: None,
            album: None,
            duration_ms: Some(180_000),
            artwork_cache_key: None,
            replaygain_track_gain: None,
            replaygain_album_gain: None,
        }
    }

    fn session(paths: &[&str], index: usize, position_ms: u64) -> PlaybackSession {
        PlaybackSession {
            queue: paths.iter().map(|p| track(p)).collect(),
            queue_index: index,
            position_ms,
            shuffle: false,
            repeat: RepeatMode::Off,
        }
    }

    #[test]
    fn all_missing_returns_none() {
        let s = session(&["/nope/a.mp3", "/nope/b.mp3"], 0, 9_000);
        assert!(sanitize(s).is_none());
    }

    #[test]
    fn drops_missing_current_and_resets_position() {
        let dir = tempfile::tempdir().unwrap();
        let keep = dir.path().join("keep.mp3");
        fs::write(&keep, b"x").unwrap();
        let keep_path = keep.to_str().unwrap();
        let s = session(&[keep_path, "/definitely/missing/gone.mp3"], 1, 12_345);
        let out = sanitize(s).unwrap();
        assert_eq!(out.queue.len(), 1);
        assert_eq!(out.queue[0].path, keep_path);
        assert_eq!(out.queue_index, 0);
        assert_eq!(out.position_ms, 0);
    }

    #[test]
    fn keeps_position_when_current_file_exists() {
        let dir = tempfile::tempdir().unwrap();
        let a = dir.path().join("a.mp3");
        let b = dir.path().join("b.mp3");
        fs::write(&a, b"x").unwrap();
        fs::write(&b, b"x").unwrap();
        let s = session(&[a.to_str().unwrap(), b.to_str().unwrap()], 1, 4_000);
        let out = sanitize(s).unwrap();
        assert_eq!(out.queue_index, 1);
        assert_eq!(out.position_ms, 4_000);
    }

    #[test]
    fn save_load_roundtrip() {
        let dir = tempfile::tempdir().unwrap();
        let file = dir.path().join("song.mp3");
        fs::write(&file, b"x").unwrap();
        let original = session(&[file.to_str().unwrap()], 0, 1_500);
        save(dir.path(), Some(&original));
        let loaded = load_sanitized(dir.path()).unwrap();
        assert_eq!(loaded.position_ms, 1_500);
        assert_eq!(loaded.queue.len(), 1);
    }

    #[test]
    fn save_none_deletes_file() {
        let dir = tempfile::tempdir().unwrap();
        let file = dir.path().join("song.mp3");
        fs::write(&file, b"x").unwrap();
        let original = session(&[file.to_str().unwrap()], 0, 100);
        save(dir.path(), Some(&original));
        assert!(session_path(dir.path()).is_file());
        save(dir.path(), None);
        assert!(!session_path(dir.path()).is_file());
    }
}
