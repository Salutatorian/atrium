import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { DropOverlay } from "../../features/library/DropOverlay";
import { SingleFilePromptDialog } from "../../features/library/SingleFilePrompt";
import { TaskCenter } from "../../features/library/TaskCenter";
import { ImmersiveStage } from "../../features/shell/ImmersiveStage";
import { Atmosphere } from "../../features/themes/Atmosphere";
import { useListeningRecorder } from "../../features/listening/use-listening-recorder";
import { useLibraryEvents } from "../../hooks/use-library-events";
import { useMediaKeys } from "../../hooks/use-media-keys";
import { usePlayerEvents } from "../../hooks/use-player-events";
import { useReducedMotion } from "../../hooks/use-reduced-motion";
import { useShellModeKeys } from "../../hooks/use-shell-mode-keys";
import { useSystemTheme } from "../../hooks/use-system-theme";
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
  const shellMode = useSettingsStore((s) => s.settings.appearance.shellMode);
  useLibraryEvents();
  usePlayerEvents();
  useListeningRecorder();
  useMediaKeys();
  useSystemTheme();
  useShellModeKeys();

  const mini = shellMode === "mini";
  const immersive = shellMode === "immersive";

  return (
    <TooltipPrimitive.Provider>
      <div
        className={cn(
          "app-shell",
          `density-${density}`,
          `shell-mode-${shellMode}`,
          reducedMotion && "reduce-motion",
        )}
        data-app={appName}
        data-shell-mode={shellMode}
      >
        <Atmosphere />

        <a className="skip-link" href="#main-content">
          Skip to content
        </a>

        {mini ? null : immersive ? (
          <ImmersiveStage />
        ) : (
          <div className="app-shell__layout">
            <NavRail />
            <div className="app-shell__center">
              <Workspace />
              <Inspector />
            </div>
          </div>
        )}

        {mini || immersive ? null : <TaskCenter />}
        <PlayerBar reducedMotion={reducedMotion} />
        {mini || immersive ? null : (
          <>
            <DropOverlay />
            <SingleFilePromptDialog />
          </>
        )}
      </div>
    </TooltipPrimitive.Provider>
  );
}
