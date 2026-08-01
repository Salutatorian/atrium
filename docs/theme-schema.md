# Theme schema — Atrium

Themes are JSON documents with no executable code. File kind: `atrium-theme.json`.

## Document shape

```json
{
  "kind": "atrium-theme",
  "schemaVersion": 1,
  "id": "atrium-dusk",
  "name": "Dusk",
  "description": "Warm charcoal listening room",
  "base": "dark",
  "tags": ["dark", "warm"],
  "colors": { "appBackground": "#1a1714", "accent": "#d08a4c" },
  "appearance": { "fontFamily": "\"DM Sans Variable\", sans-serif" },
  "background": {
    "mode": "gradient",
    "blur": 0,
    "darkness": 0.15,
    "brightness": 1,
    "saturation": 1,
    "overlayOpacity": 0.2,
    "noiseAmount": 0.03,
    "vignetteAmount": 0.25,
    "animationStrength": 0.2
  }
}
```

## Required color tokens

`appBackground`, `raisedBackground`, `surface`, `surfaceHover`, `surfaceActive`, `surfaceSelected`, `primaryText`, `secondaryText`, `mutedText`, `accent`, `accentHover`, `accentText`, `secondaryAccent`, `border`, `divider`, `focusRing`, `success`, `warning`, `danger`, `artworkGlow`, `waveform`, `progressTrack`, `progressFill`, `lyricActive`, `lyricPast`, `lyricFuture`, `selection`, `scrollbar`, `tooltipBackground`, `tooltipText`, `contextMenuBackground`

## Required appearance tokens

`fontFamily`, `headingFontFamily`, `baseFontSize`, `fontWeight`, `headingWeight`, `letterSpacing`, `lineHeight`, `cornerRadiusSmall`, `cornerRadiusMedium`, `cornerRadiusLarge`, `buttonRadius`, `artworkRadius`, `borderWidth`, `shadowStrength`, `blurStrength`, `surfaceOpacity`, `spacingScale`, `controlHeight`, `sidebarWidth`, `inspectorWidth`

## Validation

- Frontend: Zod schema (`src/features/themes/schema.ts`)
- Import: reject unknown `kind`, migrate by `schemaVersion`, sanitize background paths, forbid path traversal
- Apply: map tokens to CSS custom properties on `:root`

## Licensing stance

Original presets only in core (Mist, Dusk, plus the Atrium catalog). External packs — including Monkeytype theme JSON (GPL-3.0) — stay out of the distribution until attribution and license compatibility are reviewed. Compatible `.atrium-theme.json` files can still be imported locally.
