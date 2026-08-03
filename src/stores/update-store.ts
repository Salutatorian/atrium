import { create } from "zustand";
import type { UpdateRelease } from "../features/updates/changelog";
import { releaseForVersion } from "../features/updates/changelog";

export type UpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "installing"
  | "ready"
  | "error"
  | "upToDate";

type AvailableUpdate = {
  version: string;
  body: string | null;
  date: string | null;
};

type UpdateState = {
  status: UpdateStatus;
  available: AvailableUpdate | null;
  progress: number | null;
  error: string | null;
  toastDismissed: boolean;
  /** Changelog to show after a successful update relaunch. */
  postUpdateRelease: UpdateRelease | null;
  setStatus: (status: UpdateStatus) => void;
  setAvailable: (available: AvailableUpdate | null) => void;
  setProgress: (progress: number | null) => void;
  setError: (error: string | null) => void;
  dismissToast: () => void;
  clearAvailable: () => void;
  showPostUpdate: (version: string) => void;
  clearPostUpdate: () => void;
};

export const useUpdateStore = create<UpdateState>((set) => ({
  status: "idle",
  available: null,
  progress: null,
  error: null,
  toastDismissed: false,
  postUpdateRelease: null,
  setStatus: (status) => set({ status }),
  setAvailable: (available) =>
    set({ available, toastDismissed: false, status: available ? "available" : "upToDate" }),
  setProgress: (progress) => set({ progress }),
  setError: (error) => set({ error, status: error ? "error" : "idle" }),
  dismissToast: () => set({ toastDismissed: true }),
  clearAvailable: () =>
    set({ available: null, progress: null, status: "idle", toastDismissed: false }),
  showPostUpdate: (version) =>
    set({ postUpdateRelease: releaseForVersion(version) }),
  clearPostUpdate: () => set({ postUpdateRelease: null }),
}));
