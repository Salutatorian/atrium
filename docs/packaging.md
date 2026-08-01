# Packaging & updates — Atrium

## Versioned releases (Windows / macOS / Linux)

Pushing a version tag (for example `v1.0.0`) runs `.github/workflows/release.yml`, which builds installers on GitHub Actions for:

| Platform | Artifact (typical) |
| --- | --- |
| Windows | NSIS / MSI under release assets |
| macOS | `.app` / DMG (Apple Silicon + Intel) |
| Linux | AppImage / deb |

Apple notarization and Windows Authenticode signing are optional later steps (require certificates). Unsigned builds still install; OS may show a first-run warning.

## Local installer builds

Prerequisites: Node 20+, Rust stable, platform WebView2 / WebKitGTK as required by Tauri 2.

```bash
npm install
npm run tauri build
```

Outputs land under `src-tauri/target/release/bundle/` (NSIS/MSI on Windows, `.app`/DMG on macOS, AppImage/deb on Linux depending on targets in `tauri.conf.json`).

`bundle.active` is already enabled with product icons. Bundle targets are set to `"all"` for the current platform toolchain.

## Updater (opt-in, not enabled by default)

Atrium remains offline-first. Automatic updates stay **off** until:

1. Privacy: `checkForUpdates` is enabled in settings (already a field; UI can surface later).
2. A signed release endpoint is configured via `tauri-plugin-updater`.
3. Users opt in explicitly.

Do not ship silent network update checks. When wiring the updater plugin later:

- Use signed artifacts only
- Gate behind settings + `allowNetwork`
- Never phone home for analytics

## Accessibility pass (Phase 7)

- Skip link to `#main-content` on every shell mode that shows workspace
- Player controls expose `aria-label` / `aria-pressed` for shuffle, repeat, mute, favorite, shell modes
- Tooltips via Radix for icon-only actions
- Reduced motion respected via settings + system preference
- Focusable workspace landmark (`main` + `tabIndex={-1}`) for skip target

## Keyboard (current)

| Key | Action |
| --- | --- |
| Space | Play / pause (when window focused) |
| Media keys | Previous / next / play-pause where OS delivers them |
| Shell shortcuts | Immersive / mini toggles via `useShellModeKeys` |

Expand shortcut customization in a later polish pass (`keyboard_shortcuts` table already exists).
