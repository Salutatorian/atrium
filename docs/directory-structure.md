# Directory structure — Atrium

Proposed and Phase-1 target layout. Not every subdirectory is fully populated yet; interfaces and docs mark unfinished systems.

```
src/
  app/                 # App bootstrap, brand, providers, shell routes
  components/          # Shared presentational primitives
  features/
    library/
    player/
    queue/
    lyrics/
    themes/
    settings/
    search/
    playlists/
    artwork/
  hooks/
  services/            # Typed IPC clients
  stores/
  styles/
  types/
  utils/

src-tauri/src/
  app/                 # Brand, lifecycle, managed state
  audio/
    decoder/
    output/
    dsp/
    queue/
  database/
    migrations/
    repositories/
    models/
  library/
    scanner/
    metadata/
    artwork/
    watcher/
  lyrics/
    providers/
    lrc/
  platform/
    windows/
    macos/
    linux/
  commands/
  events/
  settings/
  security/
  diagnostics/

docs/                  # Phase 0 architecture set
```

## Naming rules

- Feature folders own their UI, local hooks, and types when possible.
- Shared types that cross the IPC boundary live in mirrored contracts (`src/types` ↔ Rust serde types).
- Platform code never leaks into React components; use commands.
