import { useLibraryStore } from "../../stores/library-store";

export function DropOverlay() {
  const dropHover = useLibraryStore((s) => s.dropHover);
  if (!dropHover) return null;

  return (
    <div className="drop-overlay" role="status" aria-live="polite">
      <div className="drop-overlay__panel">
        <p className="drop-overlay__title">Drop music to add</p>
        <p className="drop-overlay__detail">
          Folders and files are indexed where they are — nothing is copied. Your
          library updates as tracks are found.
        </p>
      </div>
    </div>
  );
}
