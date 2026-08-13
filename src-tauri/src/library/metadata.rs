use crate::audio::dsp::parse_replaygain_db;
use crate::error::AppError;
use crate::library::extensions::normalize_extension;
use crate::library::models::ParsedTrack;
use lofty::file::{AudioFile, TaggedFileExt};
use lofty::picture::PictureType;
use lofty::prelude::*;
use lofty::probe::Probe;
use lofty::tag::ItemKey;
use std::fs;
use std::fs::File;
use std::path::Path;
use std::time::SystemTime;
use symphonia::core::formats::probe::Hint;
use symphonia::core::formats::{FormatOptions, TrackType};
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::units::Timestamp;
use symphonia::default::get_probe;

pub fn parse_audio_file(path: &Path) -> Result<ParsedTrack, AppError> {
    match parse_with_lofty(path) {
        Ok(parsed) => Ok(parsed),
        Err(lofty_err) => match parse_with_symphonia(path) {
            Ok(parsed) => Ok(parsed),
            Err(sym_err) => Err(AppError::Message(format!(
                "Failed to read {}: {lofty_err}; also {sym_err}",
                path.display()
            ))),
        },
    }
}

fn parse_with_lofty(path: &Path) -> Result<ParsedTrack, AppError> {
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

    let mut artwork_bytes = None;
    let mut artwork_mime = None;
    let mut has_lyrics = false;
    let mut replaygain_track_gain = None;
    let mut replaygain_album_gain = None;
    let mut replaygain_track_peak = None;
    let mut replaygain_album_peak = None;

    // Prefer primary tag for text; collect cover art from any tag (MP4 often uses "Other").
    if let Some(picture) = tagged
        .tags()
        .iter()
        .find_map(|tag| pick_cover(tag.pictures()))
    {
        artwork_bytes = Some(picture.data().to_vec());
        artwork_mime = Some(format!("{:?}", picture.mime_type()));
    }

    let tag = tagged.primary_tag().or_else(|| tagged.first_tag());
    let fallback_title = path
        .file_stem()
        .and_then(|s| s.to_str())
        .map(|s| s.to_string());

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
        replaygain_track_gain = tag
            .get_string(ItemKey::ReplayGainTrackGain)
            .and_then(parse_replaygain_db);
        replaygain_album_gain = tag
            .get_string(ItemKey::ReplayGainAlbumGain)
            .and_then(parse_replaygain_db);
        replaygain_track_peak = tag
            .get_string(ItemKey::ReplayGainTrackPeak)
            .and_then(|v| v.trim().parse().ok());
        replaygain_album_peak = tag
            .get_string(ItemKey::ReplayGainAlbumPeak)
            .and_then(|v| v.trim().parse().ok());

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
        replaygain_track_gain,
        replaygain_album_gain,
        replaygain_track_peak,
        replaygain_album_peak,
        artwork_bytes,
        artwork_mime,
    })
}

/// When Lofty's MP4 tag reader rejects a still-playable file (e.g. quirky M4A
/// layouts that report "No moov atom"), fall back to Symphonia for basics.
fn parse_with_symphonia(path: &Path) -> Result<ParsedTrack, AppError> {
    let meta = fs::metadata(path)?;
    let size = meta.len();
    let mtime = system_time_to_unix(meta.modified().ok());
    let ctime = meta.created().ok().and_then(system_time_to_unix_opt);

    let file = File::open(path).map_err(|e| {
        AppError::Message(format!("Unable to open {}: {e}", path.display()))
    })?;
    let mss = MediaSourceStream::new(Box::new(file), Default::default());
    let mut hint = Hint::new();
    if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
        hint.with_extension(ext);
    }

    let format = get_probe()
        .probe(
            &hint,
            mss,
            FormatOptions::default(),
            MetadataOptions::default(),
        )
        .map_err(|e| AppError::Message(format!("Unsupported or corrupt audio: {e}")))?;

    let track = format
        .default_track(TrackType::Audio)
        .ok_or_else(|| AppError::Message("No audio track found in file".into()))?;

    let codec_params = track
        .codec_params
        .as_ref()
        .ok_or_else(|| AppError::Message("Missing codec parameters".into()))?;
    let audio = codec_params
        .audio()
        .ok_or_else(|| AppError::Message("Track is not an audio stream".into()))?;

    let sample_rate = audio.sample_rate.map(|v| v as i64);
    let channels = audio
        .channels
        .as_ref()
        .map(|c| c.count() as i64);
    let bit_depth = audio.bits_per_sample.map(|v| v as i64);
    let duration_ms = duration_ms_from_track(track);
    let title = path
        .file_stem()
        .and_then(|s| s.to_str())
        .map(|s| s.to_string());

    Ok(ParsedTrack {
        path: path.to_path_buf(),
        size,
        mtime,
        ctime,
        extension: normalize_extension(path),
        title,
        artist: None,
        album_artist: None,
        album: None,
        genre: None,
        year: None,
        track_number: None,
        track_total: None,
        disc_number: None,
        disc_total: None,
        composer: None,
        comment: None,
        duration_ms,
        bitrate: None,
        sample_rate,
        bit_depth,
        channels,
        codec: Some(format!("{:?}", audio.codec)),
        container: Some(normalize_extension(path)),
        has_lyrics: false,
        replaygain_track_gain: None,
        replaygain_album_gain: None,
        replaygain_track_peak: None,
        replaygain_album_peak: None,
        artwork_bytes: None,
        artwork_mime: None,
    })
}

fn duration_ms_from_track(track: &symphonia::core::formats::Track) -> Option<i64> {
    let tb = track.time_base?;
    let dur = track.duration?;
    let ts = dur.timestamp_from(Timestamp::ZERO)?;
    let time = tb.calc_time(ts)?;
    let ms = time.as_millis();
    if ms <= 0 {
        None
    } else {
        Some(ms as i64)
    }
}

pub fn write_basic_tags(
    path: &Path,
    title: Option<&str>,
    artist: Option<&str>,
    album: Option<&str>,
    album_artist: Option<&str>,
    genre: Option<&str>,
    year: Option<i64>,
    track_number: Option<u32>,
) -> Result<(), AppError> {
    use lofty::tag::Tag;

    let mut tagged = Probe::open(path)
        .map_err(|e| AppError::Message(format!("Failed to open {}: {e}", path.display())))?
        .read()
        .map_err(|e| AppError::Message(format!("Failed to read {}: {e}", path.display())))?;

    let tag = if let Some(existing) = tagged.primary_tag_mut() {
        existing
    } else {
        tagged.insert_tag(Tag::new(tagged.primary_tag_type()));
        tagged
            .primary_tag_mut()
            .ok_or_else(|| AppError::Message("Unable to create tag".into()))?
    };

    if let Some(title) = title {
        tag.set_title(title.to_string());
    }
    if let Some(artist) = artist {
        tag.set_artist(artist.to_string());
    }
    if let Some(album) = album {
        tag.set_album(album.to_string());
    }
    if let Some(album_artist) = album_artist {
        tag.insert_text(ItemKey::AlbumArtist, album_artist.to_string());
    }
    if let Some(genre) = genre {
        tag.set_genre(genre.to_string());
    }
    if let Some(year) = year {
        tag.insert_text(ItemKey::Year, year.to_string());
    }
    if let Some(track_number) = track_number {
        tag.set_track(track_number);
    }

    tagged
        .save_to_path(path, lofty::config::WriteOptions::default())
        .map_err(|e| AppError::Message(format!("Failed to write tags: {e}")))?;
    Ok(())
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    #[test]
    fn parse_fake_plastic_live_m4a_if_present() {
        let path =
            Path::new(r"C:\Users\JW\Downloads\frank unrelease\Fake Plastic Trees (Live).m4a");
        if !path.is_file() {
            return;
        }
        let parsed = parse_audio_file(path).expect("playable m4a should import");
        assert_eq!(
            parsed.title.as_deref(),
            Some("Fake Plastic Trees (Live)")
        );
        assert!(parsed.duration_ms.unwrap_or(0) > 60_000);
        assert_eq!(parsed.sample_rate, Some(44_100));
        assert_eq!(parsed.channels, Some(2));
    }
}
