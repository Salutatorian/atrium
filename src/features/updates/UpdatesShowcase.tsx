import { useState } from "react";
import {
  latestRelease,
  UPDATE_KIND_LABEL,
  UPDATE_RELEASES,
  type UpdateKind,
  type UpdateRelease,
} from "./changelog";
import { cn } from "../../utils/cn";

type UpdatesShowcaseProps = {
  /** Kept for callers; Settings always shows the full notes panel. */
  forceShow?: boolean;
};

/** Release notes panel — used in Settings → About. */
export function UpdatesShowcase(_props: UpdatesShowcaseProps = {}) {
  const latest = latestRelease();
  const [expanded, setExpanded] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);

  if (!latest) return null;

  const visible: UpdateRelease[] = historyOpen ? UPDATE_RELEASES : [latest];

  return (
    <section
      className="updates-showcase updates-showcase--settings"
      aria-label="What's new"
    >
      <header className="updates-showcase__header">
        <div>
          <p className="updates-showcase__eyebrow">Release notes</p>
          <h3 className="updates-showcase__title">{latest.title}</h3>
          <p className="updates-showcase__summary">{latest.summary}</p>
        </div>
        <div className="updates-showcase__meta">
          <span className="updates-showcase__version">v{latest.version}</span>
        </div>
      </header>

      {visible.map((release) => (
        <article key={release.id} className="updates-release">
          {historyOpen && release.id !== latest.id ? (
            <h4 className="updates-release__title">
              {release.title}
              <span className="updates-release__date">{release.date}</span>
            </h4>
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
        {UPDATE_RELEASES.length > 1 && !historyOpen ? (
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setHistoryOpen(true);
              setExpanded(true);
            }}
          >
            Earlier updates
          </button>
        ) : null}
        {historyOpen ? (
          <button
            type="button"
            className="text-button"
            onClick={() => setHistoryOpen(false)}
          >
            Show latest only
          </button>
        ) : null}
      </div>
    </section>
  );
}
