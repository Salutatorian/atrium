use crate::error::AppError;
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{Device, SampleFormat, Stream, StreamConfig};
use parking_lot::Mutex;
use std::collections::VecDeque;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::Arc;

/// Shared playback buffer consumed by the real-time callback.
pub struct SharedBuffer {
    samples: Mutex<VecDeque<f32>>,
    pub volume: AtomicU32, // f32 bits
    pub muted: AtomicBool,
}

impl SharedBuffer {
    pub fn new() -> Arc<Self> {
        Arc::new(Self {
            samples: Mutex::new(VecDeque::with_capacity(48_000 * 2 * 2)),
            volume: AtomicU32::new(f32::to_bits(0.8)),
            muted: AtomicBool::new(false),
        })
    }

    pub fn push(&self, data: &[f32]) {
        let mut guard = self.samples.lock();
        const MAX: usize = 48_000 * 2 * 3;
        while guard.len() + data.len() > MAX {
            guard.pop_front();
        }
        guard.extend(data.iter().copied());
    }

    pub fn clear(&self) {
        self.samples.lock().clear();
    }

    pub fn len(&self) -> usize {
        self.samples.lock().len()
    }

    fn pop_into(&self, output: &mut [f32]) {
        let muted = self.muted.load(Ordering::Relaxed);
        let volume = f32::from_bits(self.volume.load(Ordering::Relaxed));
        let mut guard = self.samples.lock();
        for sample in output.iter_mut() {
            let next = guard.pop_front().unwrap_or(0.0);
            *sample = if muted { 0.0 } else { next * volume };
        }
    }
}

pub struct OutputDevice {
    _stream: Stream,
    pub sample_rate: u32,
    pub channels: usize,
    pub buffer: Arc<SharedBuffer>,
}

impl OutputDevice {
    pub fn start(buffer: Arc<SharedBuffer>) -> Result<Self, AppError> {
        let host = cpal::default_host();
        let device = host
            .default_output_device()
            .ok_or_else(|| AppError::Message("No audio output device available".into()))?;
        let supported = pick_config(&device)?;
        let sample_format = supported.sample_format();
        let config: StreamConfig = supported.into();
        let sample_rate = config.sample_rate.0;
        let channels = config.channels as usize;
        let buffer_cb = Arc::clone(&buffer);

        let stream = match sample_format {
            SampleFormat::F32 => build_f32_stream(&device, &config, buffer_cb)?,
            SampleFormat::I16 => build_i16_stream(&device, &config, buffer_cb)?,
            other => {
                return Err(AppError::Message(format!(
                    "Unsupported sample format: {other:?}"
                )));
            }
        };
        stream
            .play()
            .map_err(|e| AppError::Message(format!("Failed to start audio stream: {e}")))?;

        Ok(Self {
            _stream: stream,
            sample_rate,
            channels,
            buffer,
        })
    }
}

fn pick_config(device: &Device) -> Result<cpal::SupportedStreamConfig, AppError> {
    device
        .default_output_config()
        .map_err(|e| AppError::Message(format!("Audio device config error: {e}")))
}

fn build_f32_stream(
    device: &Device,
    config: &StreamConfig,
    buffer: Arc<SharedBuffer>,
) -> Result<Stream, AppError> {
    let err_fn = |err| eprintln!("Audio stream error: {err}");
    device
        .build_output_stream(
            config,
            move |data: &mut [f32], _| {
                buffer.pop_into(data);
            },
            err_fn,
            None,
        )
        .map_err(|e| AppError::Message(format!("Failed to build audio stream: {e}")))
}

fn build_i16_stream(
    device: &Device,
    config: &StreamConfig,
    buffer: Arc<SharedBuffer>,
) -> Result<Stream, AppError> {
    let err_fn = |err| eprintln!("Audio stream error: {err}");
    device
        .build_output_stream(
            config,
            move |data: &mut [i16], _| {
                let mut temporary = vec![0.0_f32; data.len()];
                buffer.pop_into(&mut temporary);
                for (out, sample) in data.iter_mut().zip(temporary.into_iter()) {
                    let clamped = sample.clamp(-1.0, 1.0);
                    *out = (clamped * i16::MAX as f32) as i16;
                }
            },
            err_fn,
            None,
        )
        .map_err(|e| AppError::Message(format!("Failed to build audio stream: {e}")))
}
