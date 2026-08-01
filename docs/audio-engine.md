# Audio engine design — Atrium

## Goal

Independent Rust audio module with a stable internal interface. The frontend never owns decoding or device output. `HTMLAudioElement` is not the playback engine.

## Selected stack (Phase 3)

| Component | Choice | Role | License notes |
| --- | --- | --- | --- |
| Decoder | Symphonia 0.6 | Demux/decode common codecs | MPL-2.0 |
| Output | cpal 0.15 | Device I/O callback | Apache-2.0 OR MIT |
| Metadata | Lofty | Tag read/write (library) | MIT / Apache-2.0 |
| Fallback | FFmpeg / libmpv | Optional later only | Packaging + license review |

**Why cpal over miniaudio:** clearer OSS licensing and crate maintenance for desktop shipping; miniaudio dual-license review deferred. Shared `VecDeque` PCM buffer feeds the cpal callback (kept allocation-light; not a full lock-free ring yet).

## Traits

```rust
trait AudioDecoder { /* decode packets into PCM frames */ }
trait AudioOutput { /* device enumeration, stream callback */ }
trait PlaybackController { /* play/pause/seek/volume API */ }
trait QueueProvider { /* next/previous/shuffle/repeat */ }
trait DspProcessor { /* EQ, balance, fades — real-time safe */ }
trait ReplayGainProvider { /* gain values for current track */ }
```

Trait stubs live in `src-tauri/src/audio/traits.rs`. The live path uses `SymphoniaDecoder`, `OutputDevice`, `PlayQueue`, and `PlayerEngine`.

## Real-time callback rules

The audio callback must not:

- Allocate large objects
- Access SQLite
- Make network requests
- Wait on frontend events
- Scan directories
- Hold long mutex locks
- Decode artwork
- Parse metadata

Decode on a worker thread; push PCM into the shared buffer consumed by the output callback.

## Control surface

Play, pause, resume, stop, previous, next, seek, queue replace / add-next / add-end, shuffle, repeat modes, volume, mute, position events, track transitions, errors.

DSP (Phase 6): ReplayGain (track/album), preamp, 3-band EQ, short crossfade on advance. Still later: sample-accurate gapless splice, balance, mono.

## Events (frontend)

- `player://position`
- `player://track-changed`
- `player://queue-changed`
- `player://error`

## Phase 3 status

- Symphonia decode + cpal output
- Queue with shuffle / repeat
- Auto-advance on track end (gapless foundation)
- Tauri commands + React player bar / queue inspector
