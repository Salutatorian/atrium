import { useEffect, useMemo, useState } from "react";
import {
  fetchDayScrobbles,
  formatListenDuration,
  type ScrobbleEntry,
} from "./api";

function todayIsoLocal(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatClock(value: string): string {
  const date = new Date(value.includes("T") ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDayLabel(day: string): string {
  const date = new Date(`${day}T12:00:00`);
  if (Number.isNaN(date.getTime())) return day;
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Chronological listen diary for one calendar day — every play, repeats included. */
export function DayListeningDiary() {
  const [day, setDay] = useState(todayIsoLocal);
  const [listens, setListens] = useState<ScrobbleEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchDayScrobbles(day)
      .then((items) => {
        if (cancelled) return;
        setListens(items);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setListens([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [day]);

  const totals = useMemo(() => {
    const listenMs = listens.reduce((sum, item) => sum + item.listenedMs, 0);
    const unique = new Set(
      listens.map(
        (item) =>
          `${item.title.trim().toLowerCase()}|${item.artist.trim().toLowerCase()}`,
      ),
    );
    return { listenMs, unique: unique.size, plays: listens.length };
  }, [listens]);

  return (
    <section className="day-diary" aria-label="Day listens">
      <div className="day-diary__header">
        <div>
          <h2 className="day-diary__title">This day</h2>
          <p className="day-diary__lead">
            Every listen that day — including repeats — so you can remember the
            room as it was.
          </p>
        </div>
        <label className="day-diary__date">
          <span className="sr-only">Pick a date</span>
          <input
            type="date"
            value={day}
            max={todayIsoLocal()}
            onChange={(event) => {
              if (event.target.value) setDay(event.target.value);
            }}
          />
        </label>
      </div>

      <p className="day-diary__summary muted">
        {formatDayLabel(day)}
        {listens.length > 0
          ? ` · ${totals.plays} ${totals.plays === 1 ? "listen" : "listens"} · ${totals.unique} songs · ${formatListenDuration(totals.listenMs)}`
          : null}
      </p>

      {error ? <p className="settings-note">{error}</p> : null}
      {loading ? (
        <p className="empty-panel__detail">Loading…</p>
      ) : listens.length === 0 ? (
        <p className="empty-panel__detail">No listens on this day yet.</p>
      ) : (
        <ol className="day-diary__list">
          {listens.map((item, index) => (
            <li key={item.id}>
              <span className="day-diary__n">{index + 1}</span>
              <div className="stats-rank__meta">
                <strong>{item.title}</strong>
                <span>
                  {item.artist || "Unknown artist"}
                  {item.album ? ` · ${item.album}` : ""}
                </span>
              </div>
              <div className="stats-rank__nums">
                <span>{formatClock(item.playedAt)}</span>
                <span className="muted">
                  {formatListenDuration(item.listenedMs)}
                  {item.completed
                    ? " · done"
                    : item.skipped
                      ? " · skip"
                      : " · partial"}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
