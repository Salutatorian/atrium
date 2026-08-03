import { getVersion } from "@tauri-apps/api/app";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { openUrl } from "@tauri-apps/plugin-opener";
import { APP_GITHUB_URL } from "../../app/brand";
import { isTauriRuntime } from "../../services/tauri";
import { useSettingsStore } from "../../stores/settings-store";
import { useUpdateStore } from "../../stores/update-store";

const PENDING_UPDATE_KEY = "atrium.updates.pendingVersion";
const DISMISSED_VERSION_KEY = "atrium.updates.dismissedVersion";

export function markPendingUpdate(version: string) {
  try {
    window.localStorage.setItem(PENDING_UPDATE_KEY, version);
  } catch {
    // ignore
  }
}

export function consumePendingUpdate(): string | null {
  try {
    const version = window.localStorage.getItem(PENDING_UPDATE_KEY);
    if (version) window.localStorage.removeItem(PENDING_UPDATE_KEY);
    return version;
  } catch {
    return null;
  }
}

export function dismissVersion(version: string) {
  try {
    window.localStorage.setItem(DISMISSED_VERSION_KEY, version);
  } catch {
    // ignore
  }
}

function isDismissed(version: string): boolean {
  try {
    return window.localStorage.getItem(DISMISSED_VERSION_KEY) === version;
  } catch {
    return false;
  }
}

function parseGithubTag(tag: string): string {
  return tag.replace(/^v/i, "").trim();
}

function isNewerVersion(remote: string, current: string): boolean {
  const a = remote.split(".").map((n) => Number.parseInt(n, 10) || 0);
  const b = current.split(".").map((n) => Number.parseInt(n, 10) || 0);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    const left = a[i] ?? 0;
    const right = b[i] ?? 0;
    if (left > right) return true;
    if (left < right) return false;
  }
  return false;
}

async function checkGithubFallback(current: string): Promise<{
  version: string;
  body: string | null;
  date: string | null;
  htmlUrl: string;
} | null> {
  const response = await fetch(
    "https://api.github.com/repos/Salutatorian/atrium/releases/latest",
    {
      headers: { Accept: "application/vnd.github+json" },
    },
  );
  if (!response.ok) return null;
  const data = (await response.json()) as {
    tag_name?: string;
    body?: string;
    published_at?: string;
    html_url?: string;
    draft?: boolean;
    prerelease?: boolean;
  };
  if (data.draft || data.prerelease || !data.tag_name) return null;
  const version = parseGithubTag(data.tag_name);
  if (!isNewerVersion(version, current)) return null;
  return {
    version,
    body: data.body ?? null,
    date: data.published_at ?? null,
    htmlUrl: data.html_url ?? `${APP_GITHUB_URL}/releases`,
  };
}

let activeUpdate: Update | null = null;
let fallbackHtmlUrl: string | null = null;

export function hasSignedUpdatePending(): boolean {
  return activeUpdate != null;
}

export async function checkForAppUpdate(options?: {
  force?: boolean;
}): Promise<boolean> {
  if (!isTauriRuntime()) return false;

  const settings = useSettingsStore.getState().settings;
  if (!options?.force && !settings.general.checkForUpdates) return false;

  const store = useUpdateStore.getState();
  store.setStatus("checking");
  store.setError(null);

  try {
    const current = await getVersion();
    const update = await check().catch(() => null);

    if (update) {
      activeUpdate = update;
      fallbackHtmlUrl = null;
      if (isDismissed(update.version) && !options?.force) {
        store.setStatus("idle");
        return false;
      }
      store.setAvailable({
        version: update.version,
        body: update.body ?? null,
        date: update.date ?? null,
      });
      return true;
    }

    // No signed updater manifest yet — still notify via GitHub Releases.
    const fallback = await checkGithubFallback(current).catch(() => null);
    activeUpdate = null;
    if (!fallback) {
      store.setStatus("upToDate");
      store.clearAvailable();
      return false;
    }
    if (isDismissed(fallback.version) && !options?.force) {
      store.setStatus("idle");
      return false;
    }
    fallbackHtmlUrl = fallback.htmlUrl;
    store.setAvailable({
      version: fallback.version,
      body: fallback.body,
      date: fallback.date,
    });
    return true;
  } catch (error) {
    store.setError(
      error instanceof Error ? error.message : "Could not check for updates",
    );
    return false;
  }
}

export async function installAvailableUpdate(): Promise<void> {
  const store = useUpdateStore.getState();
  const available = store.available;
  if (!available) return;

  markPendingUpdate(available.version);

  if (activeUpdate) {
    store.setStatus("downloading");
    store.setProgress(0);
    let downloaded = 0;
    let total: number | null = null;

    await activeUpdate.downloadAndInstall((event) => {
      if (event.event === "Started") {
        total = event.data.contentLength ?? null;
        store.setStatus("downloading");
        return;
      }
      if (event.event === "Progress") {
        downloaded += event.data.chunkLength;
        if (total && total > 0) {
          store.setProgress(Math.min(99, Math.round((downloaded / total) * 100)));
        }
        return;
      }
      if (event.event === "Finished") {
        store.setProgress(100);
        store.setStatus("installing");
      }
    });

    store.setStatus("ready");
    await relaunch();
    return;
  }

  // Fallback: open the GitHub release so the user can install manually.
  const url = fallbackHtmlUrl ?? `${APP_GITHUB_URL}/releases/latest`;
  await openUrl(url);
  store.dismissToast();
}

export function cancelAvailableUpdate() {
  const store = useUpdateStore.getState();
  if (store.available) {
    dismissVersion(store.available.version);
  }
  store.dismissToast();
}
