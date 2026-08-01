import { useEffect, useRef } from "react";
import type { LyricLine } from "./types";
import { cn } from "../../utils/cn";

type SyncedLyricsProps = {
  lines: LyricLine[];
  positionMs: number;
  offsetMs: number;
  fontSize: number;
  alignment: "left" | "center" | "right";
  /** When false, stop auto-scroll / time highlight so the user can scroll freely. */
  followPlayback?: boolean;
};

export function SyncedLyrics({
  lines,
  positionMs,
  offsetMs,
  fontSize,
  alignment,
  followPlayback = true,
}: SyncedLyricsProps) {
  const activeIndex = followPlayback
    ? findActiveIndex(lines, positionMs + offsetMs)
    : null;
  const activeRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    if (!followPlayback) return;
    activeRef.current?.scrollIntoView({
      block: "center",
      behavior: "smooth",
    });
  }, [activeIndex, followPlayback]);

  if (lines.length === 0) return null;

  return (
    <ul
      className={cn(
        "synced-lyrics",
        `synced-lyrics--${alignment}`,
        !followPlayback && "synced-lyrics--manual",
      )}
      style={{ fontSize: `${fontSize}px` }}
      aria-label={
        followPlayback ? "Synced lyrics" : "Lyrics (manual scroll)"
      }
    >
      {lines.map((line, index) => {
        const state = !followPlayback
          ? "manual"
          : index === activeIndex
            ? "active"
            : index < (activeIndex ?? -1)
              ? "past"
              : "future";
        return (
          <li
            key={`${line.timeMs}-${index}`}
            ref={followPlayback && index === activeIndex ? activeRef : undefined}
            className={cn(
              "synced-lyrics__line",
              `synced-lyrics__line--${state}`,
            )}
          >
            {line.text || " "}
          </li>
        );
      })}
    </ul>
  );
}

function findActiveIndex(lines: LyricLine[], positionMs: number): number | null {
  if (lines.length === 0) return null;
  const pos = Math.max(0, positionMs);
  let active = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line) break;
    if (line.timeMs <= pos) active = i;
    else break;
  }
  return active;
}
