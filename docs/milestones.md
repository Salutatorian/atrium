# Milestone checklist — Atrium

## Phase 0 — Documentation

- [x] README
- [x] PRD
- [x] Architecture
- [x] Database schema
- [x] Audio engine design
- [x] Theme schema
- [x] Lyrics provider design
- [x] Security model
- [x] Platform matrix
- [x] Dependency inventory
- [x] Directory structure
- [x] Milestone checklist

## Phase 1 — Working skeleton

- [x] Tauri + React + TS scaffold
- [x] App rename / brand centralization (`Atrium`)
- [x] SQLite connection + initial migration
- [x] Typed settings persistence
- [x] Theme token system + Mist (light) / Dusk (dark) themes
- [x] Shell: nav, workspace, inspector, player bar
- [x] Responsive resizing, focus, reduced motion
- [x] Tests for settings/theme validation
- [x] Lint / typecheck / Rust check / tests green

## Phase 2 — Import and library

- [x] File/folder drop
- [x] Background scanner with pause/cancel/resume
- [x] Metadata + artwork extraction (Lofty + cache)
- [x] Progressive scan progress UI (task center)
- [x] Songs / Albums / Artists / Folders pages
- [x] Virtualized track list
- [x] Global FTS search
- [x] Rescan changed files

## Phase 3 — Playback

- [x] Audio engine (Symphonia + cpal output)
- [x] Queue + transport controls
- [x] Seeking + position events
- [x] Media keys / OS integration basics (window-focused Space + media keys)
- [x] Gapless foundation (auto-advance + queue unit tests)

## Phase 4 — Personalization

- [ ] Theme browser/editor
- [ ] Custom backgrounds
- [ ] Theme import/export
- [ ] Immersive + mini modes
- [ ] Layout density polish

## Phase 5 — Lyrics

- [ ] Embedded / LRC / TXT / LRCLIB
- [ ] Synced display + editor
- [ ] Offsets + caching + attribution

## Phase 6 — Advanced

- [ ] EQ, ReplayGain, crossfade
- [ ] Smart playlists, tag editor
- [ ] Optional AI lyric drafts, network libraries
