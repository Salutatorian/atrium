/** Single source of truth for keyboard shortcuts (Settings + handlers). */

export type ShortcutChord = {
  /** Physical key `KeyboardEvent.code` when relevant (layout-stable). */
  code?: string;
  /** Fallback `KeyboardEvent.key` match (case-insensitive). */
  key?: string;
  ctrlOrMeta?: boolean;
  shift?: boolean;
  alt?: boolean;
};

export type ShortcutItem = {
  id: string;
  action: string;
  /** Chords that trigger this action (any match). */
  chords: ShortcutChord[];
  /** Human-readable labels for Settings (already localized to Ctrl / ⌘). */
  labels: string[][];
};

export type ShortcutGroup = {
  id: string;
  title: string;
  items: ShortcutItem[];
};

export function modifierLabel(): "Ctrl" | "⌘" {
  if (typeof navigator === "undefined") return "Ctrl";
  const platform = navigator.platform || "";
  const ua = navigator.userAgent || "";
  if (/Mac|iPhone|iPad|iPod/i.test(platform) || /Mac OS/i.test(ua)) {
    return "⌘";
  }
  return "Ctrl";
}

/** Build the catalog with the correct modifier glyph for this OS. */
export function getShortcutCatalog(): ShortcutGroup[] {
  const mod = modifierLabel();
  return [
    {
      id: "playback",
      title: "Playback",
      items: [
        {
          id: "play-pause",
          action: "Play / pause",
          chords: [
            { code: "Space", key: " " },
            { code: "MediaPlayPause" },
            { code: "KeyK", key: "k", ctrlOrMeta: true },
          ],
          labels: [["Space"], ["Media play/pause"], [mod, "K"]],
        },
        {
          id: "previous",
          action: "Previous track",
          chords: [
            { code: "MediaTrackPrevious" },
            { code: "KeyJ", key: "j", ctrlOrMeta: true },
            { code: "ArrowLeft", key: "ArrowLeft", ctrlOrMeta: true },
          ],
          labels: [["Media previous"], [mod, "J"], [mod, "←"]],
        },
        {
          id: "next",
          action: "Next track",
          chords: [
            { code: "MediaTrackNext" },
            { code: "KeyL", key: "l", ctrlOrMeta: true },
            { code: "ArrowRight", key: "ArrowRight", ctrlOrMeta: true },
          ],
          labels: [["Media next"], [mod, "L"], [mod, "→"]],
        },
      ],
    },
    {
      id: "navigation",
      title: "Navigation",
      items: [
        {
          id: "search",
          action: "Open search",
          chords: [{ code: "KeyF", key: "f", ctrlOrMeta: true }],
          labels: [[mod, "F"]],
        },
        {
          id: "escape",
          action: "Close drawer / now playing / exit mini or visualizer",
          chords: [{ code: "Escape", key: "Escape" }],
          labels: [["Esc"]],
        },
        {
          id: "visualizer-fullscreen",
          action: "Toggle OS fullscreen in Visualizer Mode",
          chords: [{ code: "F11", key: "F11" }],
          labels: [["F11"]],
        },
      ],
    },
  ];
}

export function chordMatches(
  event: KeyboardEvent,
  chord: ShortcutChord,
): boolean {
  if (Boolean(chord.ctrlOrMeta) !== (event.ctrlKey || event.metaKey)) {
    return false;
  }
  if (Boolean(chord.shift) !== event.shiftKey) return false;
  if (Boolean(chord.alt) !== event.altKey) return false;

  if (chord.code && event.code === chord.code) return true;
  if (chord.key && event.key.toLowerCase() === chord.key.toLowerCase()) {
    return true;
  }
  return false;
}

export function matchShortcutAction(
  event: KeyboardEvent,
  actionId: string,
): boolean {
  for (const group of getShortcutCatalog()) {
    for (const item of group.items) {
      if (item.id !== actionId) continue;
      if (item.chords.some((chord) => chordMatches(event, chord))) {
        return true;
      }
    }
  }
  return false;
}
