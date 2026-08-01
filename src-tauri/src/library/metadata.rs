use crate::error::AppError;
use crate::library::extensions::normalize_extension;
use crate::library::models::ParsedTrack;
use lofty::file::{AudioFile, TaggedFileExt};
use lofty::picture::PictureType;
use lofty::prelude::*;
use lofty::probe::Probe;
use std::fs;
use std::path::Path;
use std::time::SystemTime;

pub fn parse_audio_file(path: &Path) -> Result<ParsedTrack, AppError> {
    let meta = fs::metadata(path)?;
    let size = meta.len();
    let mtime = system_time_to_unix(meta.modified().ok());
    let ctime = meta.created().ok().and_then(system_time_to_unix_opt);

    let tagged = Probe::open(path)
        .map_err(|e| AppError::Message(format!("Failed to open {}: {e}", path.display())))?
        .read()
        .map_err(|e| AppError::Message(format!("Failed to read {}: {e}", path.display())))?;

    let properties = tagged.properties();
    let duration_ms = properties.duration().as_millis().try_into().ok();
    let bitrate = properties.audio_bitrate().map(|v| v as i64);
    let sample_rate = properties.sample_rate().map(|v| v as i64);
    let bit_depth = properties.bit_depth().map(|v| v as i64);
    let channels = properties.channels().map(|v| v as i64);
    let codec = format!("{:?}", tagged.file_type());

    let tag = tagged.primary_tag().or_else(|| tagged.first_tag());
    let fallback_title = path
        .file_stem()
        .and_then(|s| s.to_str())
        .map(|s| s.to_string());

    let mut artwork_bytes = None;
    let mut artwork_mime = None;
    let mut has_lyrics = false;

    let (
        title,
        artist,
        album_artist,
        album,
        genre,
        year,
        track_number,
        track_total,
        disc_number,
        disc_total,
        composer,
        comment,
    ) = if let Some(tag) = tag {
        has_lyrics = tag.get_string(ItemKey::Lyrics).is_some();

        if let Some(picture) = pick_cover(tag.pictures()) {
            artwork_bytes = Some(picture.data().to_vec());
            artwork_mime = Some(format!("{:?}", picture.mime_type()));
        }

        let year = tag
            .get_string(ItemKey::Year)
            .and_then(|v| v.parse::<i64>().ok())
            .or_else(|| {
                tag.get_string(ItemKey::RecordingDate)
                    .and_then(|v| v.get(0..4)?.parse::<i64>().ok())
            });

        (
            tag.title().map(|v| v.to_string()).or(fallback_title),
            tag.artist().map(|v| v.to_string()),
            tag.get_string(ItemKey::AlbumArtist)
                .map(|v| v.to_string()),
            tag.album().map(|v| v.to_string()),
            tag.genre().map(|v| v.to_string()),
            year,
            tag.track().map(|v| v as i64),
            tag.track_total().map(|v| v as i64),
            tag.disk().map(|v| v as i64),
            tag.disk_total().map(|v| v as i64),
            tag.get_string(ItemKey::Composer).map(|v| v.to_string()),
            tag.get_string(ItemKey::Comment).map(|v| v.to_string()),
        )
    } else {
        (
            fallback_title,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
        )
    };

    Ok(ParsedTrack {
        path: path.to_path_buf(),
        size,
        mtime,
        ctime,
        extension: normalize_extension(path),
        title,
        artist,
        album_artist,
        album,
        genre,
        year,
        track_number,
        track_total,
        disc_number,
        disc_total,
        composer,
        comment,
        duration_ms,
        bitrate,
        sample_rate,
        bit_depth,
        channels,
        codec: Some(codec),
        container: Some(normalize_extension(path)),
        has_lyrics,
        artwork_bytes,
        artwork_mime,
    })
}

fn pick_cover(pictures: &[lofty::picture::Picture]) -> Option<&lofty::picture::Picture> {
    pictures
        .iter()
        .find(|p| p.pic_type() == PictureType::CoverFront)
        .or_else(|| pictures.first())
}

fn system_time_to_unix(time: Option<SystemTime>) -> i64 {
    time.and_then(system_time_to_unix_opt).unwrap_or(0)
}

fn system_time_to_unix_opt(time: SystemTime) -> Option<i64> {
    time.duration_since(SystemTime::UNIX_EPOCH)
        .ok()
        .map(|d| d.as_secs() as i64)
}
