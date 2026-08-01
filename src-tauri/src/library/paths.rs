//! Path helpers for library indexing (reference-only — never copy audio).

use std::path::{Path, PathBuf};

/// Canonicalize when possible and strip Windows verbatim `\\?\` prefix for stable DB keys.
pub fn normalize_path(path: &Path) -> PathBuf {
    let canonical = path.canonicalize().unwrap_or_else(|_| path.to_path_buf());
    strip_verbatim_prefix(&canonical)
}

pub fn normalize_path_string(path: &Path) -> String {
    normalize_path(path).to_string_lossy().to_string()
}

pub fn strip_verbatim_prefix(path: &Path) -> PathBuf {
    let raw = path.to_string_lossy();
    if let Some(stripped) = raw.strip_prefix(r"\\?\") {
        PathBuf::from(stripped)
    } else {
        path.to_path_buf()
    }
}

/// Comparison key: normalized separators + platform case rules.
pub fn path_key(path: &Path) -> String {
    let normalized = normalize_path(path);
    let mut key = normalized.to_string_lossy().replace('/', std::path::MAIN_SEPARATOR_STR);
    while key.len() > 3 && key.ends_with(std::path::MAIN_SEPARATOR) {
        key.pop();
    }
    #[cfg(windows)]
    {
        key = key.to_lowercase();
    }
    key
}

/// True when `child` is the same as `ancestor` or nested under it (separator-safe).
pub fn path_is_within(ancestor: &Path, child: &Path) -> bool {
    let a = path_key(ancestor);
    let c = path_key(child);
    if a == c {
        return true;
    }
    let prefix = format!("{a}{}", std::path::MAIN_SEPARATOR);
    c.starts_with(&prefix)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn within_requires_separator_boundary() {
        assert!(path_is_within(Path::new(r"C:\Music"), Path::new(r"C:\Music\a.mp3")));
        assert!(path_is_within(Path::new(r"C:\Music"), Path::new(r"C:\Music")));
        assert!(!path_is_within(Path::new(r"C:\Music"), Path::new(r"C:\Music2\a.mp3")));
    }
}
