use crate::error::AppError;

pub trait AudioDecoder: Send {
    fn open(&mut self, path: &str) -> Result<(), AppError>;
}

pub trait AudioOutput: Send {
    fn start(&mut self) -> Result<(), AppError>;
    fn stop(&mut self) -> Result<(), AppError>;
}

pub trait PlaybackController: Send {
    fn play(&mut self) -> Result<(), AppError>;
    fn pause(&mut self) -> Result<(), AppError>;
    fn stop(&mut self) -> Result<(), AppError>;
    fn seek(&mut self, position_ms: u64) -> Result<(), AppError>;
    fn set_volume(&mut self, volume: f32) -> Result<(), AppError>;
}

pub trait QueueProvider: Send {
    fn current(&self) -> Option<String>;
    fn next(&mut self) -> Option<String>;
    fn previous(&mut self) -> Option<String>;
}

pub trait DspProcessor: Send {
    fn process(&mut self, frames: &mut [f32]);
}

pub trait ReplayGainProvider: Send {
    fn track_gain_db(&self) -> Option<f32>;
    fn album_gain_db(&self) -> Option<f32>;
}
