//! Real-time spectrum tap for the player visualizer.
//! Audio callback only writes mono PCM into a ring; the worker computes bands.

use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::f32::consts::PI;
use std::sync::atomic::{AtomicUsize, Ordering};

pub const BAND_COUNT: usize = 48;
const RING_SIZE: usize = 2048;
const ANALYZE_SIZE: usize = 1024;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpectrumEvent {
    /// Log-spaced band levels in 0..=1
    pub bands: Vec<f32>,
    /// Low-end energy 0..=1 (kick / bass punch)
    pub bass: f32,
    /// Onset / beat pulse 0..=1
    pub beat: f32,
    /// Broadband RMS energy 0..=1
    pub energy: f32,
}

pub struct SpectrumTap {
    ring: Mutex<[f32; RING_SIZE]>,
    write: AtomicUsize,
    channels: AtomicUsize,
    smoothed: Mutex<[f32; BAND_COUNT]>,
    peaks: Mutex<[f32; BAND_COUNT]>,
    energy_slow: Mutex<f32>,
    energy_fast: Mutex<f32>,
}

impl SpectrumTap {
    pub fn new() -> Self {
        Self {
            ring: Mutex::new([0.0; RING_SIZE]),
            write: AtomicUsize::new(0),
            channels: AtomicUsize::new(2),
            smoothed: Mutex::new([0.0; BAND_COUNT]),
            peaks: Mutex::new([0.0; BAND_COUNT]),
            energy_slow: Mutex::new(0.0),
            energy_fast: Mutex::new(0.0),
        }
    }

    pub fn set_channels(&self, channels: usize) {
        self.channels.store(channels.max(1), Ordering::Relaxed);
    }

    /// Called from the real-time output callback. Prefer try_lock to avoid stalls.
    pub fn feed_interleaved(&self, interleaved: &[f32]) {
        if interleaved.is_empty() {
            return;
        }
        let ch = self.channels.load(Ordering::Relaxed).max(1);
        let Some(mut ring) = self.ring.try_lock() else {
            return;
        };
        let mut w = self.write.load(Ordering::Relaxed);
        for frame in interleaved.chunks_exact(ch) {
            let mut sum = 0.0_f32;
            for &sample in frame {
                sum += sample;
            }
            ring[w % RING_SIZE] = sum / ch as f32;
            w = w.wrapping_add(1);
        }
        // Handle remainder if buffer length isn't a multiple of channels.
        let rem = interleaved.len() % ch;
        if rem != 0 {
            let start = interleaved.len() - rem;
            let mut sum = 0.0_f32;
            for &sample in &interleaved[start..] {
                sum += sample;
            }
            ring[w % RING_SIZE] = sum / rem as f32;
            w = w.wrapping_add(1);
        }
        self.write.store(w, Ordering::Relaxed);
    }

    pub fn clear(&self) {
        if let Some(mut ring) = self.ring.try_lock() {
            ring.fill(0.0);
        }
        if let Some(mut s) = self.smoothed.try_lock() {
            s.fill(0.0);
        }
        if let Some(mut p) = self.peaks.try_lock() {
            p.fill(0.0);
        }
        if let Some(mut e) = self.energy_fast.try_lock() {
            *e = 0.0;
        }
        if let Some(mut e) = self.energy_slow.try_lock() {
            *e = 0.0;
        }
    }

    /// Worker-thread analysis (~50–60 Hz). Not real-time-safe (takes locks).
    pub fn compute(&self, sample_rate: u32) -> SpectrumEvent {
        let mut time = [0.0_f32; ANALYZE_SIZE];
        {
            let ring = self.ring.lock();
            let w = self.write.load(Ordering::Relaxed);
            for i in 0..ANALYZE_SIZE {
                let idx = w
                    .wrapping_sub(ANALYZE_SIZE - i)
                    .rem_euclid(RING_SIZE);
                time[i] = ring[idx];
            }
        }

        // Hann window + RMS
        let mut energy_sum = 0.0_f32;
        for (i, sample) in time.iter_mut().enumerate() {
            let w =
                0.5 - 0.5 * (2.0 * PI * i as f32 / (ANALYZE_SIZE as f32 - 1.0)).cos();
            *sample *= w;
            energy_sum += *sample * *sample;
        }
        let rms = (energy_sum / ANALYZE_SIZE as f32).sqrt();
        let energy = (rms * 4.5).clamp(0.0, 1.0);

        let sr = sample_rate.max(8_000) as f32;
        let mut raw = [0.0_f32; BAND_COUNT];
        for band in 0..BAND_COUNT {
            let t = band as f32 / (BAND_COUNT as f32 - 1.0);
            // 40 Hz → ~16 kHz log spacing
            let freq = 40.0 * (16_000.0_f32 / 40.0).powf(t);
            let mag = goertzel(&time, freq, sr);
            // Compress dynamic range so soft beats still move bars
            raw[band] = (mag.sqrt() * 3.2).clamp(0.0, 1.0);
        }

        // Emphasize low bands slightly for kick visibility
        for band in 0..6 {
            raw[band] = (raw[band] * 1.15).clamp(0.0, 1.0);
        }

        let mut smoothed = self.smoothed.lock();
        let mut peaks = self.peaks.lock();
        for i in 0..BAND_COUNT {
            let target = raw[i];
            let prev = smoothed[i];
            // Fast attack, medium release — tracks every beat without jitter
            let coeff = if target > prev { 0.72 } else { 0.28 };
            smoothed[i] = prev + (target - prev) * coeff;

            if smoothed[i] >= peaks[i] {
                peaks[i] = smoothed[i];
            } else {
                peaks[i] = (peaks[i] - 0.018).max(smoothed[i]);
            }
        }

        let bass = {
            let mut b = 0.0_f32;
            for i in 0..8 {
                b += smoothed[i];
            }
            (b / 8.0 * 1.1).clamp(0.0, 1.0)
        };

        let mut fast = self.energy_fast.lock();
        let mut slow = self.energy_slow.lock();
        *fast = *fast * 0.55 + energy * 0.45;
        *slow = *slow * 0.92 + energy * 0.08;
        let beat = ((*fast - *slow) * 4.5).clamp(0.0, 1.0);

        // Fold peak info into the high half of unused headroom via slight boost on beat
        let beat_boost = 1.0 + beat * 0.35;
        let bands: Vec<f32> = smoothed
            .iter()
            .enumerate()
            .map(|(i, &v)| {
                let peak_hint = peaks[i];
                ((v * beat_boost).max(peak_hint * 0.15)).clamp(0.0, 1.0)
            })
            .collect();

        SpectrumEvent {
            bands,
            bass,
            beat,
            energy,
        }
    }
}

/// Single-bin Goertzel magnitude for a target frequency.
fn goertzel(samples: &[f32], freq: f32, sample_rate: f32) -> f32 {
    let n = samples.len() as f32;
    if n < 4.0 || freq <= 0.0 || freq >= sample_rate * 0.5 {
        return 0.0;
    }
    let k = (0.5 + (n * freq / sample_rate)).floor();
    let omega = (2.0 * PI * k) / n;
    let coeff = 2.0 * omega.cos();
    let mut s0;
    let mut s1 = 0.0_f32;
    let mut s2 = 0.0_f32;
    for &x in samples {
        s0 = x + coeff * s1 - s2;
        s2 = s1;
        s1 = s0;
    }
    let real = s1 - s2 * omega.cos();
    let imag = s2 * omega.sin();
    ((real * real + imag * imag) / n).sqrt()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn silence_stays_near_zero() {
        let tap = SpectrumTap::new();
        tap.set_channels(2);
        let frame = tap.compute(48_000);
        assert!(frame.energy < 0.05);
        assert!(frame.bands.iter().all(|&b| b < 0.08));
    }

    #[test]
    fn tone_raises_energy() {
        let tap = SpectrumTap::new();
        tap.set_channels(1);
        let mut mono = Vec::with_capacity(2048);
        for i in 0..2048 {
            let t = i as f32 / 48_000.0;
            mono.push((2.0 * PI * 110.0 * t).sin() * 0.7);
        }
        tap.feed_interleaved(&mono);
        let frame = tap.compute(48_000);
        assert!(frame.energy > 0.1);
        assert!(frame.bass > 0.05 || frame.bands.iter().take(12).any(|&b| b > 0.1));
    }
}
