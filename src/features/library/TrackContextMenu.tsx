import { useEffect, useState } from "react";
import { isFavorite, toggleFavorite } from "../listening/api";
import { addToQueue } from "../player/api";
import { usePlayerStore } from "../../stores/player-store";
import type { TrackSummary } from "./types";
import {
  addTracksToPlaylist,
  createPlaylist,
  listPlaylists,
  pickPlaylistCover,
  setPlaylistCover,
} from "../playlists/api";
import type { PlaylistSummary } from "../playlists/types";

type TrackContextMenuProps = {
  track: TrackSummary;
  x: number;
  y: number;
  onClose: () => void;
};

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    document.body.removeChild(area);
  }
}

function trackTitle(track: TrackSummary): string {
  return track.title?.trim() || "Unknown title";
}

function trackArtist(track: TrackSummary): string {
  return track.artist?.trim() || "Unknown artist";
}

export function TrackContextMenu({ track, x, y, onClose }: TrackContextMenuProps) {
  const applySnapshot = usePlayerStore((s) => s.applySnapshot);
  const [liked, setLiked] = useState(false);
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [panel, setPanel] = useState<"main" | "playlists" | "create">("main");
  const [name, setName] = useState("");
  const [coverPath, setCoverPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const left = Math.min(Math.max(8, x), window.innerWidth - 240);
  const top = Math.min(Math.max(8, y), Math.max(8, window.innerHeight - 360));

  useEffect(() => {
    let cancelled = false;
    void isFavorite(track.id).then((value) => {
      if (!cancelled) setLiked(value);
    });
    void listPlaylists().then((items) => {
      if (!cancelled) setPlaylists(items);
    });
    return () => {
      cancelled = true;
    };
  }, [track.id]);

  async function queueSong() {
    const snapshot = await addToQueue([track.id], false);
    applySnapshot(snapshot);
    onClose();
  }

  async function likeSong() {
    await toggleFavorite(track.id);
    onClose();
  }

  async function saveToPlaylist(id: string) {
    await addTracksToPlaylist(id, [track.id]);
    onClose();
  }

  async function createAndSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required");
      return;
    }
    setBusy(true);
    try {
      let created = await createPlaylist(trimmed);
      if (coverPath) {
        created = await setPlaylistCover(created.id, coverPath);
      }
      await addTracksToPlaylist(created.id, [track.id]);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (panel === "create") {
    return (
      <div
        className="modal-scrim"
        role="presentation"
        onPointerDown={(event) => {
          event.stopPropagation();
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <form
          className="modal-card"
          aria-label="New playlist"
          onSubmit={(event) => {
            event.preventDefault();
            void createAndSave();
          }}
        >
          <h2>New playlist</h2>
          {error ? <p className="settings-note">{error}</p> : null}
          <label className="settings-field">
            <span>Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Late night"
              required
              autoFocus
            />
          </label>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              void pickPlaylistCover().then((path) => {
                if (path) setCoverPath(path);
              });
            }}
          >
            {coverPath ? "Photo chosen" : "Add a square photo"}
          </button>
          <div className="modal-card__actions">
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setPanel("playlists");
                setError(null);
              }}
            >
              Back
            </button>
            <button type="submit" className="button-primary" disabled={busy}>
              Create and save
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div
      className="track-copy-menu"
      style={{ left, top }}
      role="menu"
      onPointerDown={(event) => event.stopPropagation()}
    >
      {panel === "main" ? (
        <>
          <button type="button" role="menuitem" onClick={() => void queueSong()}>
            Add to queue
          </button>
          <button type="button" role="menuitem" onClick={() => void likeSong()}>
            {liked ? "Unlike" : "Like"}
          </button>
          <div className="track-copy-menu__sep" />
          <button
            type="button"
            role="menuitem"
            onClick={() => setPanel("playlists")}
          >
            Save to playlist
          </button>
          <div className="track-copy-menu__sep" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              void copyText(trackTitle(track));
              onClose();
            }}
          >
            Copy title
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              void copyText(`${trackTitle(track)} – ${trackArtist(track)}`);
              onClose();
            }}
          >
            Copy title – artist
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              void copyText(track.path);
              onClose();
            }}
          >
            Copy file path
          </button>
        </>
      ) : (
        <>
          <button type="button" role="menuitem" onClick={() => setPanel("main")}>
            ← Back
          </button>
          <div className="track-copy-menu__sep" />
          {playlists.length === 0 ? (
            <p className="track-copy-menu__empty">No playlists yet</p>
          ) : (
            <div className="track-copy-menu__scroll">
              {playlists.map((playlist) => (
                <button
                  key={playlist.id}
                  type="button"
                  role="menuitem"
                  onClick={() => void saveToPlaylist(playlist.id)}
                >
                  {playlist.name}
                </button>
              ))}
            </div>
          )}
          <div className="track-copy-menu__sep" />
          <button type="button" role="menuitem" onClick={() => setPanel("create")}>
            New playlist…
          </button>
        </>
      )}
    </div>
  );
}
