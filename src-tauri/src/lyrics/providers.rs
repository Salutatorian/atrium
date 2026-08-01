use crate::error::AppError;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LyricsSearchQuery {
    pub title: String,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub duration_ms: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LyricsSearchResult {
    pub id: String,
    pub title: String,
    pub artist: Option<String>,
    pub synced: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LyricsDocument {
    pub plain_text: Option<String>,
    pub synced_lrc: Option<String>,
    pub source: String,
    pub provider_id: String,
}

pub trait LyricsProvider: Send + Sync {
    fn provider_id(&self) -> &'static str;
    fn display_name(&self) -> &'static str;
    fn supports_plain(&self) -> bool;
    fn supports_synced(&self) -> bool;
    fn requires_api_key(&self) -> bool;
    fn search(&self, query: &LyricsSearchQuery) -> Result<Vec<LyricsSearchResult>, AppError>;
    fn fetch(&self, id: &str) -> Result<LyricsDocument, AppError>;
}
