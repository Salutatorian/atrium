//! Content fingerprints for library dedupe (same audio → one track).

use crate::error::AppError;
use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::{BufReader, Read};
use std::path::Path;

/// SHA-256 of file bytes as lowercase hex. Streams in chunks (light on RAM).
pub fn hash_file_sha256(path: &Path) -> Result<String, AppError> {
    let file = File::open(path).map_err(|e| {
        AppError::Message(format!("Could not read file for dedupe hash: {e}"))
    })?;
    let mut reader = BufReader::with_capacity(64 * 1024, file);
    let mut hasher = Sha256::new();
    let mut buf = [0_u8; 64 * 1024];
    loop {
        let n = reader.read(&mut buf).map_err(|e| {
            AppError::Message(format!("Could not hash audio file: {e}"))
        })?;
        if n == 0 {
            break;
        }
        hasher.update(&buf[..n]);
    }
    Ok(hasher
        .finalize()
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect())
}
