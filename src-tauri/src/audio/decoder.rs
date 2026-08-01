use crate::error::AppError;
use std::fs::File;
use std::path::Path;
use symphonia::core::codecs::audio::AudioDecoderOptions;
use symphonia::core::formats::probe::Hint;
use symphonia::core::formats::{FormatOptions, SeekMode, SeekTo, TrackType};
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::units::Time;
use symphonia::default::{get_codecs, get_probe};

pub struct DecodedChunk {
    pub samples: Vec<f32>,
    pub sample_rate: u32,
    pub channels: usize,
}

pub struct SymphoniaDecoder {
    format: Box<dyn symphonia::core::formats::FormatReader>,
    decoder: Box<dyn symphonia::core::codecs::audio::AudioDecoder>,
    track_id: u32,
    sample_rate: u32,
    channels: usize,
    duration_ms: u64,
}

impl SymphoniaDecoder {
    pub fn open(path: &Path) -> Result<Self, AppError> {
        let file = File::open(path).map_err(|e| {
            AppError::Message(format!("Unable to open audio file {}: {e}", path.display()))
        })?;
        let mss = MediaSourceStream::new(Box::new(file), Default::default());

        let mut hint = Hint::new();
        if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
            hint.with_extension(ext);
        }

        let format = get_probe()
            .probe(&hint, mss, FormatOptions::default(), MetadataOptions::default())
            .map_err(|e| AppError::Message(format!("Unsupported or corrupt audio: {e}")))?;

        let track = format
            .default_track(TrackType::Audio)
            .ok_or_else(|| AppError::Message("No audio track found in file".into()))?;

        let track_id = track.id;
        let codec_params = track
            .codec_params
            .as_ref()
            .ok_or_else(|| AppError::Message("Missing codec parameters".into()))?;
        let audio_params = codec_params
            .audio()
            .ok_or_else(|| AppError::Message("Track is not an audio stream".into()))?;

        let sample_rate = audio_params.sample_rate.unwrap_or(44_100);
        let channels = audio_params
            .channels
            .as_ref()
            .map(|c| c.count())
            .unwrap_or(2)
            .max(1);
        let duration_ms = lofty_duration_ms(path);

        let decoder = get_codecs()
            .make_audio_decoder(audio_params, &AudioDecoderOptions::default())
            .map_err(|e| AppError::Message(format!("Unsupported codec: {e}")))?;

        Ok(Self {
            format,
            decoder,
            track_id,
            sample_rate,
            channels,
            duration_ms,
        })
    }

    pub fn sample_rate(&self) -> u32 {
        self.sample_rate
    }

    pub fn channels(&self) -> usize {
        self.channels
    }

    pub fn duration_ms(&self) -> u64 {
        self.duration_ms
    }

    pub fn seek_ms(&mut self, position_ms: u64) -> Result<(), AppError> {
        let seconds = position_ms as f64 / 1000.0;
        let time = Time::try_from_secs_f64(seconds)
            .ok_or_else(|| AppError::Message("Invalid seek position".into()))?;
        self.format
            .seek(
                SeekMode::Coarse,
                SeekTo::Time {
                    time,
                    track_id: Some(self.track_id),
                },
            )
            .map_err(|e| AppError::Message(format!("Seek failed: {e}")))?;
        self.decoder.reset();
        Ok(())
    }

    /// Decode the next chunk of interleaved f32 samples. Returns None at EOF.
    pub fn decode_next(&mut self) -> Result<Option<DecodedChunk>, AppError> {
        loop {
            let packet = match self.format.next_packet() {
                Ok(Some(packet)) => packet,
                Ok(None) => return Ok(None),
                Err(symphonia::core::errors::Error::ResetRequired) => {
                    return Err(AppError::Message(
                        "Audio stream reset required (unsupported chained stream)".into(),
                    ));
                }
                Err(err) => {
                    return Err(AppError::Message(format!("Demux error: {err}")));
                }
            };

            if packet.track_id != self.track_id {
                continue;
            }

            match self.decoder.decode(&packet) {
                Ok(decoded) => {
                    let mut samples = Vec::new();
                    decoded.copy_to_vec_interleaved(&mut samples);
                    if samples.is_empty() {
                        continue;
                    }
                    return Ok(Some(DecodedChunk {
                        samples,
                        sample_rate: self.sample_rate,
                        channels: self.channels,
                    }));
                }
                Err(symphonia::core::errors::Error::DecodeError(_)) => continue,
                Err(symphonia::core::errors::Error::IoError(_)) => continue,
                Err(err) => {
                    return Err(AppError::Message(format!("Decode error: {err}")));
                }
            }
        }
    }
}

/// Convert channel count and sample rate into the device format.
pub fn convert_audio(
    input: &[f32],
    in_channels: usize,
    in_rate: u32,
    out_channels: usize,
    out_rate: u32,
) -> Vec<f32> {
    let planar = to_channel_vecs(input, in_channels);
    let channelized = match (in_channels, out_channels) {
        (1, 2) => vec![planar[0].clone(), planar[0].clone()],
        (2, 1) => {
            let mixed: Vec<f32> = planar[0]
                .iter()
                .zip(planar[1].iter())
                .map(|(l, r)| (l + r) * 0.5)
                .collect();
            vec![mixed]
        }
        _ => {
            let mut channels = Vec::with_capacity(out_channels);
            for i in 0..out_channels {
                if i < planar.len() {
                    channels.push(planar[i].clone());
                } else if !planar.is_empty() {
                    channels.push(planar[0].clone());
                } else {
                    channels.push(Vec::new());
                }
            }
            channels
        }
    };

    let resampled: Vec<Vec<f32>> = channelized
        .into_iter()
        .map(|ch| resample_linear(&ch, in_rate, out_rate))
        .collect();

    interleave(&resampled)
}

fn to_channel_vecs(input: &[f32], channels: usize) -> Vec<Vec<f32>> {
    let channels = channels.max(1);
    let mut out = vec![Vec::with_capacity(input.len() / channels + 1); channels];
    for (i, sample) in input.iter().enumerate() {
        out[i % channels].push(*sample);
    }
    out
}

fn interleave(channels: &[Vec<f32>]) -> Vec<f32> {
    if channels.is_empty() {
        return Vec::new();
    }
    let len = channels.iter().map(|c| c.len()).min().unwrap_or(0);
    let mut out = Vec::with_capacity(len * channels.len());
    for i in 0..len {
        for ch in channels {
            out.push(ch[i]);
        }
    }
    out
}

fn resample_linear(input: &[f32], in_rate: u32, out_rate: u32) -> Vec<f32> {
    if input.is_empty() || in_rate == 0 || out_rate == 0 {
        return Vec::new();
    }
    if in_rate == out_rate {
        return input.to_vec();
    }
    let ratio = out_rate as f64 / in_rate as f64;
    let out_len = ((input.len() as f64) * ratio).round().max(1.0) as usize;
    let mut out = Vec::with_capacity(out_len);
    for i in 0..out_len {
        let src = i as f64 / ratio;
        let idx = src.floor() as usize;
        let frac = (src - idx as f64) as f32;
        let a = input[idx.min(input.len() - 1)];
        let b = input[(idx + 1).min(input.len() - 1)];
        out.push(a + (b - a) * frac);
    }
    out
}

fn lofty_duration_ms(path: &Path) -> u64 {
    use lofty::file::AudioFile;
    use lofty::probe::Probe;

    Probe::open(path)
        .ok()
        .and_then(|probe| probe.read().ok())
        .map(|tagged| tagged.properties().duration().as_millis() as u64)
        .filter(|ms| *ms > 0)
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mono_to_stereo_doubles_samples() {
        let out = convert_audio(&[0.1, 0.2, 0.3], 1, 44_100, 2, 44_100);
        assert_eq!(out, vec![0.1, 0.1, 0.2, 0.2, 0.3, 0.3]);
    }

    #[test]
    fn resample_length_scales_with_rate() {
        let input = vec![0.0_f32; 100];
        let out = resample_linear(&input, 44_100, 22_050);
        assert!(out.len() >= 49 && out.len() <= 51);
    }
}
