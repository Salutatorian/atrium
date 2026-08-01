import { useEffect, useRef } from "react";
import type { LyricLine } from "./types";
import { cn } from "../../utils/cn";

type SyncedLyricsProps = {
  lines: LyricLine[];
  positionMs: number;
  offsetMs: number;
  fontSize: number;
  alignment: "left" | "center" | "right";
};

export function SyncedLyrics({
  lines,
  positionMs,
  offsetMs,
  fontSize,
  alignment,
}: SyncedLyricsProps) {
  const activeIndex = findActiveIndex(lines, positionMs + offsetMs);
  const activeRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      block: "center",
      behavior: "smooth",
    });
  }, [activeIndex]);

  if (lines.length === 0) return null;

  return (
    <ul
      className={cn("synced-lyrics", `synced-lyrics--${alignment}`)}
      style={{ fontSize: `${fontSize}px` }}
    >
      {lines.map((line, index) => {
        const state =
          index === activeIndex
            ? "active"
            : index < (activeIndex ?? -1)
              ? "past"
              : "future";
        return (
          <li
            key={`${line.timeMs}-${index}`}
            ref={index === activeIndex ? activeRef : undefined}
            className={cn("synced-lyrics__line", `synced-lyrics__line--${state}`)}
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
