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

## Updater (in-app)

Settings → General:

- **Check for updates** — looks for a newer release on launch (default on for new installs)
- **Install updates automatically** — downloads and installs quietly on launch; the window may close briefly while updating
- With auto-install off, a bottom-right **Update / Cancel** toast appears, and the Settings gear shows a badge

After a successful update, Atrium shows a “what’s new” dialog (Added / Fixed / Removed / Debug / … from `src/features/updates/changelog.ts`).

### Signing (required for silent install)

1. Private key lives at `src-tauri/keys/atrium.key` (gitignored). Public key is in `tauri.conf.json`.
2. Add GitHub Actions secrets:
   - `TAURI_SIGNING_PRIVATE_KEY` — full contents of `atrium.key`
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — empty if the key has no password
3. Next tagged release uploads `latest.json` + `.sig` artifacts for the updater endpoint:
   `https://github.com/Salutatorian/atrium/releases/latest/download/latest.json`

Without the private key secret, Atrium still detects newer GitHub Releases and offers Update (opens the release page). Silent install needs signed updater artifacts.

Atrium remains offline-first for library/lyrics networking; update checks are a separate Settings toggle.

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
