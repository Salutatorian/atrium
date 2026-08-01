import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCallback } from "react";
import { isTauriRuntime } from "../../services/tauri";
import { useSettingsStore } from "../../stores/settings-store";

export function TitleBar() {
  const closeToTray = useSettingsStore((s) => s.settings.general.closeToTray);
  const runWindow = useCallback(async (action: "minimize" | "toggleMaximize" | "close") => {
    if (!isTauriRuntime()) return;
    const win = getCurrentWindow();
    switch (action) {
      case "minimize":
        await win.minimize();
        break;
      case "toggleMaximize":
        await win.toggleMaximize();
        break;
      case "close":
        // Rust intercepts CloseRequested when close-to-tray is on.
        await win.close();
        break;
      default: {
        const _exhaustive: never = action;
        return _exhaustive;
      }
    }
  }, []);

  return (
    <header className="titlebar">
      <div className="titlebar__drag" data-tauri-drag-region>
        <span className="titlebar__brand" data-tauri-drag-region>
          Atrium
        </span>
      </div>
      <div className="titlebar__controls">
        <button
          type="button"
          className="titlebar__btn"
          aria-label="Minimize"
          onClick={() => {
            void runWindow("minimize");
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
            <path fill="currentColor" d="M2 6h8v1H2z" />
          </svg>
        </button>
        <button
          type="button"
          className="titlebar__btn"
          aria-label="Maximize"
          onClick={() => {
            void runWindow("toggleMaximize");
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              d="M2.5 2.5h7v7h-7z"
            />
          </svg>
        </button>
        <button
          type="button"
          className="titlebar__btn titlebar__btn--close"
          aria-label={closeToTray ? "Close to tray" : "Quit"}
          title={closeToTray ? "Close to system tray" : "Quit Atrium"}
          onClick={() => {
            void runWindow("close");
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
            <path
              fill="currentColor"
              d="M2.8 2.1 6 5.3l3.2-3.2.7.7L6.7 6l3.2 3.2-.7.7L6 6.7 2.8 9.9l-.7-.7L5.3 6 2.1 2.8z"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}
