import type { ReactNode } from "react";

type IconProps = {
  className?: string;
  title?: string;
};

export function IconHome(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
    </Svg>
  );
}

export function IconSongs(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
      <path d="M11.5 15.5V6.8l8-1.6v8.8" />
      <path d="M17.5 16.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
    </Svg>
  );
}

export function IconAlbums(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <circle cx="12" cy="12" r="3.5" />
    </Svg>
  );
}

export function IconArtists(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 19.5c1.5-3.2 3.8-4.8 7-4.8s5.5 1.6 7 4.8" />
    </Svg>
  );
}

export function IconFolders(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 7.5A2 2 0 0 1 5.5 5.5h3.2l1.6 2H18.5a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-10Z" />
    </Svg>
  );
}

export function IconPlaylists(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 7h14M5 12h10M5 17h8" />
      <circle cx="18" cy="16" r="2.5" />
      <path d="M18 13.5V9l3-1" />
    </Svg>
  );
}

export function IconSpark(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.5 13.4 9l5.1 1.4-5.1 1.4L12 17.5 10.6 11.8 5.5 10.4 10.6 9 12 3.5Z" />
    </Svg>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function IconRecent(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v5l3 2" />
    </Svg>
  );
}

export function IconHeart(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 19s-6.5-4.2-8.5-8A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8.5 4c-2 3.8-8.5 8-8.5 8Z" />
    </Svg>
  );
}

export function IconHistory(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 12a7 7 0 1 0 2-4.9" />
      <path d="M5 5v4h4M12 8v4l2.5 1.5" />
    </Svg>
  );
}

export function IconTheme(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 1 0 16V4Z" />
    </Svg>
  );
}

export function IconSettings(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18" />
    </Svg>
  );
}

export function IconCollapse(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14 6 8 12l6 6" />
    </Svg>
  );
}

export function IconExpand(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 6l6 6-6 6" />
    </Svg>
  );
}

function Svg({
  children,
  className,
  title,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}
