import { playPaths } from "../player/api";
import { fileName, startLibraryScan } from "./api";
import { useLibraryStore } from "../../stores/library-store";
import { usePlayerStore } from "../../stores/player-store";

export function SingleFilePromptDialog() {
  const prompt = useLibraryStore((s) => s.singleFilePrompt);
  const setPrompt = useLibraryStore((s) => s.setSingleFilePrompt);
  const applySnapshot = usePlayerStore((s) => s.applySnapshot);

  if (!prompt) return null;

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="single-file-title"
      >
        <h2 id="single-file-title">Import music</h2>
        <p>
          <strong>{fileName(prompt.filePath)}</strong> was dropped. Play it now,
          or add it to your library.
        </p>
        <div className="modal__actions">
          <button
            type="button"
            className="button-primary"
            onClick={() => {
              void playPaths([prompt.filePath]).then(applySnapshot);
              setPrompt(null);
            }}
          >
            Play now
          </button>
          <button
            type="button"
            onClick={() => {
              void startLibraryScan([prompt.filePath]);
              setPrompt(null);
            }}
          >
            Import this file
          </button>
          <button
            type="button"
            onClick={() => {
              void startLibraryScan([prompt.parentFolder]);
              setPrompt(null);
            }}
          >
            Import containing folder
          </button>
          <button type="button" onClick={() => setPrompt(null)}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
