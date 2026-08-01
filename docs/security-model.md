# Security model — Atrium

## Threat model (local app)

- Malicious theme/settings JSON imports
- Path traversal via file references
- Over-broad filesystem capabilities
- Accidental destructive tag writes / file deletes
- Supply-chain risk from dependencies

## Controls

- Restrict Tauri capabilities to required scopes
- Validate all IPC inputs in Rust
- Validate imported JSON with schema versioning
- Sanitize file names; reject `..` path segments for user-supplied relative paths
- No arbitrary shell execution from the frontend
- Prefer OS credential storage for API keys (future)
- Prefer trash over permanent deletion
- Warn before batch metadata writes; backup tags where practical
- No analytics by default; no silent uploads; no silent model downloads

## Phase 1 capabilities

- Default window + opener plugin only
- Settings/theme commands operate on the app data directory
- No broad recursive FS permission granted to the webview
