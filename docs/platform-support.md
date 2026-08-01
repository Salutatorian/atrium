# Platform support matrix — Atrium

| Feature | Windows | macOS | Linux | Phase |
| --- | --- | --- | --- | --- |
| App shell | Yes | Yes | Yes | 1 |
| Drag/drop import | Yes | Yes | Yes | 2 |
| Local SQLite library | Yes | Yes | Yes | 1+ |
| Native playback | Yes | Yes | Yes | 3 |
| Media keys | Basic | Basic | Basic | 3 |
| System media / Now Playing / MPRIS | Planned | Planned | Planned | Later |
| System tray | Planned | Planned | Planned | Later |
| Transparency effects | OS-dependent | OS-dependent | Compositor-dependent | 4 |
| Installer | MSI/NSIS | .app / notarize | AppImage, deb/rpm | Packaging (`npm run tauri:build`) |
| Auto-updater | Opt-in later | Opt-in later | Opt-in later | See `docs/packaging.md` |

Platform-specific code lives under `src-tauri/src/platform/{windows,macos,linux}` behind feature gates. The React UI must not branch on OS for native behavior.
