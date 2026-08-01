# Platform support matrix — Atrium

| Feature | Windows | macOS | Linux | Phase |
| --- | --- | --- | --- | --- |
| App shell | Yes | Yes | Yes | 1 |
| Drag/drop import | Planned | Planned | Planned | 2 |
| Local SQLite library | Yes | Yes | Yes | 1+ |
| Native playback | Planned | Planned | Planned | 3 |
| Media keys | Planned | Planned | Planned | 3 |
| System media / Now Playing / MPRIS | SMTC | Now Playing | MPRIS | 3–4 |
| System tray | Planned | Planned | Planned | 4 |
| Transparency effects | OS-dependent | OS-dependent | Compositor-dependent | 4 |
| Installer | MSI/NSIS | .app / notarize | AppImage, deb/rpm, Flatpak later | Packaging |

Platform-specific code lives under `src-tauri/src/platform/{windows,macos,linux}` behind feature gates. The React UI must not branch on OS for native behavior.
