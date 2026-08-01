use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrackSummary {
    pub id: i64,
    pub track_uid: String,
    pub path: String,
    pub title: Option<String>,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub album_artist: Option<String>,
    pub genre: Option<String>,
    pub year: Option<i64>,
    pub track_number: Option<i64>,
    pub duration_ms: Option<i64>,
    pub has_artwork: bool,
    pub artwork_cache_key: Option<String>,
    pub date_added: Option<String>,
    #[serde(default)]
    pub missing: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AlbumSummary {
    pub id: i64,
    pub title: String,
    pub album_artist: Option<String>,
    pub year: Option<i64>,
    pub track_count: i64,
    pub artwork_cache_key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ArtistSummary {
    pub name: String,
    pub track_count: i64,
    pub album_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderSummary {
    pub id: i64,
    pub path: String,
    pub name: String,
    pub track_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryRootSummary {
    pub id: i64,
    pub path: String,
    pub label: String,
    pub track_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryStats {
    pub track_count: i64,
    pub album_count: i64,
    pub artist_count: i64,
    pub folder_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Page<T> {
    pub items: Vec<T>,
    pub total: i64,
    pub offset: i64,
    pub limit: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanProgressEvent {
    pub job_id: String,
    pub status: String,
    pub discovered: u64,
    pub processed: u64,
    pub errors: u64,
    pub current_path: Option<String>,
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanJobSummary {
    pub id: String,
    pub status: String,
    pub discovered: u64,
    pub processed: u64,
    pub errors: u64,
    pub paths: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
    pub completed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DropClassification {
    pub audio_files: Vec<String>,
    pub folders: Vec<String>,
    pub ignored: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct ParsedTrack {
    pub path: std::path::PathBuf,
    pub size: u64,
    pub mtime: i64,
    pub ctime: Option<i64>,
    pub extension: String,
    pub title: Option<String>,
    pub artist: Option<String>,
    pub album_artist: Option<String>,
    pub album: Option<String>,
    pub genre: Option<String>,
    pub year: Option<i64>,
    pub track_number: Option<i64>,
    pub track_total: Option<i64>,
    pub disc_number: Option<i64>,
    pub disc_total: Option<i64>,
    pub composer: Option<String>,
    pub comment: Option<String>,
    pub duration_ms: Option<i64>,
    pub bitrate: Option<i64>,
    pub sample_rate: Option<i64>,
    pub bit_depth: Option<i64>,
    pub channels: Option<i64>,
    pub codec: Option<String>,
    pub container: Option<String>,
    pub has_lyrics: bool,
    pub replaygain_track_gain: Option<f32>,
    pub replaygain_album_gain: Option<f32>,
    pub replaygain_track_peak: Option<f32>,
    pub replaygain_album_peak: Option<f32>,
    pub artwork_bytes: Option<Vec<u8>>,
    #[allow(dead_code)]
    pub artwork_mime: Option<String>,
}
