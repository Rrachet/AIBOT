import type { ReactNode, SVGProps } from 'react';

/**
 * Single source of truth for iconography.
 *
 * Adding an icon here automatically widens `IconName`, so every consumer is
 * type-checked against the real set — a typo becomes a compile error rather
 * than a silently-wrong glyph.
 */
const ICON_PATHS = {
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  bot: (
    <>
      <rect x="4" y="7" width="16" height="13" rx="3" />
      <path d="M8 7V5a4 4 0 0 1 8 0v2M9 13h.01M15 13h.01M9 17h6" />
    </>
  ),
  phone: (
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 22 16.92z" />
  ),
  megaphone: (
    <>
      <path d="m3 11 18-5v12L3 14z" />
      <path d="M11.6 15.5 13 21H8l-1.5-5.5" />
    </>
  ),
  message: (
    <path d="M21 11.5a8.4 8.4 0 0 1-9 8.5 9.7 9.7 0 0 1-4.2-.9L3 21l1.9-4.1A8.2 8.2 0 0 1 3 11.5 8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z" />
  ),
  chart: (
    <>
      <path d="M4 19V5M4 19h16" />
      <path d="m7 15 3-4 3 2 5-7" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.4 1.4-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1 1.56V21h-2v-.5a1.7 1.7 0 0 0-1.05-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-1.4-1.4.06-.06A1.7 1.7 0 0 0 8.6 15a1.7 1.7 0 0 0-1.56-1H6v-2h1.04A1.7 1.7 0 0 0 8.6 11a1.7 1.7 0 0 0-.34-1.88L8.2 9.06l1.4-1.4.06.06A1.7 1.7 0 0 0 11.54 8a1.7 1.7 0 0 0 1-1.56V6h2v.5A1.7 1.7 0 0 0 15.6 8a1.7 1.7 0 0 0 1.88-.34l.06-.06 1.4 1.4-.06.06A1.7 1.7 0 0 0 18.6 11a1.7 1.7 0 0 0 1.56 1H21v2h-.84a1.7 1.7 0 0 0-.76 1Z" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  upload: (
    <>
      <path d="M12 16V4M8 8l4-4 4 4" />
      <path d="M5 20h14" />
    </>
  ),
  bell: <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M18 6 6 18M6 6l12 12" />,
  check: <path d="m20 6-11 11-5-5" />,
  'check-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  alert: (
    <>
      <path d="M12 9v4" />
      <path d="M10.3 3.9 2.4 17.1A2 2 0 0 0 4.1 20h15.8a2 2 0 0 0 1.7-2.9L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 17h.01" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 4 1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6Z" />
      <path d="M18.5 16.5 19 18l1.5.5L19 19l-.5 1.5L18 19l-1.5-.5L18 18Z" />
    </>
  ),
  play: <path d="M7 4.5v15l12-7.5Z" />,
  filter: <path d="M3 5h18l-7 8v6l-4 2v-8Z" />,
  chevron: <path d="m9 6 6 6-6 6" />,
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  download: (
    <>
      <path d="M12 4v12M8 12l4 4 4-4" />
      <path d="M5 20h14" />
    </>
  ),
  building: (
    <>
      <path d="M4 21V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v15" />
      <path d="M14 10h4a2 2 0 0 1 2 2v9" />
      <path d="M8 8h2M8 12h2M8 16h2M2 21h20" />
    </>
  ),
  mail: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="m2.5 7 9.5 6 9.5-6" />
    </>
  ),
  inbox: (
    <>
      <path d="M3 12h5l1.5 3h5L16 12h5" />
      <path d="M5.5 5h13l2.5 7v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6Z" />
    </>
  ),
  link: (
    <>
      <path d="M10 13a4 4 0 0 0 5.6.4l2.6-2.5a4 4 0 0 0-5.6-5.7L11.2 6.6" />
      <path d="M14 11a4 4 0 0 0-5.6-.4l-2.6 2.5a4 4 0 0 0 5.6 5.7l1.4-1.4" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
} as const satisfies Record<string, ReactNode>;

export type IconName = keyof typeof ICON_PATHS;

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
}

/**
 * Icons are decorative by default: they sit beside a text label almost
 * everywhere, so `aria-hidden` keeps screen readers from announcing them twice.
 * Pass an explicit `aria-label` (and `aria-hidden={false}`) for a standalone icon.
 */
export function Icon({ name, size = 18, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {ICON_PATHS[name]}
    </svg>
  );
}
