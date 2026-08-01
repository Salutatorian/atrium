//! Supported audio extensions for Phase 2 import.

pub const SUPPORTED_EXTENSIONS: &[&str] = &[
    "mp3", "flac", "wav", "aiff", "aif", "aac", "m4a", "alac", "ogg", "opus", "wv",
];

pub fn is_supported_audio(path: &std::path::Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| {
            SUPPORTED_EXTENSIONS
                .iter()
                .any(|allowed| ext.eq_ignore_ascii_case(allowed))
        })
        .unwrap_or(false)
}

pub fn normalize_extension(path: &std::path::Path) -> String {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_ascii_lowercase())
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    #[test]
    fn accepts_common_audio_extensions() {
        assert!(is_supported_audio(Path::new("song.MP3")));
        assert!(is_supported_audio(Path::new("a.flac")));
        assert!(!is_supported_audio(Path::new("notes.txt")));
    }
}
