import { BrandLogo } from "../../app/shell/BrandLogo";
import { useUpdateStore } from "../../stores/update-store";
import {
  cancelAvailableUpdate,
  installAvailableUpdate,
} from "./update-service";
import { cn } from "../../utils/cn";

export function UpdateToast() {
  const available = useUpdateStore((s) => s.available);
  const status = useUpdateStore((s) => s.status);
  const progress = useUpdateStore((s) => s.progress);
  const toastDismissed = useUpdateStore((s) => s.toastDismissed);

  if (!available || toastDismissed) return null;

  const busy = status === "downloading" || status === "installing";

  return (
    <div
      className={cn("update-toast", busy && "update-toast--busy")}
      role="status"
      aria-live="polite"
    >
      <BrandLogo size="sm" className="update-toast__logo" />
      <div className="update-toast__copy">
        <p className="update-toast__title">
          {busy ? "Updating…" : `Update available · v${available.version}`}
        </p>
        <p className="update-toast__detail muted">
          {busy
            ? progress != null
              ? `Downloading ${progress}% — the app may restart when finished.`
              : "Installing — the app may restart when finished."
            : "Install now, or cancel to stay on this version."}
        </p>
      </div>
      {!busy ? (
        <div className="update-toast__actions">
          <button
            type="button"
            className="button-primary"
            onClick={() => {
              void installAvailableUpdate();
            }}
          >
            Update
          </button>
          <button
            type="button"
            className="text-button"
            onClick={() => cancelAvailableUpdate()}
          >
            Cancel
          </button>
        </div>
      ) : null}
    </div>
  );
}
