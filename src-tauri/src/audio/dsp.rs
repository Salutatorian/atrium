//! 10-band peaking EQ (RBJ cookbook biquads) + shared DSP controls.

use parking_lot::Mutex;
use std::f32::consts::PI;
use std::sync::atomic::{AtomicBool, AtomicU32, AtomicU64, Ordering};

pub const EQ_BAND_COUNT: usize = 10;

/// ISO-ish graphic EQ centers (Hz).
pub const EQ_FREQUENCIES_HZ: [f32; EQ_BAND_COUNT] =
    [32.0, 64.0, 125.0, 250.0, 500.0, 1000.0, 2000.0, 4000.0, 8000.0, 16000.0];

/// Playback DSP parameters shared with the audio callback.
pub struct DspControls {
    pub preamp_linear: AtomicU32,
    pub track_gain_linear: AtomicU32,
    pub eq_enabled: AtomicBool,
    pub fade_remaining: AtomicU32,
    pub fade_total: AtomicU32,
    pub fading_out: AtomicBool,
    eq_version: AtomicU64,
    /// Band gains in dB + Q + sample rate for the EQ runtime.
    eq: Mutex<EqParams>,
}

#[derive(Debug, Clone)]
struct EqParams {
    gains_db: [f32; EQ_BAND_COUNT],
    q: f32,
    sample_rate: f32,
    version: u64,
}

impl Default for EqParams {
    fn default() -> Self {
        Self {
            gains_db: [0.0; EQ_BAND_COUNT],
            q: 1.0,
            sample_rate: 48_000.0,
            version: 1,
        }
    }
}

impl DspControls {
    pub fn new() -> Self {
        Self {
            preamp_linear: AtomicU32::new(f32::to_bits(1.0)),
            track_gain_linear: AtomicU32::new(f32::to_bits(1.0)),
            eq_enabled: AtomicBool::new(false),
            fade_remaining: AtomicU32::new(0),
            fade_total: AtomicU32::new(0),
            fading_out: AtomicBool::new(false),
            eq_version: AtomicU64::new(1),
            eq: Mutex::new(EqParams::default()),
        }
    }

    pub fn set_preamp_db(&self, db: f32) {
        self.preamp_linear
            .store(f32::to_bits(db_to_linear(db)), Ordering::Relaxed);
    }

    pub fn set_track_gain_db(&self, db: Option<f32>) {
        let linear = db.map(db_to_linear).unwrap_or(1.0);
        self.track_gain_linear
            .store(f32::to_bits(linear), Ordering::Relaxed);
    }

    pub fn set_eq_bands(&self, enabled: bool, gains_db: &[f32], q: f32, sample_rate: f32) {
        self.eq_enabled.store(enabled, Ordering::Relaxed);
        let mut params = self.eq.lock();
        let mut changed = false;
        for (i, gain) in gains_db.iter().take(EQ_BAND_COUNT).enumerate() {
            let g = gain.clamp(-12.0, 12.0);
            if (params.gains_db[i] - g).abs() > 0.001 {
                params.gains_db[i] = g;
                changed = true;
            }
        }
        let q = q.clamp(0.3, 4.0);
        if (params.q - q).abs() > 0.001 {
            params.q = q;
            changed = true;
        }
        let sr = sample_rate.max(8_000.0);
        if (params.sample_rate - sr).abs() > 0.5 {
            params.sample_rate = sr;
            changed = true;
        }
        if changed {
            params.version = params.version.wrapping_add(1);
            self.eq_version.store(params.version, Ordering::Relaxed);
        }
    }

    pub fn begin_fade_out(&self, samples: u32) {
        let samples = samples.max(1);
        self.fade_total.store(samples, Ordering::Relaxed);
        self.fade_remaining.store(samples, Ordering::Relaxed);
        self.fading_out.store(true, Ordering::Relaxed);
    }

    pub fn begin_fade_in(&self, samples: u32) {
        let samples = samples.max(1);
        self.fade_total.store(samples, Ordering::Relaxed);
        self.fade_remaining.store(samples, Ordering::Relaxed);
        self.fading_out.store(false, Ordering::Relaxed);
    }

    fn snapshot_eq(&self) -> EqParams {
        self.eq.lock().clone()
    }
}

#[derive(Debug, Clone, Copy)]
struct Biquad {
    b0: f32,
    b1: f32,
    b2: f32,
    a1: f32,
    a2: f32,
    z1: f32,
    z2: f32,
}

impl Biquad {
    fn identity() -> Self {
        Self {
            b0: 1.0,
            b1: 0.0,
            b2: 0.0,
            a1: 0.0,
            a2: 0.0,
            z1: 0.0,
            z2: 0.0,
        }
    }

    /// Peaking EQ (Audio EQ Cookbook).
    fn peaking(freq_hz: f32, q: f32, gain_db: f32, sample_rate: f32) -> Self {
        if gain_db.abs() < 0.01 {
            return Self::identity();
        }
        let sr = sample_rate.max(8_000.0);
        let f0 = freq_hz.clamp(20.0, sr * 0.45);
        let a = 10f32.powf(gain_db / 40.0);
        let w0 = 2.0 * PI * f0 / sr;
        let (sin, cos) = w0.sin_cos();
        let alpha = sin / (2.0 * q.max(0.3));

        let b0 = 1.0 + alpha * a;
        let b1 = -2.0 * cos;
        let b2 = 1.0 - alpha * a;
        let a0 = 1.0 + alpha / a;
        let a1 = -2.0 * cos;
        let a2 = 1.0 - alpha / a;

        Self {
            b0: b0 / a0,
            b1: b1 / a0,
            b2: b2 / a0,
            a1: a1 / a0,
            a2: a2 / a0,
            z1: 0.0,
            z2: 0.0,
        }
    }

    #[inline]
    fn process(&mut self, x: f32) -> f32 {
        let y = self.b0 * x + self.z1;
        self.z1 = self.b1 * x - self.a1 * y + self.z2;
        self.z2 = self.b2 * x - self.a2 * y;
        y
    }
}

pub struct EqRuntime {
    bands: [Biquad; EQ_BAND_COUNT],
    applied_version: u64,
}

impl Default for EqRuntime {
    fn default() -> Self {
        Self {
            bands: [Biquad::identity(); EQ_BAND_COUNT],
            applied_version: 0,
        }
    }
}

impl EqRuntime {
    fn rebuild(&mut self, params: &EqParams) {
        for i in 0..EQ_BAND_COUNT {
            self.bands[i] = Biquad::peaking(
                EQ_FREQUENCIES_HZ[i],
                params.q,
                params.gains_db[i],
                params.sample_rate,
            );
        }
        self.applied_version = params.version;
    }

    pub fn process(&mut self, sample: f32, controls: &DspControls) -> f32 {
        let preamp = f32::from_bits(controls.preamp_linear.load(Ordering::Relaxed));
        let track = f32::from_bits(controls.track_gain_linear.load(Ordering::Relaxed));
        let mut out = sample * preamp * track;

        if controls.eq_enabled.load(Ordering::Relaxed) {
            let version = controls.eq_version.load(Ordering::Relaxed);
            if version != self.applied_version {
                let params = controls.snapshot_eq();
                self.rebuild(&params);
            }
            for band in &mut self.bands {
                out = band.process(out);
            }
        }

        let remaining = controls.fade_remaining.load(Ordering::Relaxed);
        if remaining > 0 {
            let total = controls.fade_total.load(Ordering::Relaxed).max(1);
            let t = remaining as f32 / total as f32;
            let fade = if controls.fading_out.load(Ordering::Relaxed) {
                t
            } else {
                1.0 - t
            };
            out *= fade.clamp(0.0, 1.0);
            controls
                .fade_remaining
                .store(remaining.saturating_sub(1), Ordering::Relaxed);
        }

        out.clamp(-1.0, 1.0)
    }
}

pub fn db_to_linear(db: f32) -> f32 {
    10f32.powf(db / 20.0)
}

pub fn parse_replaygain_db(raw: &str) -> Option<f32> {
    let cleaned = raw
        .trim()
        .trim_end_matches("dB")
        .trim_end_matches("db")
        .trim();
    cleaned.parse::<f32>().ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn converts_db() {
        assert!((db_to_linear(0.0) - 1.0).abs() < 0.001);
        assert!(db_to_linear(-6.0) < 0.6);
    }

    #[test]
    fn parses_replaygain() {
        assert_eq!(parse_replaygain_db("-6.50 dB"), Some(-6.5));
    }

    #[test]
    fn flat_eq_is_near_unity() {
        let controls = DspControls::new();
        controls.set_eq_bands(true, &[0.0; EQ_BAND_COUNT], 1.0, 48_000.0);
        let mut eq = EqRuntime::default();
        let y = eq.process(0.25, &controls);
        assert!((y - 0.25).abs() < 0.01);
    }

    #[test]
    fn boosted_band_changes_output() {
        let controls = DspControls::new();
        let mut gains = [0.0; EQ_BAND_COUNT];
        gains[5] = 9.0; // 1 kHz boost
        controls.set_eq_bands(true, &gains, 1.2, 48_000.0);
        let mut eq = EqRuntime::default();
        // Impulse then settle — just ensure processing stays finite
        let mut y = 0.0;
        for i in 0..64 {
            let x = if i == 0 { 1.0 } else { 0.0 };
            y = eq.process(x, &controls);
            assert!(y.is_finite());
        }
        assert!(y.is_finite());
    }
}
