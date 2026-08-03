import { UPDATE_KIND_LABEL, type UpdateRelease } from "./changelog";
import { useUpdateStore } from "../../stores/update-store";
import { cn } from "../../utils/cn";

export function PostUpdateDialog() {
  const release = useUpdateStore((s) => s.postUpdateRelease);
  const clearPostUpdate = useUpdateStore((s) => s.clearPostUpdate);

  if (!release) return null;

  return (
    <div className="post-update" role="dialog" aria-label="What's new">
      <div className="post-update__card">
        <header className="post-update__header">
          <p className="post-update__eyebrow">Updated to v{release.version}</p>
          <h2 className="post-update__title">{release.title}</h2>
          <p className="post-update__summary">{release.summary}</p>
        </header>
        <ReleaseChanges release={release} />
        <footer className="post-update__footer">
          <button
            type="button"
            className="button-primary"
            onClick={() => clearPostUpdate()}
          >
            Got it
          </button>
        </footer>
      </div>
    </div>
  );
}

function ReleaseChanges({ release }: { release: UpdateRelease }) {
  return (
    <ul className="updates-list post-update__list">
      {release.changes.map((change, index) => (
        <li key={`${release.id}-${index}`} className="updates-list__item">
          <span
            className={cn("updates-kind", `updates-kind--${change.kind}`)}
          >
            {UPDATE_KIND_LABEL[change.kind]}
          </span>
          <span className="updates-list__text">{change.text}</span>
        </li>
      ))}
    </ul>
  );
}
