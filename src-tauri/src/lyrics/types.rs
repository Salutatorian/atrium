use serde::{Deserialize, Serialize};

use crate::lyrics::lrc::LyricLine;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LyricsPayload {
    pub track_id: Option<i64>,
    pub plain_text: Option<String>,
    pub synced_lrc: Option<String>,
    pub lines: Vec<LyricLine>,
    pub source: String,
    pub provider_id: String,
    pub offset_ms: i32,
    pub attribution: String,
    pub user_edited: bool,
    pub source_url: Option<String>,
}

impl LyricsPayload {
    pub fn empty() -> Self {
        Self {
            track_id: None,
            plain_text: None,
            synced_lrc: None,
            lines: Vec::new(),
            source: "none".into(),
            provider_id: "none".into(),
            offset_ms: 0,
            attribution: String::new(),
            user_edited: false,
            source_url: None,
        }
    }

    pub fn with_content(
        track_id: Option<i64>,
        plain_text: Option<String>,
        synced_lrc: Option<String>,
        source: impl Into<String>,
        provider_id: impl Into<String>,
        attribution: impl Into<String>,
    ) -> Self {
        let synced = synced_lrc.filter(|s| !s.trim().is_empty());
        let plain = plain_text.filter(|s| !s.trim().is_empty());
        let lines = synced
            .as_deref()
            .map(crate::lyrics::lrc::parse_lrc)
            .unwrap_or_default();
        let plain = plain.or_else(|| {
            synced
                .as_deref()
                .map(crate::lyrics::lrc::plain_from_lrc)
                .filter(|s| !s.is_empty())
        });
        Self {
            track_id,
            plain_text: plain,
            synced_lrc: synced,
            lines,
            source: source.into(),
            provider_id: provider_id.into(),
            offset_ms: 0,
            attribution: attribution.into(),
            user_edited: false,
            source_url: None,
        }
    }

    pub fn has_content(&self) -> bool {
        self.plain_text.as_ref().is_some_and(|s| !s.trim().is_empty())
            || self.synced_lrc.as_ref().is_some_and(|s| !s.trim().is_empty())
    }
}
