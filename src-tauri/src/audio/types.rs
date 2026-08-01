use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub enum PlayerStatus {
    #[default]
    Stopped,
    Playing,
    Paused,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub enum RepeatMode {
    #[default]
    Off,
    Track,
    Queue,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueueTrack {
    pub track_id: i64,
    pub path: String,
    pub title: Option<String>,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub duration_ms: Option<i64>,
    pub artwork_cache_key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerSnapshot {
    pub status: PlayerStatus,
    pub current: Option<QueueTrack>,
    pub position_ms: u64,
    pub duration_ms: u64,
    pub volume: f32,
    pub muted: bool,
    pub shuffle: bool,
    pub repeat: RepeatMode,
    pub queue: Vec<QueueTrack>,
    pub queue_index: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PositionEvent {
    pub position_ms: u64,
    pub duration_ms: u64,
    pub status: PlayerStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrackChangedEvent {
    pub track: Option<QueueTrack>,
    pub queue_index: Option<usize>,
}
