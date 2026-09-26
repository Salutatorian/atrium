import { playlistCoverSrc } from "./api";
import { cn } from "../../utils/cn";

type PlaylistCoverProps = {
  name: string;
  coverPath?: string | null;
  updatedAt?: string;
  className?: string;
};

export function PlaylistCover({
  name,
  coverPath,
  updatedAt,
  className,
}: PlaylistCoverProps) {
  const letter = (name.trim().charAt(0) || "P").toUpperCase();
  const src = playlistCoverSrc(coverPath);
  const photo = src
    ? `${src}${src.includes("?") ? "&" : "?"}v=${encodeURIComponent(updatedAt || coverPath || "")}`
    : null;

  if (photo) {
    return (
      <img
        className={cn("playlist-landing__cover playlist-landing__cover--photo", className)}
        src={photo}
        alt=""
      />
    );
  }

  return (
    <span className={cn("playlist-landing__cover", className)} aria-hidden>
      {letter}
    </span>
  );
}
