# Architecture — Atrium

## Principles

1. **Local-first.** Core playback and library work offline.
2. **Separated systems.** Playback, indexing, lyrics, themes, and optional AI are independent modules.
3. **Rust owns native work.** Scanning, SQLite, audio, OS integration stay in Rust.
4. **React owns presentation.** UI state, theming, and layout live in the frontend.
5. **Typed IPC.** Commands and events use explicit contracts; no loosely shaped payloads when avoidable.
6. **Never load the full library into React memory.**

## High-level diagram

```
┌─────────────────────────────────────────────┐
│                 React / Vite                 │
│  features: library · player · lyrics · themes│
│  stores (Zustand) · theme CSS variables      │
└──────────────────┬──────────────────────────┘
                   │ typed Tauri commands/events
┌──────────────────▼──────────────────────────┐
│                 Rust / Tauri                 │
│  commands · settings · security · diagnostics│
│  ┌─────────┐ ┌──────────┐ ┌───────────────┐ │
│  │ audio   │ │ library  │ │ lyrics        │ │
│  │ engine  │ │ scanner  │ │ providers     │ │
│  └────┬────┘ └────┬─────┘ └───────┬───────┘ │
│       │           │               │         │
│  ┌────▼───────────▼───────────────▼───────┐ │
│  │              SQLite (WAL)              │ │
│  └────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

## Module boundaries

| System | Owner | Phase 1 state |
| --- | --- | --- |
| Desktop shell | Tauri + React | Implemented |
| Settings | Rust persist + Zod validate | Implemented |
| Theme engine | Frontend tokens + JSON schema | Implemented |
| SQLite | Rust migrations/repositories | Skeleton |
| Library scanner | Rust workers | Interface only |
| Audio engine | Rust traits + stub | Interface only |
| Lyrics | Providers + LRC | Interface only |
| Optional AI | Separate module | Documented only |

## Tradeoffs (Phase 1)

### SQLite access from Rust (selected) vs `tauri-plugin-sql`

- **Selected:** Rust-owned SQLite via `rusqlite`.
- **Rejected:** SQL from the frontend plugin for primary library writes.
- **Why:** Keeps batching, migrations, FTS, and scan transactions on the native side; prevents the UI from becoming a database client.
- **Revisit if:** A future feature needs ad-hoc read-only SQL tooling for power users (still behind Rust commands).

### Zustand (selected) vs Redux / Jotai

- **Selected:** Zustand for small predictable UI state.
- **Rejected:** Redux Toolkit (heavier), Jotai (fine but less explicit for this shell).
- **Why:** Minimal boilerplate for shell layout, theme preview, and inspector state.
- **Revisit if:** Cross-feature orchestration becomes complex enough to need middleware.

### CSS custom properties + Tailwind (selected) vs CSS-in-JS

- **Selected:** Semantic CSS variables driven by theme JSON; Tailwind for utilities.
- **Rejected:** Runtime CSS-in-JS theme engines.
- **Why:** Themes must be importable JSON without executable code; variables map cleanly to tokens.
- **Revisit if:** Per-playlist override complexity needs a more structured runtime composer.

## Event model (future)

- `scan://progress` — throttled
- `player://position` — high frequency, small payload
- `player://track-changed`
- `player://error`
- `library://updated` — coarse invalidation hints for paginated queries

## Performance stance

- No DB work in the audio callback
- Lazy artwork decoding and disk caches (not large blobs in SQLite)
- Virtualized lists and paged queries from Phase 2 onward
- Dev-only instrumentation; no invasive release telemetry
