import { useEffect, useRef, useState } from "react";
import { IconHeart, IconPlaylists } from "../../components/icons";
import { Tooltip } from "../../components/Tooltip";
import { ArtworkImage } from "../../features/library/ArtworkImage";
import { isFavorite, toggleFavorite } from "../../features/listening/api";
import {
  playerNext,
  playerPrevious,
  playerSetMuted,
  playerSetRepeat,
  playerSetShuffle,
  playerSetVolume,
  playerToggle,
} from "../../features/player/api";
import { formatPlaybackTime } from "../../features/player/format";
import { SeekSlider } from "../../features/player/SeekSlider";
import type { RepeatMode } from "../../features/player/types";
import { usePlayerStore } from "../../stores/player-store";
import { useShellStore } from "../../stores/shell-store";
import { useSettingsStore } from "../../stores/settings-store";
import { cn } from "../../utils/cn";
import { PlayerVisualizer } from "../../features/visualizer/PlayerVisualizer";
import { isVisualizerShell } from "../../features/shell/mode";
import { setOsFullscreen } from "../../features/shell/window-fullscreen";
import { DEFAULT_VISUALIZER_STYLE } from "../../features/visualizer/catalog";

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
  const inspectorTab = useShellStore((s) => s.inspectorTab);
  const toggleDrawer = useShellStore((s) => s.toggleDrawer);
  const setNowPlayingOpen = useShellStore((s) => s.setNowPlayingOpen);
  const style = useSettingsStore((s) => s.settings.appearance.playerBarStyle);
  const shellMode = useSettingsStore((s) => s.settings.appearance.shellMode);
  const patchAppearance = useSettingsStore((s) => s.patchAppearance);

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
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const visualizer = isVisualizerShell(shellMode);
  const visualizerStyle = useSettingsStore(
    (s) => s.settings.appearance.visualizerStyle,
  );

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

  useEffect(() => {
    if (!moreOpen) return;
    function onPointer(event: PointerEvent) {
      if (!moreRef.current?.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        setMoreOpen(false);
      }
    }
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  return (
    <div
      className={cn(
        "player-bar",
        `player-bar--${style}`,
        shellMode === "mini" && "player-bar--mini",
        visualizer && "player-bar--visualizer",
        !reducedMotion && "player-bar--alive",
      )}
      role="region"
      aria-label="Playback"
    >
      <div className="player-bar__track">
        <button
          type="button"
          className="player-bar__now-open"
          aria-label="Open now playing"
          disabled={!hasTrack}
          onClick={() => setNowPlayingOpen(true)}
        >
          <ArtworkImage
            className="player-bar__art"
            cacheKey={current?.artworkCacheKey}
            alt=""
          />
          <div className="player-bar__meta">
            <p className="player-bar__title">
              {current?.title ||
                (hasTrack ? "Unknown title" : "Nothing playing")}
            </p>
            <p className="player-bar__artist">
              {error
                ? error
                : current?.artist ||
                  (hasTrack ? "Unknown artist" : "Choose a song to begin")}
            </p>
          </div>
        </button>
        {canFavorite ? (
          <Tooltip
            label={favorited ? "Remove favorite" : "Add favorite"}
            side="top"
          >
            <button
              type="button"
              className={cn(
                "icon-button player-bar__favorite",
                favorited && "icon-button--active",
              )}
              aria-label={favorited ? "Remove favorite" : "Add favorite"}
              aria-pressed={favorited}
              onClick={() => {
                if (!current || current.trackId <= 0) return;
                void toggleFavorite(current.trackId).then(setFavorited);
              }}
            >
              <IconHeart filled={favorited} />
            </button>
          </Tooltip>
        ) : null}
      </div>

      <div className="player-bar__center">
        <div className="player-bar__transport-row">
          <div className="player-bar__transport-spacer" aria-hidden="true" />
          <div className="player-bar__transport">
          <Tooltip label={shuffle ? "Shuffle on" : "Shuffle off"} side="top">
            <button
              type="button"
              className={cn(
                "icon-button icon-button--quiet",
                shuffle && "icon-button--active",
              )}
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
              className={cn(
                "icon-button icon-button--quiet",
                repeat !== "off" && "icon-button--active",
              )}
              aria-label={
                repeat === "track" ? "Repeat one song" : "Repeat"
              }
              aria-pressed={repeat !== "off"}
              onClick={() => {
                void playerSetRepeat(nextRepeat(repeat)).then(applySnapshot);
              }}
            >
              <TransportGlyph
                kind={repeat === "track" ? "repeat-one" : "repeat"}
              />
            </button>
          </Tooltip>
          </div>
          <div className="player-bar__viz-slot">
            <Tooltip
              label={visualizer ? "Exit visualizer" : "Open visualizer"}
              side="top"
            >
              <button
                type="button"
                className="player-bar__viz-toggle"
                aria-label={visualizer ? "Exit visualizer" : "Open visualizer"}
                aria-pressed={visualizer}
                onClick={() => {
                  if (visualizer) {
                    void setOsFullscreen(false);
                    void patchAppearance({ shellMode: "normal" });
                    return;
                  }
                  void patchAppearance({
                    shellMode: "visualizer",
                    visualizerEnabled: true,
                    visualizerStyle:
                      visualizerStyle === "off"
                        ? DEFAULT_VISUALIZER_STYLE
                        : visualizerStyle,
                  });
                }}
              >
                <PlayerVisualizer reducedMotion={reducedMotion} />
              </button>
            </Tooltip>
          </div>
        </div>

        <div className="player-bar__timeline">
          <span>{formatPlaybackTime(positionMs)}</span>
          <SeekSlider
            className="player-bar__scrub"
            max={scrubMax}
            positionMs={positionMs}
            progress={progress}
            disabled={!hasTrack}
          />
          <span>{durationMs > 0 ? formatPlaybackTime(durationMs) : "…"}</span>
        </div>
      </div>

      <div className="player-bar__extras">
        <div className="volume-control">
          <button
            type="button"
            className="icon-button volume-control__mute"
            aria-label={muted ? "Unmute" : "Mute"}
            onClick={() => {
              void playerSetMuted(!muted).then(applySnapshot);
            }}
          >
            <TransportGlyph
              kind={muted || volume === 0 ? "volume-mute" : "volume"}
            />
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.005}
            value={muted ? 0 : volume}
            aria-label="Volume"
            aria-valuetext={`${Math.round((muted ? 0 : volume) * 100)} percent`}
            style={{
              ["--volume-progress" as string]: `${(muted ? 0 : volume) * 100}%`,
            }}
            onChange={(event) => {
              const next = Number(event.target.value);
              void playerSetVolume(next).then(applySnapshot);
            }}
          />
        </div>
        <Tooltip label="Queue" side="top">
          <button
            type="button"
            className={cn(
              "icon-button",
              inspectorOpen &&
                inspectorTab === "queue" &&
                "icon-button--active",
            )}
            aria-label="Queue"
            aria-pressed={inspectorOpen && inspectorTab === "queue"}
            onClick={() => toggleDrawer("queue")}
          >
            <IconPlaylists />
          </button>
        </Tooltip>
        <Tooltip label="Lyrics" side="top">
          <button
            type="button"
            className={cn(
              "icon-button",
              inspectorOpen &&
                inspectorTab === "lyrics" &&
                "icon-button--active",
            )}
            aria-label="Lyrics"
            aria-pressed={inspectorOpen && inspectorTab === "lyrics"}
            onClick={() => toggleDrawer("lyrics")}
          >
            <TransportGlyph kind="lyrics" />
          </button>
        </Tooltip>
        <div className="player-bar__more" ref={moreRef}>
          <Tooltip label="More" side="top">
            <button
              type="button"
              className={cn("icon-button", moreOpen && "icon-button--active")}
              aria-label="More playback options"
              aria-haspopup="menu"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((open) => !open)}
            >
              <TransportGlyph kind="more" />
            </button>
          </Tooltip>
          {moreOpen ? (
            <div className="player-more-menu" role="menu">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  if (visualizer) {
                    void setOsFullscreen(false);
                    void patchAppearance({ shellMode: "normal" });
                  } else {
                    void patchAppearance({
                      shellMode: "visualizer",
                      visualizerEnabled: true,
                      visualizerStyle:
                        visualizerStyle === "off"
                          ? DEFAULT_VISUALIZER_STYLE
                          : visualizerStyle,
                    });
                  }
                  setMoreOpen(false);
                }}
              >
                {visualizer ? "Exit visualizer" : "Visualizer mode"}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  void patchAppearance({
                    shellMode: shellMode === "mini" ? "normal" : "mini",
                  });
                  setMoreOpen(false);
                }}
              >
                {shellMode === "mini" ? "Exit mini player" : "Mini player"}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  toggleDrawer("info");
                  setMoreOpen(false);
                }}
              >
                Track info
              </button>
            </div>
          ) : null}
        </div>
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
    | "more";
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
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M7 7h9a4 4 0 0 1 4 4v1M17 17H8a4 4 0 0 1-4-4v-1"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <path
            d="m14 4 3 3-3 3M10 20l-3-3 3-3"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Clear “1” centered in the loop */}
          <path
            d="M11.25 8.35V15.1h1.35V9.85h.04l1.85.7V9.45l-2.05-1.1h-1.19Z"
            fill="currentColor"
          />
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
    case "more":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="19" cy="12" r="1.6" />
        </svg>
      );
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}
