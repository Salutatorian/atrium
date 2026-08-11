<p align="center">
  <img src="docs/brand/atrium-logo-sm.png" alt="Atrium" width="56" />
</p>

# Atrium

A private listening room for **your** local music.

<p align="center">
  <a href="https://github.com/Salutatorian/atrium/releases/latest"><img src="https://img.shields.io/github/v/release/Salutatorian/atrium?label=Download&color=0e7aef" alt="Download" /></a>
  <img src="https://img.shields.io/badge/Windows%20%7C%20macOS%20%7C%20Linux-native-111111" alt="Windows | macOS | Linux native" />
  <img src="https://img.shields.io/badge/Privacy-100%25%20offline-22c55e" alt="Privacy 100% offline" />
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache--2.0-0e7aef" alt="License Apache-2.0" /></a>
</p>

**[Get the latest release](https://github.com/Salutatorian/atrium/releases/latest)** · macOS first open: right-click → **Open**

## What it does

### Library & playback

Add folders or drop files. Browse songs, albums, artists, and playlists. Search, queue, shuffle, and play offline.

<p align="center">
  <img src="docs/screenshots/home.png" alt="Atrium home" width="720" />
</p>

### Liked & listening stats

Favorite tracks, see recently played, and check listening time and tops.

<p align="center">
  <img src="docs/screenshots/liked.png" alt="Atrium liked" width="720" />
</p>

<p align="center">
  <img src="docs/screenshots/stats.png" alt="Atrium stats" width="720" />
</p>

### Lyrics & themes

Synced lyrics when you have them (local files, optional online lookup). Themes and a quiet immersive player when you want to focus.

<p align="center">
  <img src="docs/screenshots/lyrics.png" alt="Atrium lyrics" width="720" />
</p>

## For developers

```bash
npm install
npm run tauri dev
```

Needs Node.js 20+, Rust stable, and the usual Tauri WebView deps for your OS.  
Build: `npm run tauri build` → installers under `src-tauri/target/release/bundle/`.

Copyright © 2026 [Salutatorian](https://github.com/Salutatorian). Third-party notices: [`docs/dependency-inventory.md`](docs/dependency-inventory.md).  
More design notes live under [`docs/`](docs/) if you need them.
