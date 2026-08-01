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

- [x] Theme browser/editor (atmosphere controls + custom theme save)
- [x] Custom backgrounds (gradient/solid/album/user-image modes)
- [x] Theme import/export (`.atrium-theme.json`)
- [x] Immersive + mini modes
- [x] Layout density polish

## Phase 5 — Lyrics

- [x] Embedded / LRC / TXT / LRCLIB (privacy-gated)
- [x] Synced display + editor
- [x] Offsets + caching + attribution

## Phase 6 — Advanced

- [x] EQ, ReplayGain, crossfade
- [x] Smart playlists, tag editor
- [x] Optional AI lyric drafts, network libraries (stubs / privacy notes)

## Phase 7 — Polish

- [x] Listening history / favorites depth
- [x] Packaging, updater notes, accessibility pass

## Roadmap complete (v0.1)

Phases 0–7 cover the documented MVP. Further work is iterative UX/quality (player polish, theme catalog licensing, deeper OS integrations).
