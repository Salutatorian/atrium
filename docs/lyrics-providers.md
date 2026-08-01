# Lyrics provider design — Atrium

## Priority order

1. Embedded metadata
2. Sidecar `.lrc`
3. Sidecar `.txt`
4. Locally saved lyrics in SQLite
5. LRCLIB
6. Additional approved providers
7. Manual paste
8. Optional local AI draft

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

## Phase 1

Interface types and documentation only. No network lyrics calls.
