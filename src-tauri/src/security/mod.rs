//! Security helpers for path validation and import sanitization.

use crate::error::AppError;
use std::path::{Component, Path};

#[allow(dead_code)]
pub fn reject_path_traversal(path: &str) -> Result<(), AppError> {
    let p = Path::new(path);
    for component in p.components() {
        if matches!(component, Component::ParentDir) {
            return Err(AppError::Message(
                "Path traversal is not allowed".into(),
            ));
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn allows_normal_relative_path() {
        reject_path_traversal("themes/custom/bg.png").unwrap();
    }

    #[test]
    fn rejects_parent_dir() {
        assert!(reject_path_traversal("../secrets.txt").is_err());
    }
}
