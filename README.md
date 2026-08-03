<p align="center">
  <img src="docs/brand/atrium-logo-sm.png" alt="Atrium" width="56" />
</p>

<h1 align="center">Atrium</h1>

<p align="center">
  Offline-first, highly customizable desktop music player for Windows, macOS, and Linux.
</p>

Atrium is a private listening room for your local music library — not a streaming client, not a cloud account product, and not a boxed desktop database. You own the files, layout, appearance, lyrics, listening data, and settings.

<p align="center">
  <img src="docs/screenshots/home.png" alt="" width="720" />
</p>
<p align="center">
  <img src="docs/screenshots/liked.png" alt="" width="720" />
</p>
<p align="center">
  <img src="docs/screenshots/stats.png" alt="" width="720" />
</p>
<p align="center">
  <img src="docs/screenshots/lyrics.png" alt="" width="720" />
</p>

## Current status

**Phase 0–7** are implemented (MVP milestone complete).

Highlights:

- Drag/drop and folder import with background scanning
- Library browse (songs / albums / artists / folders) + FTS search
- Symphonia + cpal playback with queue and transport
- Theme studio: presets, atmosphere controls, import/export
- Immersive and mini player modes, density + player bar styles
- Lyrics: embedded / sidecar LRC+TXT, synced display, editor, LRCLIB (opt-in)
- Playback DSP: ReplayGain, preamp, 3-band EQ, short crossfade
- Manual + smart playlists, basic tag editor
- Favorites, recently played, listening history
- Packaging notes + accessibility landmarks (see `docs/packaging.md`)

See `docs/milestones.md` for the full checklist.

## Development

Prerequisites: Node.js 20+, Rust stable, platform WebView2 / WebKitGTK as required by Tauri.

```bash
npm install
npm run tauri dev
```

Frontend-only (no native shell):

```bash
npm run dev
```

## Testing

```bash
npm test
npm run typecheck
npm run lint
cargo test --manifest-path src-tauri/Cargo.toml
```

## Documentation

| Document | Path |
| --- | --- |
| Product requirements | [docs/PRD.md](docs/PRD.md) |
| Architecture | [docs/architecture.md](docs/architecture.md) |
| Database schema | [docs/database-schema.md](docs/database-schema.md) |
| Audio engine | [docs/audio-engine.md](docs/audio-engine.md) |
| Theme schema | [docs/theme-schema.md](docs/theme-schema.md) |
| Lyrics providers | [docs/lyrics-providers.md](docs/lyrics-providers.md) |
| Security model | [docs/security-model.md](docs/security-model.md) |
| Platform support | [docs/platform-support.md](docs/platform-support.md) |
| Dependency inventory | [docs/dependency-inventory.md](docs/dependency-inventory.md) |
| Milestones | [docs/milestones.md](docs/milestones.md) |
| Directory structure | [docs/directory-structure.md](docs/directory-structure.md) |

## Renaming the app

The temporary name is centralized in:

- `src/app/brand.ts`
- `src-tauri/src/app/brand.rs`
- `package.json` / `src-tauri/Cargo.toml` / `src-tauri/tauri.conf.json`

## License

Source license for the application itself is TBD pending final naming and distribution review. Third-party licenses are listed in `docs/dependency-inventory.md`. Do not copy GPL theme packs (e.g. Monkeytype themes) into the core distribution without a separate licensing review.
