import { useEffect, useState } from "react";
import { artworkSrc } from "./api";

type ArtworkImageProps = {
  cacheKey?: string | null;
  alt: string;
  className?: string;
};

export function ArtworkImage({ cacheKey, alt, className }: ArtworkImageProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void artworkSrc(cacheKey).then((value) => {
      if (!cancelled) setSrc(value);
    });
    return () => {
      cancelled = true;
    };
  }, [cacheKey]);

  if (!src) {
    return <div className={className} aria-hidden="true" />;
  }

  return <img className={className} src={src} alt={alt} loading="lazy" />;
}
