import { useEffect, useState } from "react";
import { defaultSettings } from "../features/settings/schema";
import { fetchAppInfo, fetchSettings, isTauriRuntime } from "../services/tauri";
import { useSettingsStore } from "../stores/settings-store";
import { useShellStore } from "../stores/shell-store";
import { useThemeStore } from "../stores/theme-store";

export function useAppBootstrap() {
  const hydrate = useSettingsStore((s) => s.hydrate);
  const setThemeById = useThemeStore((s) => s.setThemeById);
  const applyTheme = useThemeStore((s) => s.applyToDocument);
  const setSidebarExpanded = useShellStore((s) => s.setSidebarExpanded);
  const setInspectorOpen = useShellStore((s) => s.setInspectorOpen);
  const setInspectorWidth = useShellStore((s) => s.setInspectorWidth);
  const [ready, setReady] = useState(false);
  const [appName, setAppName] = useState("Atrium");

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const info = await fetchAppInfo();
        if (!cancelled) setAppName(info.name);

        const settings = isTauriRuntime()
          ? await fetchSettings()
          : defaultSettings;

        if (cancelled) return;

        hydrate(settings);
        setThemeById(settings.appearance.themeId);
        setSidebarExpanded(settings.appearance.sidebarExpanded);
        setInspectorOpen(settings.appearance.inspectorOpen);
        setInspectorWidth(settings.appearance.inspectorWidth);
        applyTheme();
      } catch {
        if (!cancelled) {
          hydrate(defaultSettings);
          setThemeById(defaultSettings.appearance.themeId);
          applyTheme();
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [
    applyTheme,
    hydrate,
    setInspectorOpen,
    setInspectorWidth,
    setSidebarExpanded,
    setThemeById,
  ]);

  return { ready, appName };
}
