use crate::app::AppState;
use crate::error::AppError;
use crate::events::{LIBRARY_UPDATED, SCAN_PROGRESS};
use crate::library::discover::discover_audio_files;
use crate::library::extensions::is_supported_audio;
use crate::library::metadata::parse_audio_file;
use crate::library::models::{DropClassification, ScanProgressEvent};
use crate::library::repository::{
    create_scan_job, file_needs_rescan, record_import_error, update_scan_job, upsert_parsed_track,
};
use parking_lot::Mutex;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager};
use uuid::Uuid;

struct JobFlags {
    pause: AtomicBool,
    cancel: AtomicBool,
}

struct ActiveJob {
    flags: Arc<JobFlags>,
}

pub struct ScanManager {
    jobs: Mutex<HashMap<String, ActiveJob>>,
}

impl Default for ScanManager {
    fn default() -> Self {
        Self {
            jobs: Mutex::new(HashMap::new()),
        }
    }
}

impl ScanManager {
    pub fn start_scan(
        &self,
        app: AppHandle,
        paths: Vec<String>,
        force: bool,
    ) -> Result<String, AppError> {
        if paths.is_empty() {
            return Err(AppError::Message("No paths provided to scan".into()));
        }

        let job_id = Uuid::new_v4().to_string();
        let flags = Arc::new(JobFlags {
            pause: AtomicBool::new(false),
            cancel: AtomicBool::new(false),
        });

        {
            let state = app.state::<AppState>();
            let db = state.db.lock();
            create_scan_job(&db, &job_id, &paths)?;
        }

        self.jobs.lock().insert(
            job_id.clone(),
            ActiveJob {
                flags: Arc::clone(&flags),
            },
        );

        let job_id_thread = job_id.clone();
        thread::spawn(move || {
            if let Err(err) = run_scan_job(app.clone(), job_id_thread.clone(), paths, force, flags) {
                let _ = emit_progress(
                    &app,
                    ScanProgressEvent {
                        job_id: job_id_thread.clone(),
                        status: "completed_with_errors".into(),
                        discovered: 0,
                        processed: 0,
                        errors: 1,
                        current_path: None,
                        message: Some(err.to_string()),
                    },
                );
            }

            if let Some(state) = app.try_state::<AppState>() {
                state.scan_manager.jobs.lock().remove(&job_id_thread);
            }
        });

        Ok(job_id)
    }

    pub fn pause(&self, job_id: &str) -> Result<(), AppError> {
        let jobs = self.jobs.lock();
        let job = jobs
            .get(job_id)
            .ok_or_else(|| AppError::Message("Scan job is not active".into()))?;
        job.flags.pause.store(true, Ordering::SeqCst);
        Ok(())
    }

    pub fn resume(&self, job_id: &str) -> Result<(), AppError> {
        let jobs = self.jobs.lock();
        let job = jobs
            .get(job_id)
            .ok_or_else(|| AppError::Message("Scan job is not active".into()))?;
        job.flags.pause.store(false, Ordering::SeqCst);
        Ok(())
    }

    pub fn cancel(&self, job_id: &str) -> Result<(), AppError> {
        let jobs = self.jobs.lock();
        let job = jobs
            .get(job_id)
            .ok_or_else(|| AppError::Message("Scan job is not active".into()))?;
        job.flags.cancel.store(true, Ordering::SeqCst);
        job.flags.pause.store(false, Ordering::SeqCst);
        Ok(())
    }
}

pub fn classify_drop_paths(paths: Vec<String>) -> DropClassification {
    let mut audio_files = Vec::new();
    let mut folders = Vec::new();
    let mut ignored = Vec::new();

    for path in paths {
        let p = PathBuf::from(&path);
        if p.is_dir() {
            folders.push(path);
        } else if p.is_file() && is_supported_audio(&p) {
            audio_files.push(path);
        } else {
            ignored.push(path);
        }
    }

    DropClassification {
        audio_files,
        folders,
        ignored,
    }
}

fn run_scan_job(
    app: AppHandle,
    job_id: String,
    paths: Vec<String>,
    force: bool,
    flags: Arc<JobFlags>,
) -> Result<(), AppError> {
    emit_progress(
        &app,
        ScanProgressEvent {
            job_id: job_id.clone(),
            status: "discovering".into(),
            discovered: 0,
            processed: 0,
            errors: 0,
            current_path: None,
            message: Some("Discovering audio files".into()),
        },
    )?;

    let root_paths: Vec<PathBuf> = paths.iter().map(PathBuf::from).collect();
    let library_settings = {
        let state = app.state::<AppState>();
        let settings = state.settings.lock().library.clone();
        settings
    };

    let discovered = discover_audio_files(&root_paths, &library_settings)
        .map_err(AppError::Message)?;

    {
        let state = app.state::<AppState>();
        let db = state.db.lock();
        update_scan_job(
            &db,
            &job_id,
            "reading_metadata",
            discovered.len() as u64,
            0,
            0,
            None,
            false,
        )?;
    }

    emit_progress(
        &app,
        ScanProgressEvent {
            job_id: job_id.clone(),
            status: "reading_metadata".into(),
            discovered: discovered.len() as u64,
            processed: 0,
            errors: 0,
            current_path: None,
            message: Some(format!("Found {} files", discovered.len())),
        },
    )?;

    let mut processed = 0u64;
    let mut errors = 0u64;
    let mut last_emit = Instant::now();
    let data_dir = app.state::<AppState>().data_dir.clone();

    for path in &discovered {
        while flags.pause.load(Ordering::SeqCst) {
            if flags.cancel.load(Ordering::SeqCst) {
                break;
            }
            {
                let state = app.state::<AppState>();
                let db = state.db.lock();
                update_scan_job(
                    &db,
                    &job_id,
                    "paused",
                    discovered.len() as u64,
                    processed,
                    errors,
                    Some(&path.to_string_lossy()),
                    false,
                )?;
            }
            emit_progress(
                &app,
                ScanProgressEvent {
                    job_id: job_id.clone(),
                    status: "paused".into(),
                    discovered: discovered.len() as u64,
                    processed,
                    errors,
                    current_path: Some(path.to_string_lossy().to_string()),
                    message: Some("Scan paused".into()),
                },
            )?;
            thread::sleep(Duration::from_millis(200));
        }

        if flags.cancel.load(Ordering::SeqCst) {
            let state = app.state::<AppState>();
            let db = state.db.lock();
            update_scan_job(
                &db,
                &job_id,
                "cancelled",
                discovered.len() as u64,
                processed,
                errors,
                Some(&path.to_string_lossy()),
                true,
            )?;
            emit_progress(
                &app,
                ScanProgressEvent {
                    job_id: job_id.clone(),
                    status: "cancelled".into(),
                    discovered: discovered.len() as u64,
                    processed,
                    errors,
                    current_path: None,
                    message: Some("Scan cancelled".into()),
                },
            )?;
            return Ok(());
        }

        let path_str = path.to_string_lossy().to_string();
        let meta = match std::fs::metadata(path) {
            Ok(m) => m,
            Err(err) => {
                errors += 1;
                let state = app.state::<AppState>();
                let db = state.db.lock();
                let _ = record_import_error(
                    &db,
                    &job_id,
                    &path_str,
                    "io_error",
                    &err.to_string(),
                );
                continue;
            }
        };

        let mtime = meta
            .modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs() as i64)
            .unwrap_or(0);

        let needs = {
            let state = app.state::<AppState>();
            let db = state.db.lock();
            if force {
                true
            } else {
                file_needs_rescan(&db, path, meta.len(), mtime).unwrap_or(true)
            }
        };

        if needs {
            match parse_audio_file(path) {
                Ok(parsed) => {
                    let state = app.state::<AppState>();
                    let db = state.db.lock();
                    if let Err(err) = upsert_parsed_track(&db, &data_dir, &parsed) {
                        errors += 1;
                        let _ = record_import_error(
                            &db,
                            &job_id,
                            &path_str,
                            "ingest_error",
                            &err.to_string(),
                        );
                    }
                }
                Err(err) => {
                    errors += 1;
                    let state = app.state::<AppState>();
                    let db = state.db.lock();
                    let _ = record_import_error(
                        &db,
                        &job_id,
                        &path_str,
                        "metadata_error",
                        &err.to_string(),
                    );
                }
            }
        }

        processed += 1;

        if last_emit.elapsed() >= Duration::from_millis(200)
            || processed == discovered.len() as u64
        {
            last_emit = Instant::now();
            {
                let state = app.state::<AppState>();
                let db = state.db.lock();
                let _ = update_scan_job(
                    &db,
                    &job_id,
                    "saving_library",
                    discovered.len() as u64,
                    processed,
                    errors,
                    Some(&path_str),
                    false,
                );
            }
            let _ = emit_progress(
                &app,
                ScanProgressEvent {
                    job_id: job_id.clone(),
                    status: "saving_library".into(),
                    discovered: discovered.len() as u64,
                    processed,
                    errors,
                    current_path: Some(shorten_path(path)),
                    message: None,
                },
            );
        }
    }

    let final_status = if errors > 0 {
        "completed_with_errors"
    } else {
        "complete"
    };

    {
        let state = app.state::<AppState>();
        let db = state.db.lock();
        update_scan_job(
            &db,
            &job_id,
            final_status,
            discovered.len() as u64,
            processed,
            errors,
            None,
            true,
        )?;
    }

    emit_progress(
        &app,
        ScanProgressEvent {
            job_id: job_id.clone(),
            status: final_status.into(),
            discovered: discovered.len() as u64,
            processed,
            errors,
            current_path: None,
            message: Some(format!("Imported {processed} files")),
        },
    )?;

    let _ = app.emit(LIBRARY_UPDATED, ());
    Ok(())
}

fn emit_progress(app: &AppHandle, event: ScanProgressEvent) -> Result<(), AppError> {
    app.emit(SCAN_PROGRESS, event)
        .map_err(|e| AppError::Message(e.to_string()))
}

fn shorten_path(path: &Path) -> String {
    let full = path.to_string_lossy();
    if full.len() <= 72 {
        return full.to_string();
    }
    let file = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("audio");
    format!("…/{file}")
}
