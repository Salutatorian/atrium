import { useEffect, useState } from "react";
import { fetchLibraryTrack, updateLibraryTrackTags } from "./api";
import type { TrackSummary } from "./types";
import { useLibraryStore } from "../../stores/library-store";

type TagEditorProps = {
  trackId: number;
};

export function TagEditor({ trackId }: TagEditorProps) {
  const refreshAll = useLibraryStore((s) => s.refreshAll);
  const [track, setTrack] = useState<TrackSummary | null>(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [album, setAlbum] = useState("");
  const [albumArtist, setAlbumArtist] = useState("");
  const [genre, setGenre] = useState("");
  const [year, setYear] = useState("");
  const [trackNumber, setTrackNumber] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchLibraryTrack(trackId).then((row) => {
      if (cancelled) return;
      setTrack(row);
      setTitle(row?.title ?? "");
      setArtist(row?.artist ?? "");
      setAlbum(row?.album ?? "");
      setAlbumArtist(row?.albumArtist ?? "");
      setGenre(row?.genre ?? "");
      setYear(row?.year != null ? String(row.year) : "");
      setTrackNumber(row?.trackNumber != null ? String(row.trackNumber) : "");
      setStatus(null);
    });
    return () => {
      cancelled = true;
    };
  }, [trackId]);

  if (!track) {
    return (
      <p className="inspector__empty">
        Library tags unavailable for this item.
      </p>
    );
  }

  return (
    <form
      className="tag-editor"
      onSubmit={(event) => {
        event.preventDefault();
        setSaving(true);
        setStatus(null);
        void updateLibraryTrackTags({
          trackId,
          title,
          artist,
          album,
          albumArtist,
          genre,
          year: year.trim() ? Number(year) : null,
          trackNumber: trackNumber.trim() ? Number(trackNumber) : null,
        })
          .then(async () => {
            setStatus("Tags saved to file and library.");
            await refreshAll();
          })
          .catch((err: unknown) => {
            setStatus(err instanceof Error ? err.message : String(err));
          })
          .finally(() => setSaving(false));
      }}
    >
      <label className="settings-field">
        <span>Title</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className="settings-field">
        <span>Artist</span>
        <input value={artist} onChange={(e) => setArtist(e.target.value)} />
      </label>
      <label className="settings-field">
        <span>Album</span>
        <input value={album} onChange={(e) => setAlbum(e.target.value)} />
      </label>
      <label className="settings-field">
        <span>Album artist</span>
        <input
          value={albumArtist}
          onChange={(e) => setAlbumArtist(e.target.value)}
        />
      </label>
      <label className="settings-field">
        <span>Genre</span>
        <input value={genre} onChange={(e) => setGenre(e.target.value)} />
      </label>
      <label className="settings-field">
        <span>Year</span>
        <input value={year} onChange={(e) => setYear(e.target.value)} />
      </label>
      <label className="settings-field">
        <span>Track #</span>
        <input
          value={trackNumber}
          onChange={(e) => setTrackNumber(e.target.value)}
        />
      </label>
      <button type="submit" className="button-primary" disabled={saving}>
        {saving ? "Saving…" : "Save tags"}
      </button>
      {status ? <p className="settings-note">{status}</p> : null}
      <p className="muted tag-editor__path">{track.path}</p>
    </form>
  );
}
