/** Formats playback position/duration. Uses H:MM:SS once past one hour. */
export function formatPlaybackTime(ms?: number | null): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const sec = seconds.toString().padStart(2, "0");
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${sec}`;
  }
  return `${minutes}:${sec}`;
}
