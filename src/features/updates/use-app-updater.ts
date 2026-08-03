import { useEffect } from "react";
import { isTauriRuntime } from "../../services/tauri";
import { useSettingsStore } from "../../stores/settings-store";
import { useUpdateStore } from "../../stores/update-store";
import {
  checkForAppUpdate,
  consumePendingUpdate,
  hasSignedUpdatePending,
  installAvailableUpdate,
} from "./update-service";

/** Boot: show post-update notes, then check / auto-install when enabled. */
export function useAppUpdater() {
  const hydrated = useSettingsStore((s) => s.hydrated);
  const checkForUpdates = useSettingsStore(
    (s) => s.settings.general.checkForUpdates,
  );
  const autoInstallUpdates = useSettingsStore(
    (s) => s.settings.general.autoInstallUpdates,
  );
  const showPostUpdate = useUpdateStore((s) => s.showPostUpdate);

  useEffect(() => {
    const pending = consumePendingUpdate();
    if (pending) showPostUpdate(pending);
  }, [showPostUpdate]);

  useEffect(() => {
    if (!hydrated || !isTauriRuntime() || !checkForUpdates) return;
    let cancelled = false;

    void (async () => {
      const found = await checkForAppUpdate();
      if (cancelled || !found) return;

      // Quiet install only when signed updater artifacts are available.
      // Otherwise keep the bottom-right Update / Cancel toast.
      if (autoInstallUpdates && hasSignedUpdatePending()) {
        useUpdateStore.setState({ toastDismissed: true });
        try {
          await installAvailableUpdate();
        } catch {
          useUpdateStore.setState({ toastDismissed: false });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, checkForUpdates, autoInstallUpdates]);
}
