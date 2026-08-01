use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};

/// Playback DSP parameters shared with the audio callback (atomics only).
pub struct DspControls {
    pub preamp_linear: AtomicU32,
    pub track_gain_linear: AtomicU32,
    pub eq_enabled: AtomicBool,
    pub bass_linear: AtomicU32,
    pub mid_linear: AtomicU32,
    pub treble_linear: AtomicU32,
    pub fade_remaining: AtomicU32,
    pub fade_total: AtomicU32,
    pub fading_out: AtomicBool,
}

impl DspControls {
    pub fn new() -> Self {
        Self {
            preamp_linear: AtomicU32::new(f32::to_bits(1.0)),
            track_gain_linear: AtomicU32::new(f32::to_bits(1.0)),
            eq_enabled: AtomicBool::new(false),
            bass_linear: AtomicU32::new(f32::to_bits(1.0)),
            mid_linear: AtomicU32::new(f32::to_bits(1.0)),
            treble_linear: AtomicU32::new(f32::to_bits(1.0)),
            fade_remaining: AtomicU32::new(0),
            fade_total: AtomicU32::new(0),
            fading_out: AtomicBool::new(false),
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

    pub fn set_eq(&self, enabled: bool, bass_db: f32, mid_db: f32, treble_db: f32) {
        self.eq_enabled.store(enabled, Ordering::Relaxed);
        self.bass_linear
            .store(f32::to_bits(db_to_linear(bass_db)), Ordering::Relaxed);
        self.mid_linear
            .store(f32::to_bits(db_to_linear(mid_db)), Ordering::Relaxed);
        self.treble_linear
            .store(f32::to_bits(db_to_linear(treble_db)), Ordering::Relaxed);
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
}

#[derive(Debug, Default)]
pub struct EqRuntime {
    lowpass: f32,
}

impl EqRuntime {
    pub fn process(&mut self, sample: f32, controls: &DspControls) -> f32 {
        let preamp = f32::from_bits(controls.preamp_linear.load(Ordering::Relaxed));
        let track = f32::from_bits(controls.track_gain_linear.load(Ordering::Relaxed));
        let mut out = sample * preamp * track;

        if controls.eq_enabled.load(Ordering::Relaxed) {
            // One-pole split for a light 3-band tone stack.
            self.lowpass += 0.12 * (out - self.lowpass);
            let bass = self.lowpass;
            let treble = out - self.lowpass;
            let mid = out;
            let bass_g = f32::from_bits(controls.bass_linear.load(Ordering::Relaxed));
            let mid_g = f32::from_bits(controls.mid_linear.load(Ordering::Relaxed));
            let treble_g = f32::from_bits(controls.treble_linear.load(Ordering::Relaxed));
            out = bass * bass_g + mid * mid_g * 0.5 + treble * treble_g;
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
}
