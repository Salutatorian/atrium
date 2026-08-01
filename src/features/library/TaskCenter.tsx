import {
  cancelLibraryScan,
  pauseLibraryScan,
  resumeLibraryScan,
} from "./api";
import { useLibraryStore } from "../../stores/library-store";

function statusLabel(status: string): string {
  switch (status) {
    case "preparing":
      return "Preparing";
    case "discovering":
      return "Discovering files";
    case "reading_metadata":
      return "Reading metadata";
    case "saving_library":
      return "Saving library";
    case "paused":
      return "Paused";
    case "cancelled":
      return "Cancelled";
    case "complete":
      return "Complete";
    case "completed_with_errors":
      return "Completed with errors";
    default:
      return status;
  }
}

export function TaskCenter() {
  const scanEvents = useLibraryStore((s) => s.scanEvents);
  const dismissScanEvent = useLibraryStore((s) => s.dismissScanEvent);
  const jobs = Object.values(scanEvents)
    .filter(
      (job) =>
        !["complete", "cancelled", "completed_with_errors"].includes(job.status) ||
        job.processed > 0,
    )
    .sort((a, b) => b.jobId.localeCompare(a.jobId))
    .slice(0, 3);

  if (jobs.length === 0) return null;

  return (
    <div className="task-center" aria-live="polite">
      {jobs.map((job) => {
        const pct =
          job.discovered > 0
            ? Math.min(100, Math.round((job.processed / job.discovered) * 100))
            : 0;
        const finished = ["complete", "cancelled", "completed_with_errors"].includes(
          job.status,
        );

        return (
          <div key={job.jobId} className="task-card">
            <div className="task-card__header">
              <strong>{statusLabel(job.status)}</strong>
              <div className="task-card__header-end">
                <span>
                  {job.processed}/{job.discovered}
                  {job.errors > 0 ? ` · ${job.errors} errors` : ""}
                </span>
                <button
                  type="button"
                  className="task-card__dismiss"
                  aria-label={finished ? "Dismiss" : "Dismiss notification"}
                  title="Dismiss"
                  onClick={() => {
                    if (!finished) {
                      void cancelLibraryScan(job.jobId);
                    }
                    dismissScanEvent(job.jobId);
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="task-card__bar" aria-hidden="true">
              <div className="task-card__fill" style={{ width: `${pct}%` }} />
            </div>
            {job.currentPath || job.message ? (
              <p className="task-card__path">{job.message || job.currentPath}</p>
            ) : null}
            {!finished ? (
              <div className="task-card__actions">
                {job.status === "paused" ? (
                  <button
                    type="button"
                    onClick={() => void resumeLibraryScan(job.jobId)}
                  >
                    Resume
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void pauseLibraryScan(job.jobId)}
                  >
                    Pause
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void cancelLibraryScan(job.jobId)}
                >
                  Cancel
                </button>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
