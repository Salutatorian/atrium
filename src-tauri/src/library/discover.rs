use crate::library::extensions::is_supported_audio;
use crate::settings::LibrarySettings;
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

pub fn discover_audio_files(
    roots: &[PathBuf],
    settings: &LibrarySettings,
) -> Result<Vec<PathBuf>, String> {
    let mut seen = HashSet::new();
    let mut files = Vec::new();

    for root in roots {
        if root.is_file() {
            if is_supported_audio(root) {
                let canonical = canonicalize_lossy(root);
                if seen.insert(canonical.clone()) {
                    files.push(canonical);
                }
            }
            continue;
        }

        if !root.is_dir() {
            continue;
        }

        let walker = WalkDir::new(root)
            .follow_links(settings.follow_symlinks)
            .max_depth(settings.max_recursion_depth as usize)
            .into_iter()
            .filter_entry(|entry| {
                // Depth 0 is the scan root (temp dirs may start with '.' on Windows).
                if entry.depth() == 0 {
                    return true;
                }
                let name = entry.file_name().to_string_lossy();
                if !settings.include_hidden_files && is_hidden_name(&name) {
                    return false;
                }
                true
            });

        for entry in walker {
            let entry = match entry {
                Ok(e) => e,
                Err(_) => continue,
            };
            if !entry.file_type().is_file() {
                continue;
            }
            let path = entry.path();
            if !is_supported_audio(path) {
                continue;
            }
            let canonical = canonicalize_lossy(path);
            if seen.insert(canonical.clone()) {
                files.push(canonical);
            }
        }
    }

    files.sort();
    Ok(files)
}

fn is_hidden_name(name: &str) -> bool {
    name.starts_with('.') || name.eq_ignore_ascii_case("System Volume Information")
}

fn canonicalize_lossy(path: &Path) -> PathBuf {
    path.canonicalize().unwrap_or_else(|_| path.to_path_buf())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::settings::LibrarySettings;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn discovers_nested_audio_and_skips_other_files() {
        let dir = tempdir().unwrap();
        let nested = dir.path().join("Album");
        fs::create_dir_all(&nested).unwrap();
        fs::write(nested.join("a.mp3"), b"fake").unwrap();
        fs::write(nested.join("readme.txt"), b"nope").unwrap();
        fs::write(dir.path().join("root.flac"), b"fake").unwrap();

        let settings = LibrarySettings {
            watch_folders: false,
            include_hidden_files: false,
            follow_symlinks: false,
            max_recursion_depth: 32,
        };

        let found = discover_audio_files(&[dir.path().to_path_buf()], &settings).unwrap();
        assert_eq!(found.len(), 2);
        assert!(found.iter().any(|p| p.ends_with("a.mp3")));
        assert!(found.iter().any(|p| p.ends_with("root.flac")));
    }
}
