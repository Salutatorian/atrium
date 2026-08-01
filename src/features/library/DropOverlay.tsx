import { useLibraryStore } from "../../stores/library-store";

export function DropOverlay() {
  const dropHover = useLibraryStore((s) => s.dropHover);
  if (!dropHover) return null;

  return (
    <div className="drop-overlay" role="status" aria-live="polite">
      <div className="drop-overlay__panel">
        <p className="drop-overlay__title">Drop music to import</p>
        <p className="drop-overlay__detail">
          Files and folders are scanned in the background. Your library updates
          as tracks are found.
        </p>
      </div>
    </div>
  );
}
