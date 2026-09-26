use crate::error::AppError;
use image::imageops::FilterType;
use image::ImageFormat;
use sha2::{Digest, Sha256};
use std::fs;
use std::io::Cursor;
use std::path::{Path, PathBuf};

const COVER_NAMES: &[&str] = &[
    "cover.jpg",
    "cover.jpeg",
    "cover.png",
    "cover.webp",
    "folder.jpg",
    "folder.jpeg",
    "folder.png",
    "front.jpg",
    "front.jpeg",
    "front.png",
    "album.jpg",
    "album.png",
    "artwork.jpg",
    "artwork.png",
];

pub fn artwork_cache_dir(data_dir: &Path) -> PathBuf {
    data_dir.join("cache").join("artwork")
}

pub fn ensure_artwork_dirs(data_dir: &Path) -> Result<(), AppError> {
    let root = artwork_cache_dir(data_dir);
    fs::create_dir_all(root.join("original"))?;
    fs::create_dir_all(root.join("thumb"))?;
    Ok(())
}

pub fn find_sidecar_artwork(audio_path: &Path) -> Option<PathBuf> {
    let parent = audio_path.parent()?;
    for name in COVER_NAMES {
        let candidate = parent.join(name);
        if candidate.is_file() {
            return Some(candidate);
        }
    }

    // Case-insensitive fallback for Windows/macOS mixed casings.
    if let Ok(entries) = fs::read_dir(parent) {
        for entry in entries.flatten() {
            let path = entry.path();
            if !path.is_file() {
                continue;
            }
            if let Some(file_name) = path.file_name().and_then(|n| n.to_str()) {
                let lower = file_name.to_ascii_lowercase();
                if COVER_NAMES.iter().any(|n| *n == lower) {
                    return Some(path);
                }
            }
        }
    }
    None
}

pub fn persist_artwork(
    data_dir: &Path,
    source_hint: &str,
    bytes: &[u8],
) -> Result<String, AppError> {
    ensure_artwork_dirs(data_dir)?;
    let cache_key = hash_bytes(bytes);
    let original_path = artwork_cache_dir(data_dir)
        .join("original")
        .join(format!("{cache_key}.img"));
    let thumb_path = artwork_cache_dir(data_dir)
        .join("thumb")
        .join(format!("{cache_key}.jpg"));

    if !original_path.exists() {
        fs::write(&original_path, bytes)?;
    }

    if !thumb_path.exists() {
        match image::load_from_memory(bytes) {
            Ok(img) => {
                let thumb = img.resize(256, 256, FilterType::Triangle);
                let mut cursor = Cursor::new(Vec::new());
                thumb
                    .write_to(&mut cursor, ImageFormat::Jpeg)
                    .map_err(|e| AppError::Message(format!("Artwork encode failed: {e}")))?;
                fs::write(&thumb_path, cursor.into_inner())?;
            }
            Err(_) => {
                // Keep original only when decode fails.
                let _ = source_hint;
            }
        }
    }

    Ok(cache_key)
}

pub fn thumb_path(data_dir: &Path, cache_key: &str) -> PathBuf {
    artwork_cache_dir(data_dir)
        .join("thumb")
        .join(format!("{cache_key}.jpg"))
}

pub fn original_path(data_dir: &Path, cache_key: &str) -> PathBuf {
    artwork_cache_dir(data_dir)
        .join("original")
        .join(format!("{cache_key}.img"))
}

pub fn playlist_cover_dir(data_dir: &Path) -> PathBuf {
    data_dir.join("cache").join("playlist-covers")
}

/// Center-crop to a 1:1 square JPEG for playlist covers.
pub fn persist_square_cover(
    data_dir: &Path,
    playlist_id: &str,
    source: &Path,
) -> Result<PathBuf, AppError> {
    if playlist_id.is_empty()
        || !playlist_id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-')
    {
        return Err(AppError::Message("Invalid playlist".into()));
    }
    if !source.is_file() {
        return Err(AppError::Message("Choose an image file".into()));
    }
    let img = image::open(source)
        .map_err(|e| AppError::Message(format!("Could not read image: {e}")))?;
    let w = img.width();
    let h = img.height();
    if w == 0 || h == 0 {
        return Err(AppError::Message("Image is empty".into()));
    }
    let side = w.min(h);
    let x = (w - side) / 2;
    let y = (h - side) / 2;
    let square = img
        .crop_imm(x, y, side, side)
        .resize_exact(512, 512, FilterType::Triangle);
    let dir = playlist_cover_dir(data_dir);
    fs::create_dir_all(&dir)?;
    let dest = dir.join(format!("{playlist_id}.jpg"));
    square
        .to_rgb8()
        .save(&dest)
        .map_err(|e| AppError::Message(format!("Could not save cover: {e}")))?;
    Ok(dest)
}

fn hash_bytes(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    hasher
        .finalize()
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::{Rgb, RgbImage};

    #[test]
    fn square_cover_is_1_to_1() {
        let dir = tempfile::tempdir().unwrap();
        let src = dir.path().join("wide.png");
        RgbImage::from_pixel(400, 120, Rgb([12, 80, 40]))
            .save(&src)
            .unwrap();
        let out = persist_square_cover(dir.path(), "playlist-1", &src).unwrap();
        let loaded = image::open(&out).unwrap();
        assert_eq!(loaded.width(), 512);
        assert_eq!(loaded.height(), 512);
    }
}
