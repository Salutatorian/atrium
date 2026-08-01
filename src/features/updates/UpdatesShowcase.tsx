import { useState } from "react";
import {
  latestRelease,
  readSeenReleaseId,
  UPDATE_KIND_LABEL,
  UPDATE_RELEASES,
  writeSeenReleaseId,
  type UpdateKind,
  type UpdateRelease,
} from "./changelog";
import { cn } from "../../utils/cn";

type UpdatesShowcaseProps = {
  /** When true, expand history even if the latest release was dismissed. */
  forceShow?: boolean;
};

export function UpdatesShowcase({ forceShow = false }: UpdatesShowcaseProps) {
  const latest = latestRelease();
  const [seenId, setSeenId] = useState<string | null>(() => readSeenReleaseId());
  const [expanded, setExpanded] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  if (!latest) return null;

  const isNew = seenId !== latest.id;
  if (!isNew && !forceShow && !historyOpen) {
    return (
      <section className="updates-showcase updates-showcase--quiet" aria-label="Updates">
        <button
          type="button"
          className="text-button"
          onClick={() => {
            setHistoryOpen(true);
            setExpanded(true);
          }}
        >
          What’s new
        </button>
      </section>
    );
  }

  const visible: UpdateRelease[] = historyOpen
    ? UPDATE_RELEASES
    : [latest];

  return (
    <section
      className={cn(
        "updates-showcase",
        isNew && "updates-showcase--new",
      )}
      aria-label="What's new"
    >
      <header className="updates-showcase__header">
        <div>
          <p className="updates-showcase__eyebrow">
            {isNew ? "What’s new" : "Updates"}
          </p>
          <h2 className="updates-showcase__title">{latest.title}</h2>
          <p className="updates-showcase__summary">{latest.summary}</p>
        </div>
        <div className="updates-showcase__meta">
          <span className="updates-showcase__version">v{latest.version}</span>
          {isNew ? (
            <button
              type="button"
              className="text-button"
              onClick={() => {
                writeSeenReleaseId(latest.id);
                setSeenId(latest.id);
                setHistoryOpen(false);
                setExpanded(false);
              }}
            >
              Got it
            </button>
          ) : (
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setHistoryOpen(false);
                setExpanded(false);
              }}
            >
              Hide
            </button>
          )}
        </div>
      </header>

      {visible.map((release) => (
        <article key={release.id} className="updates-release">
          {historyOpen && release.id !== latest.id ? (
            <h3 className="updates-release__title">
              {release.title}
              <span className="updates-release__date">{release.date}</span>
            </h3>
          ) : null}
          <ul className="updates-list">
            {(expanded || release.id !== latest.id
              ? release.changes
              : release.changes.slice(0, 4)
            ).map((change, index) => (
              <li key={`${release.id}-${index}`} className="updates-list__item">
                <span
                  className={cn(
                    "updates-kind",
                    `updates-kind--${change.kind}`,
                  )}
                >
                  {UPDATE_KIND_LABEL[change.kind as UpdateKind]}
                </span>
                <span className="updates-list__text">{change.text}</span>
              </li>
            ))}
          </ul>
        </article>
      ))}

      <div className="updates-showcase__footer">
        {!expanded && latest.changes.length > 4 ? (
          <button
            type="button"
            className="text-button"
            onClick={() => setExpanded(true)}
          >
            Show all changes
          </button>
        ) : null}
        {expanded && UPDATE_RELEASES.length > 1 && !historyOpen ? (
          <button
            type="button"
            className="text-button"
            onClick={() => setHistoryOpen(true)}
          >
            Earlier updates
          </button>
        ) : null}
      </div>
    </section>
  );
}
