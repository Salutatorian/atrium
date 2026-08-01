import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { DropOverlay } from "../../features/library/DropOverlay";
import { SingleFilePromptDialog } from "../../features/library/SingleFilePrompt";
import { TaskCenter } from "../../features/library/TaskCenter";
import { useLibraryEvents } from "../../hooks/use-library-events";
import { useMediaKeys } from "../../hooks/use-media-keys";
import { usePlayerEvents } from "../../hooks/use-player-events";
import { useReducedMotion } from "../../hooks/use-reduced-motion";
import { useSettingsStore } from "../../stores/settings-store";
import { cn } from "../../utils/cn";
import { Inspector } from "./Inspector";
import { NavRail } from "./NavRail";
import { PlayerBar } from "./PlayerBar";
import { Workspace } from "./Workspace";

type AppShellProps = {
  appName: string;
};

export function AppShell({ appName }: AppShellProps) {
  const reducedMotion = useReducedMotion();
  const density = useSettingsStore((s) => s.settings.appearance.density);
  useLibraryEvents();
  usePlayerEvents();
  useMediaKeys();

  return (
    <TooltipPrimitive.Provider>
      <div
        className={cn(
          "app-shell",
          `density-${density}`,
          reducedMotion && "reduce-motion",
        )}
        data-app={appName}
      >
        <div className="app-atmosphere" aria-hidden="true">
          <div className="app-atmosphere__wash" />
          <div className="app-atmosphere__grain" />
          <div className="app-atmosphere__vignette" />
        </div>

        <a className="skip-link" href="#main-content">
          Skip to content
        </a>

        <div className="app-shell__layout">
          <NavRail />
          <div className="app-shell__center">
            <Workspace />
            <Inspector />
          </div>
        </div>

        <TaskCenter />
        <PlayerBar reducedMotion={reducedMotion} />
        <DropOverlay />
        <SingleFilePromptDialog />
      </div>
    </TooltipPrimitive.Provider>
  );
}
