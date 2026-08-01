use crate::audio::decoder::{convert_audio, SymphoniaDecoder};
use crate::audio::output::{OutputDevice, SharedBuffer};
use crate::audio::queue::PlayQueue;
use crate::audio::types::{
    PlayerSnapshot, PlayerStatus, PositionEvent, QueueTrack, RepeatMode, TrackChangedEvent,
};
use crate::error::AppError;
use crate::events::{PLAYER_ERROR, PLAYER_POSITION, PLAYER_QUEUE_CHANGED, PLAYER_TRACK_CHANGED};
use crossbeam_channel::{unbounded, Receiver, Sender};
use parking_lot::Mutex;
use std::path::Path;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

enum PlayerCommand {
    ReplaceQueue {
        tracks: Vec<QueueTrack>,
        start_index: usize,
        autoplay: bool,
    },
    AddEnd(Vec<QueueTrack>),
    AddNext(Vec<QueueTrack>),
    Remove(usize),
    Clear,
    Play,
    Pause,
    Stop,
    Next,
    Previous,
    Seek(u64),
    SetVolume(f32),
    SetMuted(bool),
    SetShuffle(bool),
    SetRepeat(RepeatMode),
    Shutdown,
}

struct SharedPlayerState {
    status: Mutex<PlayerStatus>,
    current: Mutex<Option<QueueTrack>>,
    queue: Mutex<PlayQueue>,
    position_ms: AtomicU64,
    duration_ms: AtomicU64,
    volume: Mutex<f32>,
    muted: AtomicBool,
}

pub struct PlayerEngine {
    commands: Sender<PlayerCommand>,
    state: Arc<SharedPlayerState>,
}

impl PlayerEngine {
    pub fn start(app: AppHandle, initial_volume: f32) -> Result<Self, AppError> {
        let (tx, rx) = unbounded();
        let state = Arc::new(SharedPlayerState {
            status: Mutex::new(PlayerStatus::Stopped),
            current: Mutex::new(None),
            queue: Mutex::new(PlayQueue::default()),
            position_ms: AtomicU64::new(0),
            duration_ms: AtomicU64::new(0),
            volume: Mutex::new(initial_volume.clamp(0.0, 1.0)),
            muted: AtomicBool::new(false),
        });

        let worker_state = Arc::clone(&state);
        thread::Builder::new()
            .name("atrium-audio".into())
            .spawn(move || {
                if let Err(err) = run_player_worker(app, worker_state, rx, initial_volume) {
                    eprintln!("Audio worker stopped: {err}");
                }
            })
            .map_err(|e| AppError::Message(format!("Failed to start audio thread: {e}")))?;

        Ok(Self {
            commands: tx,
            state,
        })
    }

    pub fn snapshot(&self) -> PlayerSnapshot {
        let queue = self.state.queue.lock();
        PlayerSnapshot {
            status: *self.state.status.lock(),
            current: self.state.current.lock().clone(),
            position_ms: self.state.position_ms.load(Ordering::Relaxed),
            duration_ms: self.state.duration_ms.load(Ordering::Relaxed),
            volume: *self.state.volume.lock(),
            muted: self.state.muted.load(Ordering::Relaxed),
            shuffle: queue.shuffle(),
            repeat: queue.repeat(),
            queue: queue.items().to_vec(),
            queue_index: queue.index(),
        }
    }

    pub fn replace_queue(
        &self,
        tracks: Vec<QueueTrack>,
        start_index: usize,
        autoplay: bool,
    ) -> Result<(), AppError> {
        self.send(PlayerCommand::ReplaceQueue {
            tracks,
            start_index,
            autoplay,
        })
    }

    pub fn add_end(&self, tracks: Vec<QueueTrack>) -> Result<(), AppError> {
        self.send(PlayerCommand::AddEnd(tracks))
    }

    pub fn add_next(&self, tracks: Vec<QueueTrack>) -> Result<(), AppError> {
        self.send(PlayerCommand::AddNext(tracks))
    }

    pub fn remove(&self, index: usize) -> Result<(), AppError> {
        self.send(PlayerCommand::Remove(index))
    }

    pub fn clear(&self) -> Result<(), AppError> {
        self.send(PlayerCommand::Clear)
    }

    pub fn play(&self) -> Result<(), AppError> {
        self.send(PlayerCommand::Play)
    }

    pub fn pause(&self) -> Result<(), AppError> {
        self.send(PlayerCommand::Pause)
    }

    pub fn stop(&self) -> Result<(), AppError> {
        self.send(PlayerCommand::Stop)
    }

    pub fn next(&self) -> Result<(), AppError> {
        self.send(PlayerCommand::Next)
    }

    pub fn previous(&self) -> Result<(), AppError> {
        self.send(PlayerCommand::Previous)
    }

    pub fn seek(&self, position_ms: u64) -> Result<(), AppError> {
        self.send(PlayerCommand::Seek(position_ms))
    }

    pub fn set_volume(&self, volume: f32) -> Result<(), AppError> {
        *self.state.volume.lock() = volume.clamp(0.0, 1.0);
        self.send(PlayerCommand::SetVolume(volume.clamp(0.0, 1.0)))
    }

    pub fn set_muted(&self, muted: bool) -> Result<(), AppError> {
        self.state.muted.store(muted, Ordering::Relaxed);
        self.send(PlayerCommand::SetMuted(muted))
    }

    pub fn set_shuffle(&self, enabled: bool) -> Result<(), AppError> {
        self.send(PlayerCommand::SetShuffle(enabled))
    }

    pub fn set_repeat(&self, mode: RepeatMode) -> Result<(), AppError> {
        self.send(PlayerCommand::SetRepeat(mode))
    }

    fn send(&self, command: PlayerCommand) -> Result<(), AppError> {
        self.commands
            .send(command)
            .map_err(|_| AppError::Message("Audio engine is not running".into()))
    }
}

fn run_player_worker(
    app: AppHandle,
    state: Arc<SharedPlayerState>,
    rx: Receiver<PlayerCommand>,
    initial_volume: f32,
) -> Result<(), AppError> {
    let buffer = SharedBuffer::new();
    buffer
        .volume
        .store(f32::to_bits(initial_volume.clamp(0.0, 1.0)), Ordering::Relaxed);

    let output = match OutputDevice::start(Arc::clone(&buffer)) {
        Ok(output) => Some(output),
        Err(err) => {
            let _ = app.emit(PLAYER_ERROR, err.to_string());
            None
        }
    };

    let out_rate = output.as_ref().map(|o| o.sample_rate).unwrap_or(48_000);
    let out_channels = output.as_ref().map(|o| o.channels).unwrap_or(2);

    let mut decoder: Option<SymphoniaDecoder> = None;
    let mut playing = false;
    let mut last_emit = Instant::now();
    let mut decode_origin_ms = 0u64;
    let mut decoded_frames: u64 = 0;
    let source_rate = Arc::new(AtomicU64::new(out_rate as u64));

    loop {
        while let Ok(cmd) = rx.try_recv() {
            match cmd {
                PlayerCommand::Shutdown => return Ok(()),
                PlayerCommand::ReplaceQueue {
                    tracks,
                    start_index,
                    autoplay,
                } => {
                    {
                        let mut queue = state.queue.lock();
                        queue.replace(tracks, start_index);
                    }
                    emit_queue_changed(&app, &state);
                    if autoplay {
                        playing = load_current(
                            &app,
                            &state,
                            &buffer,
                            &mut decoder,
                            &mut decode_origin_ms,
                            &mut decoded_frames,
                            &source_rate,
                        )?;
                    } else {
                        playing = false;
                        *state.status.lock() = PlayerStatus::Stopped;
                    }
                }
                PlayerCommand::AddEnd(tracks) => {
                    state.queue.lock().add_end(tracks);
                    emit_queue_changed(&app, &state);
                }
                PlayerCommand::AddNext(tracks) => {
                    state.queue.lock().add_next(tracks);
                    emit_queue_changed(&app, &state);
                }
                PlayerCommand::Remove(index) => {
                    state.queue.lock().remove(index);
                    emit_queue_changed(&app, &state);
                }
                PlayerCommand::Clear => {
                    state.queue.lock().clear();
                    decoder = None;
                    buffer.clear();
                    playing = false;
                    *state.status.lock() = PlayerStatus::Stopped;
                    *state.current.lock() = None;
                    state.position_ms.store(0, Ordering::Relaxed);
                    state.duration_ms.store(0, Ordering::Relaxed);
                    emit_queue_changed(&app, &state);
                    emit_track_changed(&app, &state);
                }
                PlayerCommand::Play => {
                    if decoder.is_none() {
                        playing = load_current(
                            &app,
                            &state,
                            &buffer,
                            &mut decoder,
                            &mut decode_origin_ms,
                            &mut decoded_frames,
                            &source_rate,
                        )?;
                    } else {
                        playing = true;
                        *state.status.lock() = PlayerStatus::Playing;
                    }
                }
                PlayerCommand::Pause => {
                    playing = false;
                    *state.status.lock() = PlayerStatus::Paused;
                }
                PlayerCommand::Stop => {
                    playing = false;
                    decoder = None;
                    buffer.clear();
                    *state.status.lock() = PlayerStatus::Stopped;
                    state.position_ms.store(0, Ordering::Relaxed);
                    decode_origin_ms = 0;
                    decoded_frames = 0;
                }
                PlayerCommand::Next => {
                    let advanced = state.queue.lock().next_index(true).is_some();
                    if advanced {
                        playing = load_current(
                            &app,
                            &state,
                            &buffer,
                            &mut decoder,
                            &mut decode_origin_ms,
                            &mut decoded_frames,
                            &source_rate,
                        )?;
                    } else {
                        playing = false;
                        decoder = None;
                        buffer.clear();
                        *state.status.lock() = PlayerStatus::Stopped;
                    }
                }
                PlayerCommand::Previous => {
                    let position = state.position_ms.load(Ordering::Relaxed);
                    if position > 3_000 {
                        if let Some(active) = decoder.as_mut() {
                            active.seek_ms(0)?;
                            buffer.clear();
                            decode_origin_ms = 0;
                            decoded_frames = 0;
                            state.position_ms.store(0, Ordering::Relaxed);
                        }
                    } else {
                        let _ = state.queue.lock().previous_index();
                        playing = load_current(
                            &app,
                            &state,
                            &buffer,
                            &mut decoder,
                            &mut decode_origin_ms,
                            &mut decoded_frames,
                            &source_rate,
                        )?;
                    }
                }
                PlayerCommand::Seek(position_ms) => {
                    if let Some(active) = decoder.as_mut() {
                        active.seek_ms(position_ms)?;
                        buffer.clear();
                        decode_origin_ms = position_ms;
                        decoded_frames = 0;
                        state.position_ms.store(position_ms, Ordering::Relaxed);
                    }
                }
                PlayerCommand::SetVolume(volume) => {
                    buffer
                        .volume
                        .store(f32::to_bits(volume.clamp(0.0, 1.0)), Ordering::Relaxed);
                }
                PlayerCommand::SetMuted(muted) => {
                    buffer.muted.store(muted, Ordering::Relaxed);
                }
                PlayerCommand::SetShuffle(enabled) => {
                    state.queue.lock().set_shuffle(enabled);
                    emit_queue_changed(&app, &state);
                }
                PlayerCommand::SetRepeat(mode) => {
                    state.queue.lock().set_repeat(mode);
                    emit_queue_changed(&app, &state);
                }
            }
        }

        if playing {
            if output.is_none() {
                playing = false;
                *state.status.lock() = PlayerStatus::Stopped;
                let _ = app.emit(
                    PLAYER_ERROR,
                    "Audio device unavailable".to_string(),
                );
            } else if buffer.len() < out_rate as usize * out_channels {
                match decoder.as_mut() {
                    Some(active) => match active.decode_next() {
                        Ok(Some(chunk)) => {
                            let converted = convert_audio(
                                &chunk.samples,
                                chunk.channels,
                                chunk.sample_rate,
                                out_channels,
                                out_rate,
                            );
                            let frames = (chunk.samples.len() / chunk.channels.max(1)) as u64;
                            decoded_frames = decoded_frames.saturating_add(frames);
                            let position = decode_origin_ms.saturating_add(
                                decoded_frames.saturating_mul(1000)
                                    / source_rate.load(Ordering::Relaxed).max(1),
                            );
                            state.position_ms.store(position, Ordering::Relaxed);
                            buffer.push(&converted);
                        }
                        Ok(None) => {
                            // Track finished — advance for gapless-style transition.
                            let next = state.queue.lock().next_index(false);
                            if next.is_some() {
                                playing = load_current(
                                    &app,
                                    &state,
                                    &buffer,
                                    &mut decoder,
                                    &mut decode_origin_ms,
                                    &mut decoded_frames,
                                    &source_rate,
                                )?;
                            } else {
                                playing = false;
                                decoder = None;
                                *state.status.lock() = PlayerStatus::Stopped;
                            }
                        }
                        Err(err) => {
                            let _ = app.emit(PLAYER_ERROR, err.to_string());
                            let next = state.queue.lock().next_index(true);
                            if next.is_some() {
                                playing = load_current(
                                    &app,
                                    &state,
                                    &buffer,
                                    &mut decoder,
                                    &mut decode_origin_ms,
                                    &mut decoded_frames,
                                    &source_rate,
                                )?;
                            } else {
                                playing = false;
                                decoder = None;
                                *state.status.lock() = PlayerStatus::Stopped;
                            }
                        }
                    },
                    None => {
                        playing = false;
                        *state.status.lock() = PlayerStatus::Stopped;
                    }
                }
            }
        }

        if last_emit.elapsed() >= Duration::from_millis(200) {
            last_emit = Instant::now();
            let _ = app.emit(
                PLAYER_POSITION,
                PositionEvent {
                    position_ms: state.position_ms.load(Ordering::Relaxed),
                    duration_ms: state.duration_ms.load(Ordering::Relaxed),
                    status: *state.status.lock(),
                },
            );
        }

        thread::sleep(Duration::from_millis(4));
    }
}

fn load_current(
    app: &AppHandle,
    state: &SharedPlayerState,
    buffer: &SharedBuffer,
    decoder: &mut Option<SymphoniaDecoder>,
    decode_origin_ms: &mut u64,
    decoded_frames: &mut u64,
    source_rate: &AtomicU64,
) -> Result<bool, AppError> {
    buffer.clear();
    *decode_origin_ms = 0;
    *decoded_frames = 0;
    state.position_ms.store(0, Ordering::Relaxed);

    let track = {
        let queue = state.queue.lock();
        queue.current().cloned()
    };

    let Some(track) = track else {
        *decoder = None;
        *state.current.lock() = None;
        *state.status.lock() = PlayerStatus::Stopped;
        state.duration_ms.store(0, Ordering::Relaxed);
        emit_track_changed(app, state);
        return Ok(false);
    };

    match SymphoniaDecoder::open(Path::new(&track.path)) {
        Ok(active) => {
            source_rate.store(active.sample_rate() as u64, Ordering::Relaxed);
            let duration = if track.duration_ms.unwrap_or(0) > 0 {
                track.duration_ms.unwrap_or(0) as u64
            } else {
                active.duration_ms()
            };
            state.duration_ms.store(duration, Ordering::Relaxed);
            *state.current.lock() = Some(track);
            *state.status.lock() = PlayerStatus::Playing;
            *decoder = Some(active);
            emit_track_changed(app, state);
            Ok(true)
        }
        Err(err) => {
            let _ = app.emit(PLAYER_ERROR, err.to_string());
            *decoder = None;
            *state.status.lock() = PlayerStatus::Stopped;
            Ok(false)
        }
    }
}

fn emit_track_changed(app: &AppHandle, state: &SharedPlayerState) {
    let queue = state.queue.lock();
    let _ = app.emit(
        PLAYER_TRACK_CHANGED,
        TrackChangedEvent {
            track: state.current.lock().clone(),
            queue_index: queue.index(),
        },
    );
}

fn emit_queue_changed(app: &AppHandle, state: &SharedPlayerState) {
    let snapshot_queue = state.queue.lock().items().to_vec();
    let _ = app.emit(PLAYER_QUEUE_CHANGED, snapshot_queue);
}
