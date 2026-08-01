# Lyrics provider design — Atrium

## Priority order

1. Embedded metadata
2. Sidecar `.lrc`
3. Sidecar `.txt`
4. Locally saved lyrics in SQLite
5. LRCLIB (manual fetch / search)
6. Additional approved providers
7. Manual paste / editor
8. Optional local AI draft (later)

## Resolve behavior (Phase 5)

`lyrics_resolve` loads **local** sources only (cache → embedded → sidecars) and caches the result for library tracks.

LRCLIB is never called automatically. Users opt in via Settings → Privacy (`allowNetwork` **and** `allowLyricsProviders`), then use **Fetch LRCLIB** or **Search LRCLIB** in the inspector.

## Provider interface

```ts
interface LyricsProvider {
  providerId: string;
  displayName: string;
  supportsPlain: boolean;
  supportsSynced: boolean;
  requiresApiKey: boolean;
  termsNotice: string;
  attributionRequirements: string;
  cachingPolicy: "local" | "session" | "none";
  search(query: LyricsSearchQuery): Promise<LyricsSearchResult[]>;
  fetch(id: string): Promise<LyricsDocument>;
}
```

## Rules

- Do not scrape Genius or other sites without explicit permission
- Never conceal provider attribution
- AI drafts are labeled, editable, and never auto-finalized
- Network providers are disabled when privacy settings disallow network access

## Offsets

- Per-track `offset_ms` stored on the `lyrics` row
- Global `settings.lyrics.globalOffsetMs`
- Active line uses `positionMs + globalOffset + trackOffset`
