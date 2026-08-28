use crate::audio::decoder::{convert_audio, SymphoniaDecoder};
use crate::audio::output::{OutputDevice, SharedBuffer};
use crate::audio::queue::PlayQueue;
use crate::audio::session::{self, PlaybackSession};
use crate::audio::types::{
    PlayerSnapshot, PlayerStatus, PositionEvent, QueueTrack, RepeatMode, TrackChangedEvent,
};
use crate::error::AppError;
use crate::events::{
    PLAYER_ERROR, PLAYER_POSITION, PLAYER_QUEUE_CHANGED, PLAYER_SPECTRUM, PLAYER_TRACK_CHANGED,
};
use crate::settings::PlaybackSettings;
use crossbeam_channel::{unbounded, Receiver, Sender};
use parking_lot::Mutex;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU64, AtomicU8, Ordering};
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
    /// 0 = off, 1 = track, 2 = album
    replay_gain_mode: AtomicU8,
    crossfade_ms: AtomicU64,
}

pub struct PlayerEngine {
    commands: Sender<PlayerCommand>,
    state: Arc<SharedPlayerState>,
    buffer: Arc<SharedBuffer>,
}

impl PlayerEngine {
    pub fn start(
        app: AppHandle,
        initial_volume: f32,
        data_dir: PathBuf,
        restore_queue: bool,
    ) -> Result<Self, AppError> {
        let (tx, rx) = unbounded();
        let buffer = SharedBuffer::new();
        buffer.volume.store(
            f32::to_bits(initial_volume.clamp(0.0, 1.0)),
            Ordering::Relaxed,
        );
        let state = Arc::new(SharedPlayerState {
            status: Mutex::new(PlayerStatus::Stopped),
            current: Mutex::new(None),
            queue: Mutex::new(PlayQueue::default()),
            position_ms: AtomicU64::new(0),
            duration_ms: AtomicU64::new(0),
            volume: Mutex::new(initial_volume.clamp(0.0, 1.0)),
            muted: AtomicBool::new(false),
            replay_gain_mode: AtomicU8::new(0),
            crossfade_ms: AtomicU64::new(0),
        });

        let restore = if restore_queue {
            session::load_sanitized(&data_dir)
        } else {
            None
        };
        if let Some(ref session) = restore {
            apply_session_to_shared_state(&state, session);
        }

        let worker_state = Arc::clone(&state);
        let worker_buffer = Arc::clone(&buffer);
        thread::Builder::new()
            .name("atrium-audio".into())
            .spawn(move || {
                if let Err(err) = run_player_worker(
                    app,
                    worker_state,
                    worker_buffer,
                    rx,
                    initial_volume,
                    data_dir,
                    restore,
                ) {
                    eprintln!("Audio worker stopped: {err}");
                }
            })
            .map_err(|e| AppError::Message(format!("Failed to start audio thread: {e}")))?;

        Ok(Self {
            commands: tx,
            state,
            buffer,
        })
    }

    pub fn apply_playback_settings(&self, settings: &PlaybackSettings) {
        self.buffer.dsp.set_preamp_db(settings.preamp_db as f32);
        let mut gains = [0.0_f32; crate::audio::dsp::EQ_BAND_COUNT];
        for (i, g) in settings.eq_bands.iter().take(gains.len()).enumerate() {
            gains[i] = (*g as f32).clamp(-12.0, 12.0);
        }
        // Legacy fallback: old 3-band settings → approximate 10-band curve
        if settings.eq_bands.iter().all(|g| *g == 0.0)
            && (settings.eq_bass_db != 0.0
                || settings.eq_mid_db != 0.0
                || settings.eq_treble_db != 0.0)
        {
            let bass = settings.eq_bass_db as f32;
            let mid = settings.eq_mid_db as f32;
            let treble = settings.eq_treble_db as f32;
            gains = [
                bass,
                bass * 0.85,
                bass * 0.45 + mid * 0.2,
                mid * 0.7,
                mid,
                mid * 0.7,
                mid * 0.35 + treble * 0.35,
                treble * 0.7,
                treble,
                treble * 0.85,
            ];
        }
        let sr = self.buffer.sample_rate.load(Ordering::Relaxed) as f32;
        self.buffer
            .dsp
            .set_eq_bands(settings.eq_enabled, &gains, settings.eq_q as f32, sr);
        let mode = match settings.replay_gain_mode.as_str() {
            "track" => 1,
            "album" => 2,
            _ => 0,
        };
        self.state.replay_gain_mode.store(mode, Ordering::Relaxed);
        let crossfade_ms = if settings.crossfade_enabled {
            u64::from(settings.crossfade_seconds) * 1000
        } else {
            0
        };
        self.state
            .crossfade_ms
            .store(crossfade_ms, Ordering::Relaxed);
        if let Some(track) = self.state.current.lock().clone() {
            apply_track_gain(&self.buffer, &self.state, &track);
        }
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
        // Apply sync so UI snapshot matches the toggle immediately.
        self.state.queue.lock().set_shuffle(enabled);
        self.send(PlayerCommand::SetShuffle(enabled))
    }

    pub fn set_repeat(&self, mode: RepeatMode) -> Result<(), AppError> {
        // Apply synchronously so the snapshot returned to the UI is correct
        // (otherwise the worker lag resets the button and “repeat one” never sticks).
        self.state.queue.lock().set_repeat(mode);
        self.send(PlayerCommand::SetRepeat(mode))
    }

    fn send(&self, command: PlayerCommand) -> Result<(), AppError> {
        self.commands
            .send(command)
            .map_err(|_| AppError::Message("Audio engine is not running".into()))
    }
}

impl Drop for PlayerEngine {
    fn drop(&mut self) {
        let _ = self.commands.send(PlayerCommand::Shutdown);
    }
}

fn run_player_worker(
    app: AppHandle,
    state: Arc<SharedPlayerState>,
    buffer: Arc<SharedBuffer>,
    rx: Receiver<PlayerCommand>,
    initial_volume: f32,
    data_dir: PathBuf,
    restore: Option<PlaybackSession>,
) -> Result<(), AppError> {
    buffer.volume.store(
        f32::to_bits(initial_volume.clamp(0.0, 1.0)),
        Ordering::Relaxed,
    );

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
    let mut last_spectrum = Instant::now();
    let mut decode_origin_ms = 0u64;
    let mut decoded_frames: u64 = 0;
    let source_rate = Arc::new(AtomicU64::new(out_rate as u64));
    let mut persist = SessionPersist::new(data_dir);

    if let Some(session) = restore {
        playing = load_current(
            &app,
            &state,
            &buffer,
            &mut decoder,
            &mut decode_origin_ms,
            &mut decoded_frames,
            &source_rate,
            true,
            false,
            session.position_ms,
        )?;
        persist.save(&state, true);
    }

    loop {
        while let Ok(cmd) = rx.try_recv() {
            match cmd {
                PlayerCommand::Shutdown => {
                    persist.save(&state, true);
                    return Ok(());
                }
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
                            true,
                            true,
                            0,
                        )?;
                    } else {
                        playing = false;
                        *state.status.lock() = PlayerStatus::Stopped;
                    }
                    persist.save(&state, true);
                }
                PlayerCommand::AddEnd(tracks) => {
                    state.queue.lock().add_end(tracks);
                    emit_queue_changed(&app, &state);
                    persist.save(&state, true);
                }
                PlayerCommand::AddNext(tracks) => {
                    state.queue.lock().add_next(tracks);
                    emit_queue_changed(&app, &state);
                    persist.save(&state, true);
                }
                PlayerCommand::Remove(index) => {
                    state.queue.lock().remove(index);
                    emit_queue_changed(&app, &state);
                    persist.save(&state, true);
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
                    persist.save(&state, true);
                }
                PlayerCommand::Play => {
                    if decoder.is_none() {
                        let resume = state.position_ms.load(Ordering::Relaxed);
                        playing = load_current(
                            &app,
                            &state,
                            &buffer,
                            &mut decoder,
                            &mut decode_origin_ms,
                            &mut decoded_frames,
                            &source_rate,
                            true,
                            true,
                            resume,
                        )?;
                    } else {
                        buffer.paused.store(false, Ordering::Relaxed);
                        playing = true;
                        *state.status.lock() = PlayerStatus::Playing;
                    }
                    persist.save(&state, true);
                }
                PlayerCommand::Pause => {
                    // Gate output immediately — don't drain ~1s of soft buffer.
                    buffer.paused.store(true, Ordering::Relaxed);
                    playing = false;
                    *state.status.lock() = PlayerStatus::Paused;
                    persist.save(&state, true);
                }
                PlayerCommand::Stop => {
                    playing = false;
                    decoder = None;
                    buffer.paused.store(false, Ordering::Relaxed);
                    buffer.clear();
                    *state.status.lock() = PlayerStatus::Stopped;
                    state.position_ms.store(0, Ordering::Relaxed);
                    decode_origin_ms = 0;
                    decoded_frames = 0;
                    persist.save(&state, true);
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
                            true,
                            true,
                            0,
                        )?;
                    } else {
                        playing = false;
                        decoder = None;
                        buffer.clear();
                        *state.status.lock() = PlayerStatus::Stopped;
                    }
                    persist.save(&state, true);
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
                            true,
                            true,
                            0,
                        )?;
                    }
                    persist.save(&state, true);
                }
                PlayerCommand::Seek(position_ms) => {
                    if let Some(active) = decoder.as_mut() {
                        active.seek_ms(position_ms)?;
                        buffer.clear();
                        // Keep pause gate consistent with play state.
                        buffer.paused.store(!playing, Ordering::Relaxed);
                        decode_origin_ms = position_ms;
                        decoded_frames = 0;
                        state.position_ms.store(position_ms, Ordering::Relaxed);
                    }
                    persist.save(&state, true);
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
                    let mut queue = state.queue.lock();
                    // May already be applied synchronously for an accurate snapshot.
                    if queue.shuffle() != enabled {
                        queue.set_shuffle(enabled);
                    }
                    drop(queue);
                    emit_queue_changed(&app, &state);
                    persist.save(&state, true);
                }
                PlayerCommand::SetRepeat(mode) => {
                    let mut queue = state.queue.lock();
                    if queue.repeat() != mode {
                        queue.set_repeat(mode);
                    }
                    drop(queue);
                    emit_queue_changed(&app, &state);
                    persist.save(&state, true);
                }
            }
        }

        if playing {
            if output.is_none() {
                playing = false;
                *state.status.lock() = PlayerStatus::Stopped;
                let _ = app.emit(PLAYER_ERROR, "Audio device unavailable".to_string());
            } else if buffer.len() < (out_rate as usize * out_channels * 80) / 1000 {
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
                            // Track finished — advance (optional short crossfade).
                            let next = state.queue.lock().next_index(false);
                            if next.is_some() {
                                let fade_ms = state.crossfade_ms.load(Ordering::Relaxed);
                                let clear = fade_ms == 0;
                                if fade_ms > 0 {
                                    let samples = ((out_rate as u64).saturating_mul(fade_ms) / 1000
                                        * out_channels as u64)
                                        .min(u32::MAX as u64)
                                        as u32;
                                    buffer.dsp.begin_fade_out(samples.max(1));
                                }
                                playing = load_current(
                                    &app,
                                    &state,
                                    &buffer,
                                    &mut decoder,
                                    &mut decode_origin_ms,
                                    &mut decoded_frames,
                                    &source_rate,
                                    clear,
                                    true,
                                    0,
                                )?;
                                persist.save(&state, true);
                                if fade_ms > 0 && playing {
                                    let samples = ((out_rate as u64).saturating_mul(fade_ms) / 1000
                                        * out_channels as u64)
                                        .min(u32::MAX as u64)
                                        as u32;
                                    buffer.dsp.begin_fade_in(samples.max(1));
                                }
                            } else {
                                playing = false;
                                decoder = None;
                                *state.status.lock() = PlayerStatus::Stopped;
                                persist.save(&state, true);
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
                                    true,
                                    true,
                                    0,
                                )?;
                                persist.save(&state, true);
                            } else {
                                playing = false;
                                decoder = None;
                                *state.status.lock() = PlayerStatus::Stopped;
                                persist.save(&state, true);
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
            persist.save(&state, false);
            let _ = app.emit(
                PLAYER_POSITION,
                PositionEvent {
                    position_ms: state.position_ms.load(Ordering::Relaxed),
                    duration_ms: state.duration_ms.load(Ordering::Relaxed),
                    status: *state.status.lock(),
                },
            );
        }

        // ~55 Hz spectrum for beat-reactive visualizer
        if last_spectrum.elapsed() >= Duration::from_millis(18) {
            last_spectrum = Instant::now();
            let status = *state.status.lock();
            if matches!(status, PlayerStatus::Playing) {
                let frame = buffer.spectrum.compute(out_rate);
                let _ = app.emit(PLAYER_SPECTRUM, frame);
            }
            // Paused: do not emit — frontend freezes the last frame.
            // Stopped: emit once-ish decaying silence so bars clear.
            else if matches!(status, PlayerStatus::Stopped) {
                let frame = buffer.spectrum.compute(out_rate);
                let _ = app.emit(PLAYER_SPECTRUM, frame);
            }
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
    clear_buffer: bool,
    autoplay: bool,
    resume_ms: u64,
) -> Result<bool, AppError> {
    if clear_buffer {
        buffer.clear();
    }
    *decode_origin_ms = resume_ms;
    *decoded_frames = 0;
    state.position_ms.store(resume_ms, Ordering::Relaxed);

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
        Ok(mut active) => {
            source_rate.store(active.sample_rate() as u64, Ordering::Relaxed);
            let duration = if track.duration_ms.unwrap_or(0) > 0 {
                track.duration_ms.unwrap_or(0) as u64
            } else {
                active.duration_ms()
            };
            state.duration_ms.store(duration, Ordering::Relaxed);
            apply_track_gain(buffer, state, &track);
            if resume_ms > 0 {
                match active.seek_ms(resume_ms) {
                    Ok(()) => {}
                    Err(err) => {
                        eprintln!("Restore seek failed: {err}");
                        *decode_origin_ms = 0;
                        state.position_ms.store(0, Ordering::Relaxed);
                    }
                }
            }
            *state.current.lock() = Some(track);
            if autoplay {
                *state.status.lock() = PlayerStatus::Playing;
                buffer.paused.store(false, Ordering::Relaxed);
            } else {
                *state.status.lock() = PlayerStatus::Paused;
                buffer.paused.store(true, Ordering::Relaxed);
            }
            *decoder = Some(active);
            emit_track_changed(app, state);
            Ok(autoplay)
        }
        Err(err) => {
            let _ = app.emit(PLAYER_ERROR, err.to_string());
            *decoder = None;
            *state.status.lock() = PlayerStatus::Stopped;
            Ok(false)
        }
    }
}

fn apply_session_to_shared_state(state: &SharedPlayerState, session: &PlaybackSession) {
    {
        let mut queue = state.queue.lock();
        queue.replace(session.queue.clone(), session.queue_index);
        queue.set_shuffle(session.shuffle);
        queue.set_repeat(session.repeat);
    }
    if let Some(track) = session.queue.get(session.queue_index).cloned() {
        let duration = track.duration_ms.unwrap_or(0).max(0) as u64;
        *state.current.lock() = Some(track);
        state
            .position_ms
            .store(session.position_ms, Ordering::Relaxed);
        state.duration_ms.store(duration, Ordering::Relaxed);
        *state.status.lock() = PlayerStatus::Paused;
    }
}

fn session_from_state(state: &SharedPlayerState) -> Option<PlaybackSession> {
    let queue = state.queue.lock();
    let items = queue.items().to_vec();
    if items.is_empty() {
        return None;
    }
    Some(PlaybackSession {
        queue: items,
        queue_index: queue.index().unwrap_or(0),
        position_ms: state.position_ms.load(Ordering::Relaxed),
        shuffle: queue.shuffle(),
        repeat: queue.repeat(),
    })
}

struct SessionPersist {
    data_dir: PathBuf,
    last_write: Instant,
}

impl SessionPersist {
    fn new(data_dir: PathBuf) -> Self {
        Self {
            data_dir,
            last_write: Instant::now() - Duration::from_secs(10),
        }
    }

    fn save(&mut self, state: &SharedPlayerState, force: bool) {
        if !force {
            let status = *state.status.lock();
            if !matches!(status, PlayerStatus::Playing) {
                return;
            }
            if self.last_write.elapsed() < Duration::from_secs(2) {
                return;
            }
        }
        self.last_write = Instant::now();
        session::save(&self.data_dir, session_from_state(state).as_ref());
    }
}

fn apply_track_gain(buffer: &SharedBuffer, state: &SharedPlayerState, track: &QueueTrack) {
    let mode = state.replay_gain_mode.load(Ordering::Relaxed);
    let gain = match mode {
        1 => track.replaygain_track_gain,
        2 => track.replaygain_album_gain.or(track.replaygain_track_gain),
        _ => None,
    };
    buffer.dsp.set_track_gain_db(gain);
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
