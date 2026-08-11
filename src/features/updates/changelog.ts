/**
 * In-app changelog / "What's new".
 *
 * Shown after updates (modal) and permanently under Settings → About.
 * Keep kinds consistent so the showcase stays predictable and theme-safe.
 */

export type UpdateKind =
  | "add"
  | "improve"
  | "fix"
  | "remove"
  | "debug"
  | "polish";

export type UpdateChange = {
  kind: UpdateKind;
  text: string;
};

export type UpdateRelease = {
  /** Stable id used for dismiss persistence. Bump for each showcase. */
  id: string;
  version: string;
  title: string;
  date: string;
  summary: string;
  changes: UpdateChange[];
};

export const UPDATE_KIND_LABEL: Record<UpdateKind, string> = {
  add: "Added",
  improve: "Improved",
  fix: "Fixed",
  remove: "Removed",
  debug: "Debug",
  polish: "Polish",
};

/** Newest first. */
export const UPDATE_RELEASES: UpdateRelease[] = [
  {
    id: "2026-08-v1-6-0",
    version: "1.6.0",
    title: "Atrium 1.6",
    date: "2026-08-11",
    summary:
      "Player polish — soundbars stay in the bar, repeat-one works, and Now Playing actually focuses.",
    changes: [
      {
        kind: "improve",
        text: "Soundbars live inside the player pill so they no longer cover Settings or library content",
      },
      {
        kind: "fix",
        text: "Repeat one song sticks correctly and shows a clear “1” on the repeat button",
      },
      {
        kind: "fix",
        text: "Pausing freezes the last soundbar frame instead of wiping the visualizer",
      },
      {
        kind: "fix",
        text: "Clicking the track in the player opens a solid Now Playing view you can’t scroll through",
      },
      {
        kind: "polish",
        text: "Update toast is opaque; README badges for download, platforms, privacy, and license",
      },
    ],
  },
  {
    id: "2026-08-v1-5-2",
    version: "1.5.2",
    title: "Atrium 1.5.2",
    date: "2026-08-11",
    summary:
      "Soundbars, fonts, a real 10-band EQ, playback shortcuts, and library polish.",
    changes: [
      {
        kind: "add",
        text: "Beat-reactive soundbars behind the player with 18 styles (Settings → Appearance)",
      },
      {
        kind: "add",
        text: "70+ UI and heading fonts you can switch across the whole app",
      },
      {
        kind: "add",
        text: "10-band graphic EQ with 20 presets, preamp, and adjustable Q (Settings → Audio)",
      },
      {
        kind: "add",
        text: "Playback shortcuts: Ctrl/⌘+J K L, arrows, Space, plus media keys — listed in Settings → Shortcuts",
      },
      {
        kind: "improve",
        text: "Library jumps to the playing song; denser Compact vs Comfortable spacing; clearer import error details",
      },
      {
        kind: "polish",
        text: "Repeat-one shows a Spotify-style 1; double-click play without ugly text highlight (right-click or Alt to copy)",
      },
    ],
  },
  {
    id: "2026-08-v1-5-1",
    version: "1.5.1",
    title: "Atrium 1.5.1",
    date: "2026-08-04",
    summary:
      "Optional tips via Stripe, plus an Apache-2.0 license clarifying ownership.",
    changes: [
      {
        kind: "add",
        text: "Donate $1 / $3 / $5 in Settings → About (opens Stripe Checkout in your browser)",
      },
      {
        kind: "add",
        text: "Apache License 2.0 with copyright held by Salutatorian",
      },
    ],
  },
  {
    id: "2026-08-v1-5-0",
    version: "1.5.0",
    title: "Atrium 1.5",
    date: "2026-08-03",
    summary:
      "In-app updates, a reliable close-to-tray, and quieter lyrics chrome.",
    changes: [
      {
        kind: "add",
        text: "In-app updater with settings toggle, gear badge, and release notes toast",
      },
      {
        kind: "add",
        text: "Official Atrium logo across the app, tray/window icons, and README",
      },
      {
        kind: "fix",
        text: "Close to system tray actually hides the window and keeps the tray icon",
      },
      {
        kind: "improve",
        text: "Immersive lyrics chrome stays out of the way until you hover",
      },
      {
        kind: "polish",
        text: "README screenshots for Home, Liked, Stats, and Lyrics",
      },
    ],
  },
  {
    id: "2026-08-v1-0-0",
    version: "1.0.0",
    title: "Atrium 1.0",
    date: "2026-08-01",
    summary:
      "First public release — tray, lyrics, library dedupe, and cross-platform installers.",
    changes: [
      {
        kind: "add",
        text: "Close to system tray and optional launch at login",
      },
      {
        kind: "add",
        text: "Now Playing lyrics under artwork with pause-follow for covers",
      },
      {
        kind: "add",
        text: "Duplicate imports merge by content (same song → one library row)",
      },
      {
        kind: "add",
        text: "Windows, macOS, and Linux installers on GitHub Releases",
      },
      {
        kind: "improve",
        text: "Cleaner immersive lyrics chrome (controls appear on hover)",
      },
      {
        kind: "fix",
        text: "Linux release builds include ALSA for audio output",
      },
    ],
  },
  {
    id: "2026-08-index-in-place",
    version: "0.1.0",
    title: "Library indexes in place",
    date: "2026-08-01",
    summary:
      "Adding music only finds your folders — it never copies songs onto your computer.",
    changes: [
      {
        kind: "fix",
        text: "Library roots remember the folder you chose instead of nesting album folders as separate roots",
      },
      {
        kind: "fix",
        text: "Rescan walks each top-level folder once so songs are not indexed twice",
      },
      {
        kind: "improve",
        text: "Clearer wording that Add music / drop indexes files in place",
      },
    ],
  },
  {
    id: "2026-08-listening-stats",
    version: "0.1.0",
    title: "Listening stats",
    date: "2026-08-01",
    summary:
      "Stats.fm-style listen tracking — every song you play is counted, even if the file is gone later.",
    changes: [
      {
        kind: "add",
        text: "Stats page with listening time, scrobbles, tops, and recent listens",
      },
      {
        kind: "add",
        text: "Durable scrobbles that keep title/artist/album after files are deleted",
      },
      {
        kind: "add",
        text: "Week / month / year / all-time ranges for tops and totals",
      },
      {
        kind: "add",
        text: "Home listening teaser linking into Stats",
      },
    ],
  },
  {
    id: "2026-08-listening-room",
    version: "0.1.0",
    title: "Listening room redesign",
    date: "2026-08-01",
    summary:
      "A quieter, music-first shell — fewer permanent panels, deeper tools when you ask.",
    changes: [
      {
        kind: "improve",
        text: "Primary navigation simplified to Home, Library, Playlists, Search, and Settings",
      },
      {
        kind: "add",
        text: "Library tabs for Songs, Albums, Artists, and Folders in one place",
      },
      {
        kind: "add",
        text: "Home listening landing with now-playing hero and recent sections",
      },
      {
        kind: "add",
        text: "Context drawer for Queue, Lyrics, and Info (closed by default)",
      },
      {
        kind: "improve",
        text: "Player dock focused on essentials; immersive and mini live under More",
      },
      {
        kind: "add",
        text: "Dedicated Themes page inside Settings with Theme Studio",
      },
      {
        kind: "add",
        text: "Unified Search view with Ctrl/Cmd+K",
      },
      {
        kind: "remove",
        text: "Crowded top-level destinations (separate Songs/Albums/Themes rail items)",
      },
      {
        kind: "polish",
        text: "Continuous canvas shell with softer surfaces and less boxy chrome",
      },
      {
        kind: "fix",
        text: "Theme Studio discoverability — Themes is now a Settings category",
      },
    ],
  },
];

export function latestRelease(): UpdateRelease | null {
  return UPDATE_RELEASES[0] ?? null;
}

/** Find the newest changelog entry matching an installed version. */
export function releaseForVersion(version: string): UpdateRelease | null {
  const normalized = version.replace(/^v/i, "").trim();
  return (
    UPDATE_RELEASES.find((release) => release.version === normalized) ??
    latestRelease()
  );
}

export const SEEN_UPDATES_STORAGE_KEY = "atrium.updates.seenReleaseId";

export function readSeenReleaseId(): string | null {
  try {
    return window.localStorage.getItem(SEEN_UPDATES_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeSeenReleaseId(id: string): void {
  try {
    window.localStorage.setItem(SEEN_UPDATES_STORAGE_KEY, id);
  } catch {
    // Ignore quota / private mode failures.
  }
}
