use serde::Deserialize;

use crate::error::AppError;
use crate::lyrics::providers::{LyricsDocument, LyricsSearchQuery, LyricsSearchResult};
use crate::lyrics::types::LyricsPayload;

const LRCLIB_BASE: &str = "https://lrclib.net/api";
const USER_AGENT: &str = "Atrium/0.1 (https://github.com/Salutatorian/atrium)";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LrcLibTrack {
    id: i64,
    #[serde(default)]
    track_name: Option<String>,
    #[serde(default)]
    artist_name: Option<String>,
    #[serde(default)]
    album_name: Option<String>,
    #[serde(default)]
    plain_lyrics: Option<String>,
    #[serde(default)]
    synced_lyrics: Option<String>,
}

pub fn search(query: &LyricsSearchQuery) -> Result<Vec<LyricsSearchResult>, AppError> {
    // Prefer free-text `q` (same as lrclib.net search). Fall back to structured fields.
    let url = if let Some(q) = query
        .q
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
    {
        format!("{LRCLIB_BASE}/search?q={}", urlencoding(q))
    } else if !query.title.trim().is_empty() {
        let mut url = format!(
            "{LRCLIB_BASE}/search?track_name={}",
            urlencoding(query.title.trim())
        );
        if let Some(artist) = query.artist.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
            url.push_str("&artist_name=");
            url.push_str(&urlencoding(artist));
        }
        if let Some(album) = query.album.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
            url.push_str("&album_name=");
            url.push_str(&urlencoding(album));
        }
        url
    } else if let Some(artist) = query.artist.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
        format!(
            "{LRCLIB_BASE}/search?q={}",
            urlencoding(artist)
        )
    } else {
        return Err(AppError::Message(
            "Enter a search for LRCLIB (song, artist, or album)".into(),
        ));
    };

    let body = http_get(&url)?;
    let rows: Vec<LrcLibTrack> = serde_json::from_str(&body)
        .map_err(|e| AppError::Message(format!("LRCLIB search parse failed: {e}")))?;
    Ok(rows
        .into_iter()
        .take(20)
        .map(|row| LyricsSearchResult {
            id: row.id.to_string(),
            title: row
                .track_name
                .unwrap_or_else(|| query.title.clone()),
            artist: row.artist_name,
            album: row.album_name,
            synced: row
                .synced_lyrics
                .as_ref()
                .is_some_and(|s| !s.trim().is_empty()),
        })
        .collect())
}

pub fn fetch(id: &str) -> Result<LyricsDocument, AppError> {
    let url = format!("{LRCLIB_BASE}/get/{id}");
    let body = http_get(&url)?;
    let row: LrcLibTrack = serde_json::from_str(&body)
        .map_err(|e| AppError::Message(format!("LRCLIB fetch parse failed: {e}")))?;
    Ok(LyricsDocument {
        plain_text: row.plain_lyrics.filter(|s| !s.trim().is_empty()),
        synced_lrc: row.synced_lyrics.filter(|s| !s.trim().is_empty()),
        source: "lrclib".into(),
        provider_id: "lrclib".into(),
    })
}

pub fn fetch_best_match(query: &LyricsSearchQuery) -> Result<Option<LyricsPayload>, AppError> {
    let mut url = format!(
        "{LRCLIB_BASE}/get?track_name={}&artist_name={}",
        urlencoding(&query.title),
        urlencoding(query.artist.as_deref().unwrap_or(""))
    );
    if let Some(album) = &query.album {
        url.push_str("&album_name=");
        url.push_str(&urlencoding(album));
    }
    if let Some(duration_ms) = query.duration_ms {
        url.push_str(&format!("&duration={}", duration_ms / 1000));
    }

    let body = match http_get(&url) {
        Ok(body) => body,
        Err(AppError::Message(msg)) if msg.contains("404") => return Ok(None),
        Err(err) => return Err(err),
    };

    let row: LrcLibTrack = serde_json::from_str(&body)
        .map_err(|e| AppError::Message(format!("LRCLIB get parse failed: {e}")))?;

    let mut payload = LyricsPayload::with_content(
        None,
        row.plain_lyrics,
        row.synced_lyrics,
        "lrclib",
        "lrclib",
        "LRCLIB (lrclib.net)",
    );
    payload.source_url = Some(format!("https://lrclib.net/api/get/{}", row.id));
    if payload.has_content() {
        Ok(Some(payload))
    } else {
        Ok(None)
    }
}

fn http_get(url: &str) -> Result<String, AppError> {
    let response = ureq::get(url)
        .set("User-Agent", USER_AGENT)
        .call()
        .map_err(|e| match e {
            ureq::Error::Status(code, _) => AppError::Message(format!("LRCLIB HTTP {code}")),
            other => AppError::Message(format!("LRCLIB request failed: {other}")),
        })?;
    response
        .into_string()
        .map_err(|e| AppError::Message(format!("LRCLIB read failed: {e}")))
}

fn urlencoding(value: &str) -> String {
    let mut out = String::with_capacity(value.len());
    for byte in value.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(byte as char);
            }
            b' ' => out.push_str("%20"),
            _ => out.push_str(&format!("%{byte:02X}")),
        }
    }
    out
}
