import { useEffect, useState } from "react";
import { IconHeart, IconPlaylists } from "../../components/icons";
import { Tooltip } from "../../components/Tooltip";
import { ArtworkImage } from "../../features/library/ArtworkImage";
import {
  isFavorite,
  toggleFavorite,
} from "../../features/listening/api";
import {
  playerNext,
  playerPrevious,
  playerSeek,
  playerSetMuted,
  playerSetRepeat,
  playerSetShuffle,
  playerSetVolume,
  playerToggle,
} from "../../features/player/api";
import { formatPlaybackTime } from "../../features/player/format";
import type { RepeatMode } from "../../features/player/types";
import { usePlayerStore } from "../../stores/player-store";
import { useShellStore } from "../../stores/shell-store";
import { useSettingsStore } from "../../stores/settings-store";
import { cn } from "../../utils/cn";

type PlayerBarProps = {
  reducedMotion: boolean;
};

function nextRepeat(mode: RepeatMode): RepeatMode {
  switch (mode) {
    case "off":
      return "queue";
    case "queue":
      return "track";
    case "track":
      return "off";
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

export function PlayerBar({ reducedMotion }: PlayerBarProps) {
  const inspectorOpen = useShellStore((s) => s.inspectorOpen);
  const setInspectorOpen = useShellStore((s) => s.setInspectorOpen);
  const setInspectorTab = useShellStore((s) => s.setInspectorTab);
  const patchAppearance = useSettingsStore((s) => s.patchAppearance);
  const style = useSettingsStore((s) => s.settings.appearance.playerBarStyle);
  const shellMode = useSettingsStore((s) => s.settings.appearance.shellMode);

  const status = usePlayerStore((s) => s.status);
  const current = usePlayerStore((s) => s.current);
  const positionMs = usePlayerStore((s) => s.positionMs);
  const durationMs = usePlayerStore((s) => s.durationMs);
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const error = usePlayerStore((s) => s.error);
  const applySnapshot = usePlayerStore((s) => s.applySnapshot);
  const [favorited, setFavorited] = useState(false);

  const playing = status === "playing";
  const hasTrack = Boolean(current);
  const canFavorite = Boolean(current && current.trackId > 0);
  const scrubMax = Math.max(durationMs, positionMs, 1);
  const progress =
    durationMs > 0
      ? Math.min(100, (positionMs / durationMs) * 100)
      : Math.min(100, (positionMs / scrubMax) * 100);

  useEffect(() => {
    const trackId = current?.trackId;
    if (!trackId || trackId <= 0) {
      return;
    }
    let cancelled = false;
    void isFavorite(trackId).then((value) => {
      if (!cancelled) setFavorited(value);
    });
    return () => {
      cancelled = true;
    };
  }, [current?.trackId]);

  return (
    <div
      className={cn(
        "player-bar",
        `player-bar--${style}`,
        shellMode === "mini" && "player-bar--mini",
        shellMode === "immersive" && "player-bar--immersive",
        !reducedMotion && "player-bar--alive",
      )}
      role="region"
      aria-label="Playback"
    >
      <div className="player-bar__track">
        <ArtworkImage
          className="player-bar__art"
          cacheKey={current?.artworkCacheKey}
          alt=""
        />
        <div className="player-bar__meta">
          <p className="player-bar__title">
            {current?.title || (hasTrack ? "Unknown title" : "Nothing playing")}
          </p>
          <p className="player-bar__artist">
            {error
              ? error
              : current?.artist ||
                (hasTrack ? "Unknown artist" : "Double-click a song to play")}
          </p>
        </div>
        <Tooltip
          label={
            canFavorite
              ? favorited
                ? "Remove favorite"
                : "Add favorite"
              : "Favorite (library tracks only)"
          }
          side="top"
        >
          <button
            type="button"
            className={cn("icon-button", favorited && "icon-button--active")}
            aria-label={favorited ? "Remove favorite" : "Add favorite"}
            aria-pressed={favorited}
            disabled={!canFavorite}
            onClick={() => {
              if (!current || current.trackId <= 0) return;
              void toggleFavorite(current.trackId).then(setFavorited);
            }}
          >
            <IconHeart filled={favorited} />
          </button>
        </Tooltip>
      </div>

      <div className="player-bar__transport">
        <Tooltip label={shuffle ? "Shuffle on" : "Shuffle off"} side="top">
          <button
            type="button"
            className={cn("icon-button", shuffle && "icon-button--active")}
            aria-label="Shuffle"
            aria-pressed={shuffle}
            onClick={() => {
              void playerSetShuffle(!shuffle).then(applySnapshot);
            }}
          >
            <TransportGlyph kind="shuffle" />
          </button>
        </Tooltip>
        <Tooltip label="Previous" side="top">
          <button
            type="button"
            className="icon-button"
            aria-label="Previous"
            disabled={!hasTrack}
            onClick={() => {
              void playerPrevious().then(applySnapshot);
            }}
          >
            <TransportGlyph kind="prev" />
          </button>
        </Tooltip>
        <Tooltip label={playing ? "Pause" : "Play"} side="top">
          <button
            type="button"
            className="play-button"
            aria-label={playing ? "Pause" : "Play"}
            disabled={!hasTrack && status === "stopped"}
            onClick={() => {
              void playerToggle().then(applySnapshot);
            }}
          >
            <TransportGlyph kind={playing ? "pause" : "play"} />
          </button>
        </Tooltip>
        <Tooltip label="Next" side="top">
          <button
            type="button"
            className="icon-button"
            aria-label="Next"
            disabled={!hasTrack}
            onClick={() => {
              void playerNext().then(applySnapshot);
            }}
          >
            <TransportGlyph kind="next" />
          </button>
        </Tooltip>
        <Tooltip
          label={
            repeat === "off"
              ? "Repeat off"
              : repeat === "queue"
                ? "Repeat queue"
                : "Repeat track"
          }
          side="top"
        >
          <button
            type="button"
            className={cn("icon-button", repeat !== "off" && "icon-button--active")}
            aria-label="Repeat"
            aria-pressed={repeat !== "off"}
            onClick={() => {
              void playerSetRepeat(nextRepeat(repeat)).then(applySnapshot);
            }}
          >
            <TransportGlyph kind={repeat === "track" ? "repeat-one" : "repeat"} />
          </button>
        </Tooltip>
      </div>

      <div className="player-bar__timeline">
        <span>{formatPlaybackTime(positionMs)}</span>
        <label className="player-bar__scrub">
          <span className="sr-only">Seek</span>
          <input
            type="range"
            min={0}
            max={scrubMax}
            step={250}
            value={Math.min(positionMs, scrubMax)}
            disabled={!hasTrack}
            aria-label="Seek"
            style={{ ["--scrub-progress" as string]: `${progress}%` }}
            onChange={(event) => {
              const next = Number(event.target.value);
              void playerSeek(next).then(applySnapshot);
            }}
          />
        </label>
        <span>
          {durationMs > 0 ? formatPlaybackTime(durationMs) : "…"}
        </span>
      </div>

      <div className="player-bar__extras">
        <label className="volume-control">
          <span className="sr-only">Volume</span>
          <button
            type="button"
            className="icon-button"
            aria-label={muted ? "Unmute" : "Mute"}
            onClick={() => {
              void playerSetMuted(!muted).then(applySnapshot);
            }}
          >
            <TransportGlyph kind={muted || volume === 0 ? "volume-mute" : "volume"} />
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            aria-label="Volume"
            onChange={(event) => {
              const next = Number(event.target.value);
              void playerSetVolume(next).then(applySnapshot);
            }}
          />
        </label>
        <Tooltip label="Queue" side="top">
          <button
            type="button"
            className="icon-button"
            aria-label="Open queue"
            aria-pressed={inspectorOpen}
            onClick={() => {
              const next = !inspectorOpen;
              setInspectorTab("queue");
              setInspectorOpen(next);
              void patchAppearance({ inspectorOpen: next });
            }}
          >
            <IconPlaylists />
          </button>
        </Tooltip>
        <Tooltip label="Lyrics" side="top">
          <button
            type="button"
            className="icon-button"
            aria-label="Open lyrics"
            onClick={() => {
              setInspectorTab("lyrics");
              setInspectorOpen(true);
              void patchAppearance({ inspectorOpen: true });
            }}
          >
            <TransportGlyph kind="lyrics" />
          </button>
        </Tooltip>
        <Tooltip
          label={shellMode === "immersive" ? "Exit immersive" : "Immersive mode"}
          side="top"
        >
          <button
            type="button"
            className={cn(
              "icon-button",
              shellMode === "immersive" && "icon-button--active",
            )}
            aria-label={
              shellMode === "immersive" ? "Exit immersive" : "Immersive mode"
            }
            aria-pressed={shellMode === "immersive"}
            onClick={() => {
              void patchAppearance({
                shellMode: shellMode === "immersive" ? "normal" : "immersive",
              });
            }}
          >
            <TransportGlyph kind="immersive" />
          </button>
        </Tooltip>
        <Tooltip
          label={shellMode === "mini" ? "Exit mini player" : "Mini player"}
          side="top"
        >
          <button
            type="button"
            className={cn(
              "icon-button",
              shellMode === "mini" && "icon-button--active",
            )}
            aria-label={shellMode === "mini" ? "Exit mini player" : "Mini player"}
            aria-pressed={shellMode === "mini"}
            onClick={() => {
              void patchAppearance({
                shellMode: shellMode === "mini" ? "normal" : "mini",
              });
            }}
          >
            <TransportGlyph kind="mini" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}

function TransportGlyph({
  kind,
}: {
  kind:
    | "shuffle"
    | "prev"
    | "play"
    | "pause"
    | "next"
    | "repeat"
    | "repeat-one"
    | "volume"
    | "volume-mute"
    | "lyrics"
    | "immersive"
    | "mini";
}) {
  switch (kind) {
    case "shuffle":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <path d="M4 7h3.5l9 10H20M20 7h-3.5l-2.2 2.4M4 17h3.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M17 4l3 3-3 3M17 14l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "prev":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <rect x="4" y="5" width="2.5" height="14" rx="0.5" />
          <path d="M19.5 6.2v11.6L8.2 12 19.5 6.2Z" />
        </svg>
      );
    case "play":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M8 5.5v13l11-6.5-11-6.5Z" />
        </svg>
      );
    case "pause":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M7 5h3.5v14H7V5Zm6.5 0H17v14h-3.5V5Z" />
        </svg>
      );
    case "next":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M4.5 6.2v11.6L15.8 12 4.5 6.2Z" />
          <rect x="17.5" y="5" width="2.5" height="14" rx="0.5" />
        </svg>
      );
    case "repeat":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <path d="M7 7h9a4 4 0 0 1 4 4v1M17 17H8a4 4 0 0 1-4-4v-1" strokeLinecap="round" />
          <path d="m14 4 3 3-3 3M10 20l-3-3 3-3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "repeat-one":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <path d="M7 7h9a4 4 0 0 1 4 4v1M17 17H8a4 4 0 0 1-4-4v-1" strokeLinecap="round" />
          <path d="m14 4 3 3-3 3M10 20l-3-3 3-3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 10v4" strokeLinecap="round" />
        </svg>
      );
    case "volume":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <path d="M4 10h3l5-4v12l-5-4H4v-4Z" strokeLinejoin="round" />
          <path d="M16 9.5a3.5 3.5 0 0 1 0 5M18.5 7a6 6 0 0 1 0 10" strokeLinecap="round" />
        </svg>
      );
    case "volume-mute":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <path d="M4 10h3l5-4v12l-5-4H4v-4Z" strokeLinejoin="round" />
          <path d="m16 10 4 4M20 10l-4 4" strokeLinecap="round" />
        </svg>
      );
    case "lyrics":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <path d="M6 7h12M6 12h12M6 17h8" strokeLinecap="round" />
        </svg>
      );
    case "immersive":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <path d="M8 4H4v4M16 4h4v4M4 16v4h4M20 16v4h-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "mini":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <rect x="4" y="10" width="16" height="8" rx="3" />
          <path d="M8 10V8a4 4 0 0 1 8 0v2" strokeLinecap="round" />
        </svg>
      );
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}
