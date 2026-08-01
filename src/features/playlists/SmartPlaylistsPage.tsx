import { useEffect, useState } from "react";
import { playTracks } from "../player/api";
import { formatDuration } from "../library/api";
import type { TrackSummary } from "../library/types";
import { usePlayerStore } from "../../stores/player-store";
import {
  createSmartPlaylist,
  deleteSmartPlaylist,
  listSmartPlaylistTracks,
  listSmartPlaylists,
} from "./api";
import type { SmartPlaylistRules, SmartPlaylistSummary, SmartRule } from "./types";

const emptyRule = (): SmartRule => ({
  field: "artist",
  op: "contains",
  value: "",
});

export function SmartPlaylistsPage() {
  const [items, setItems] = useState<SmartPlaylistSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tracks, setTracks] = useState<TrackSummary[]>([]);
  const [name, setName] = useState("");
  const [matchMode, setMatchMode] = useState<"all" | "any">("all");
  const [rules, setRules] = useState<SmartRule[]>([emptyRule()]);
  const [error, setError] = useState<string | null>(null);
  const [listVersion, setListVersion] = useState(0);
  const applySnapshot = usePlayerStore((s) => s.applySnapshot);

  function bumpList() {
    setListVersion((v) => v + 1);
  }

  async function openSmart(id: string) {
    setSelectedId(id);
    const page = await listSmartPlaylistTracks(id, 0, 100);
    setTracks(page.items);
  }

  useEffect(() => {
    let cancelled = false;
    void listSmartPlaylists()
      .then((rows) => {
        if (cancelled) return;
        setItems(rows);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [listVersion]);

  return (
    <section className="panel library-page" aria-label="Smart playlists">
      <p className="panel__intro">
        Rule-based playlists that refresh from your library metadata — artist,
        album, genre, year, and title.
      </p>

      <form
        className="smart-form"
        onSubmit={(event) => {
          event.preventDefault();
          const payload: SmartPlaylistRules = { matchMode, rules };
          void createSmartPlaylist(name, payload)
            .then(async (created) => {
              setName("");
              setRules([emptyRule()]);
              await bumpList();
              await openSmart(created.id);
            })
            .catch((err: unknown) => {
              setError(err instanceof Error ? err.message : String(err));
            });
        }}
      >
        <label className="settings-field">
          <span>Name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Jazz after 1950"
            required
          />
        </label>
        <label className="settings-field">
          <span>Match</span>
          <select
            value={matchMode}
            onChange={(event) =>
              setMatchMode(event.target.value as "all" | "any")
            }
          >
            <option value="all">All rules</option>
            <option value="any">Any rule</option>
          </select>
        </label>

        {rules.map((rule, index) => (
          <div key={index} className="smart-rule-row">
            <select
              value={rule.field}
              onChange={(event) => {
                const next = [...rules];
                next[index] = {
                  ...rule,
                  field: event.target.value as SmartRule["field"],
                };
                setRules(next);
              }}
            >
              <option value="title">Title</option>
              <option value="artist">Artist</option>
              <option value="album">Album</option>
              <option value="albumArtist">Album artist</option>
              <option value="genre">Genre</option>
              <option value="year">Year</option>
            </select>
            <select
              value={rule.op}
              onChange={(event) => {
                const next = [...rules];
                next[index] = {
                  ...rule,
                  op: event.target.value as SmartRule["op"],
                };
                setRules(next);
              }}
            >
              <option value="contains">contains</option>
              <option value="equals">equals</option>
              <option value="startsWith">starts with</option>
              <option value="gte">≥</option>
              <option value="lte">≤</option>
            </select>
            <input
              value={rule.value}
              onChange={(event) => {
                const next = [...rules];
                next[index] = { ...rule, value: event.target.value };
                setRules(next);
              }}
              placeholder="Value"
              required
            />
          </div>
        ))}

        <div className="playlist-detail__actions">
          <button
            type="button"
            className="text-button"
            onClick={() => setRules((prev) => [...prev, emptyRule()])}
          >
            Add rule
          </button>
          <button type="submit" className="button-primary">
            Create smart playlist
          </button>
        </div>
      </form>

      {error ? <p className="settings-note">{error}</p> : null}

      <div className="playlist-layout">
        <ul className="playlist-list">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={
                  selectedId === item.id
                    ? "playlist-list__item playlist-list__item--active"
                    : "playlist-list__item"
                }
                onClick={() => {
                  void openSmart(item.id);
                }}
              >
                <strong>{item.name}</strong>
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  void deleteSmartPlaylist(item.id).then(async () => {
                    if (selectedId === item.id) {
                      setSelectedId(null);
                      setTracks([]);
                    }
                    await bumpList();
                  });
                }}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>

        <div className="playlist-detail">
          {!selectedId ? (
            <p className="empty-panel__detail">
              Select a smart playlist to preview matching tracks.
            </p>
          ) : tracks.length === 0 ? (
            <p className="empty-panel__detail">No matching tracks.</p>
          ) : (
            <ul className="playlist-tracks">
              {tracks.map((track, index) => (
                <li key={track.id} className="playlist-track-row">
                  <button
                    type="button"
                    className="playlist-track-row__play"
                    onDoubleClick={() => {
                      void playTracks(
                        tracks.map((t) => t.id),
                        index,
                      ).then(applySnapshot);
                    }}
                  >
                    <strong>{track.title || "Unknown title"}</strong>
                    <span className="muted">
                      {track.artist || "Unknown artist"} ·{" "}
                      {formatDuration(track.durationMs)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
