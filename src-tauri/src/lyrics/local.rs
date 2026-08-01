use std::fs;
use std::path::{Path, PathBuf};

use lofty::file::TaggedFileExt;
use lofty::probe::Probe;
use lofty::tag::ItemKey;

use crate::error::AppError;
use crate::lyrics::lrc::is_synced_lrc;
use crate::lyrics::types::LyricsPayload;

pub fn read_embedded(path: &Path, track_id: Option<i64>) -> Result<Option<LyricsPayload>, AppError> {
    let tagged = match Probe::open(path).map_err(|e| AppError::Message(e.to_string()))?.read() {
        Ok(file) => file,
        Err(_) => return Ok(None),
    };
    let Some(tag) = tagged.primary_tag().or_else(|| tagged.first_tag()) else {
        return Ok(None);
    };
    let Some(text) = tag.get_string(ItemKey::Lyrics).map(|s| s.to_string()) else {
        return Ok(None);
    };
    if text.trim().is_empty() {
        return Ok(None);
    }
    if is_synced_lrc(&text) {
        Ok(Some(LyricsPayload::with_content(
            track_id,
            None,
            Some(text),
            "embedded",
            "embedded",
            "Embedded in file metadata",
        )))
    } else {
        Ok(Some(LyricsPayload::with_content(
            track_id,
            Some(text),
            None,
            "embedded",
            "embedded",
            "Embedded in file metadata",
        )))
    }
}

pub fn read_sidecar(path: &Path, track_id: Option<i64>) -> Result<Option<LyricsPayload>, AppError> {
    if let Some(payload) = read_sidecar_file(path, "lrc", track_id)? {
        return Ok(Some(payload));
    }
    read_sidecar_file(path, "txt", track_id)
}

fn read_sidecar_file(
    path: &Path,
    extension: &str,
    track_id: Option<i64>,
) -> Result<Option<LyricsPayload>, AppError> {
    let sidecar = sidecar_path(path, extension);
    if !sidecar.is_file() {
        return Ok(None);
    }
    let text = fs::read_to_string(&sidecar)?;
    if text.trim().is_empty() {
        return Ok(None);
    }
    let source = format!("sidecar-{extension}");
    if extension == "lrc" || is_synced_lrc(&text) {
        Ok(Some(LyricsPayload::with_content(
            track_id,
            None,
            Some(text),
            source,
            "sidecar",
            format!("Local .{extension} sidecar"),
        )))
    } else {
        Ok(Some(LyricsPayload::with_content(
            track_id,
            Some(text),
            None,
            source,
            "sidecar",
            format!("Local .{extension} sidecar"),
        )))
    }
}

fn sidecar_path(path: &Path, extension: &str) -> PathBuf {
    path.with_extension(extension)
}
