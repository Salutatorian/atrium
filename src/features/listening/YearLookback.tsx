import { useEffect, useMemo, useState } from "react";
import {
  fetchYearStory,
  formatListenDuration,
  type YearStory,
} from "./api";
import { cn } from "../../utils/cn";

type YearLookbackProps = {
  year: number;
  onClose: () => void;
};

type Slide = {
  id: string;
  kicker: string;
  title: string;
  body?: string;
  detail?: string;
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function formatDay(day: string): string {
  const date = new Date(`${day}T12:00:00`);
  if (Number.isNaN(date.getTime())) return day;
  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
  });
}

function quietestMonth(story: YearStory): string | null {
  if (story.months.length === 0) return null;
  const filled = new Map(story.months.map((m) => [m.month, m.totalListenMs]));
  let quietest = 1;
  let lowest = Number.POSITIVE_INFINITY;
  for (let month = 1; month <= 12; month += 1) {
    const ms = filled.get(month) ?? 0;
    if (ms < lowest) {
      lowest = ms;
      quietest = month;
    }
  }
  return MONTHS[quietest - 1] ?? null;
}

function buildSlides(story: YearStory): Slide[] {
  const slides: Slide[] = [
    {
      id: "open",
      kicker: `${story.year}`,
      title: "A year in this room",
      body: "No percentiles. No neon. Just the music that lived with you.",
    },
    {
      id: "time",
      kicker: "Time kept",
      title: formatListenDuration(story.totalListenMs),
      body: `${story.totalScrobbles} listens across ${story.uniqueTracks} songs and ${story.uniqueArtists} artists.`,
    },
  ];

  if (story.unfinishedListens > 0) {
    slides.push({
      id: "unfinished",
      kicker: "Unfinished, still counted",
      title: String(story.unfinishedListens),
      body: "Songs you left mid-way still shaped the year. Atrium keeps the partial listens too.",
    });
  }

  if (story.firstListen) {
    slides.push({
      id: "first",
      kicker: "First note of the year",
      title: story.firstListen.title,
      body: story.firstListen.artist || "Unknown artist",
      detail: story.firstListen.playedAt,
    });
  }

  if (story.deepestDay) {
    slides.push({
      id: "deep",
      kicker: "Deepest day",
      title: formatDay(story.deepestDay.day),
      body: `${formatListenDuration(story.deepestDay.totalListenMs)} · ${story.deepestDay.scrobbles} listens`,
      detail: "The day the room stayed lit the longest.",
    });
  }

  const topTrack = story.topTracks[0];
  if (topTrack) {
    slides.push({
      id: "song",
      kicker: "Most lived-in song",
      title: topTrack.title,
      body: topTrack.artist || "Unknown artist",
      detail: `${topTrack.playCount} plays · ${formatListenDuration(topTrack.totalListenMs)}`,
    });
  }

  const topArtist = story.topArtists[0];
  if (topArtist) {
    slides.push({
      id: "artist",
      kicker: "Companions",
      title: topArtist.artist,
      body: `${topArtist.trackCount} songs · ${formatListenDuration(topArtist.totalListenMs)}`,
    });
  }

  if (story.topTracks.length > 1) {
    slides.push({
      id: "shelf",
      kicker: "Shelf marks",
      title: "Your five most revisited",
      body: story.topTracks
        .map((t, i) => `${i + 1}. ${t.title}${t.artist ? ` — ${t.artist}` : ""}`)
        .join("\n"),
    });
  }

  const quiet = quietestMonth(story);
  if (quiet) {
    slides.push({
      id: "quiet",
      kicker: "Softest month",
      title: quiet,
      body: "Even the quiet months leave a shape.",
    });
  }

  if (story.lastListen) {
    slides.push({
      id: "last",
      kicker: "Last note of the year",
      title: story.lastListen.title,
      body: story.lastListen.artist || "Unknown artist",
      detail: story.lastListen.playedAt,
    });
  }

  slides.push({
    id: "close",
    kicker: "Atrium",
    title: "Thanks for the year.",
    body: "Your music stayed on your shelves. The year stayed in this room.",
  });

  return slides;
}

export function isYearLookbackSeason(now = new Date()): boolean {
  // Silent window: Jan 1 through Jan 7 only.
  return now.getMonth() === 0 && now.getDate() <= 7;
}

/** Year the January lookback tells — always the year that just ended. */
export function yearLookbackTargetYear(now = new Date()): number {
  return now.getFullYear() - 1;
}

function lookbackSeenKey(year: number): string {
  return `atrium.lookback.seen.${year}`;
}

export function hasSeenYearLookback(year: number): boolean {
  try {
    return localStorage.getItem(lookbackSeenKey(year)) === "1";
  } catch {
    return false;
  }
}

export function markYearLookbackSeen(year: number): void {
  try {
    localStorage.setItem(lookbackSeenKey(year), "1");
  } catch {
    // Ignore quota / private mode.
  }
}

export function YearLookback({ year, onClose }: YearLookbackProps) {
  const [story, setStory] = useState<YearStory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void fetchYearStory(year)
      .then((data) => {
        if (cancelled) return;
        setStory(data);
        setError(null);
        setIndex(0);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [year]);

  const slides = useMemo(() => (story ? buildSlides(story) : []), [story]);
  const slide = slides[index];
  const empty = story && story.totalScrobbles === 0;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (!slides.length) return;
      if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        setIndex((i) => Math.min(slides.length - 1, i + 1));
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, slides.length]);

  return (
    <div className="year-lookback" role="dialog" aria-label={`${year} lookback`}>
      <button
        type="button"
        className="year-lookback__close"
        aria-label="Close lookback"
        onClick={onClose}
      >
        Close
      </button>

      {error ? <p className="year-lookback__error">{error}</p> : null}

      {!story && !error ? (
        <p className="year-lookback__loading">Gathering the year…</p>
      ) : null}

      {empty ? (
        <div className="year-lookback__slide">
          <p className="year-lookback__kicker">{year}</p>
          <h2 className="year-lookback__title">Nothing filed yet</h2>
          <p className="year-lookback__body">
            Play a few songs — unfinished ones count too — and the room will
            remember.
          </p>
        </div>
      ) : null}

      {slide && !empty ? (
        <button
          type="button"
          className="year-lookback__stage"
          onClick={() => setIndex((i) => Math.min(slides.length - 1, i + 1))}
        >
          <div
            key={slide.id}
            className={cn("year-lookback__slide", `year-lookback__slide--${slide.id}`)}
          >
            <p className="year-lookback__kicker">{slide.kicker}</p>
            <h2 className="year-lookback__title">{slide.title}</h2>
            {slide.body ? (
              <p className="year-lookback__body">{slide.body}</p>
            ) : null}
            {slide.detail ? (
              <p className="year-lookback__detail">{slide.detail}</p>
            ) : null}
          </div>
        </button>
      ) : null}

      {slides.length > 0 && !empty ? (
        <div className="year-lookback__footer">
          <div className="year-lookback__dots" aria-hidden>
            {slides.map((item, i) => (
              <span
                key={item.id}
                className={cn(
                  "year-lookback__dot",
                  i === index && "year-lookback__dot--active",
                )}
              />
            ))}
          </div>
          <div className="year-lookback__nav">
            <button
              type="button"
              className="text-button"
              disabled={index === 0}
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
            >
              Back
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                if (index >= slides.length - 1) onClose();
                else setIndex((i) => i + 1);
              }}
            >
              {index >= slides.length - 1 ? "Done" : "Next"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
