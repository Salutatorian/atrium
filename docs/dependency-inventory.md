# Dependency and license inventory — Atrium

Verify versions at install time. Licenses summarized from package metadata; re-check before distribution.

## Frontend (runtime)

| Package | Purpose | License (typical) |
| --- | --- | --- |
| react / react-dom | UI | MIT |
| @tauri-apps/api | IPC client | Apache-2.0 OR MIT |
| @tauri-apps/plugin-opener | Open URLs/files safely | Apache-2.0 OR MIT |
| @tauri-apps/plugin-dialog | Native folder picker | Apache-2.0 OR MIT |
| @tanstack/react-virtual | Virtualized lists | MIT |
| zustand | UI state | MIT |
| zod | Settings/theme validation | MIT |
| clsx | ClassName helper | MIT |
| @radix-ui/react-* | Accessible primitives | MIT |
| @fontsource-variable/dm-sans | UI font | OFL-1.1 |
| @fontsource-variable/fraunces | Display font | OFL-1.1 |

## Frontend (dev)

| Package | Purpose | License (typical) |
| --- | --- | --- |
| vite / @vitejs/plugin-react | Bundler | MIT |
| typescript | Types | Apache-2.0 |
| tailwindcss / @tailwindcss/vite | Styling | MIT |
| vitest / jsdom / testing-library/* | Tests | MIT |
| eslint / typescript-eslint | Lint | MIT |
| @tauri-apps/cli | Dev tooling | Apache-2.0 OR MIT |

## Rust

| Crate | Purpose | License (typical) |
| --- | --- | --- |
| tauri / tauri-build | Desktop shell | Apache-2.0 OR MIT |
| tauri-plugin-opener | Opener plugin | Apache-2.0 OR MIT |
| serde / serde_json | Serialization | Apache-2.0 OR MIT |
| rusqlite (bundled) | SQLite | MIT |
| thiserror | Error types | Apache-2.0 OR MIT |
| uuid | IDs | Apache-2.0 OR MIT |
| chrono | Timestamps | Apache-2.0 OR MIT |
| directories | Paths | Apache-2.0 OR MIT |
| parking_lot | Sync | Apache-2.0 OR MIT |
| lofty | Tags / metadata | MIT / Apache-2.0 |
| walkdir | Recursive discovery | MIT / Apache-2.0 |
| sha2 | Artwork cache keys | MIT / Apache-2.0 |
| image | Artwork thumbnails | MIT / Apache-2.0 |
| tauri-plugin-dialog | Native dialogs | Apache-2.0 OR MIT |
| symphonia | Decode | MPL-2.0 |
| cpal | Audio output | Apache-2.0 OR MIT |
| rand | Shuffle order | MIT / Apache-2.0 |

## Planned (not yet added)

| Component | Purpose | License notes |
| --- | --- | --- |
| Playwright | E2E | Apache-2.0 |

## Explicitly deferred / excluded

- Electron
- Monkeytype theme files (GPL-3.0) in core distribution
- Genius scraping libraries
