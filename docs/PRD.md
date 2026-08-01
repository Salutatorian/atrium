# Product Requirements — Atrium

## Vision

Build an offline-first personal music environment where the user owns the library, layout, appearance, lyrics, listening data, and settings. The product should feel like a private listening room centered on the current song, artwork, backgrounds, lyrics, and deep visual customization.

Inspired by folder-first power-user players such as Tauon Music Box in capability, but with an original softer, more visual, more customizable interface. Do not copy Tauon’s UI or source.

## Non-goals (core)

- No account, subscription, or cloud database for core features
- No Electron
- No HTMLAudioElement as the final playback engine
- No Genius scraping built into the app
- No silent AI model downloads or library-wide transcription
- No copying Monkeytype theme files into the core distribution

## Primary user journeys

1. Drag a single audio file → optional immediate play → non-blocking folder import prompt
2. Drag folders → background scan with progressive results, pause/cancel/resume
3. Browse by songs, albums, artists, folders, playlists, smart playlists, recent, favorites
4. Customize themes without editing code
5. View and edit synchronized lyrics
6. Use the same library experience on Windows, macOS, and Linux

## Success criteria by phase

### Phase 1 (this milestone)

- Installable Tauri shell builds
- Polished empty shell with navigation, workspace, inspector, playback bar
- Settings and themes persist and validate
- No real audio required

### Later phases

See [milestones.md](milestones.md).

## Quality bar

- Repository remains buildable after every phase
- Large libraries remain usable via pagination/virtualization (architecture ready in Phase 1)
- Errors are human-readable with optional technical details
- Accessibility: keyboard navigation, focus rings, reduced motion, screen-reader labels
