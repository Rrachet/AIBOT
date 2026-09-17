import type { IconName } from '@/components/icons';

/**
 * Product areas, grouped the way someone thinks about their day rather than
 * the way the routes happen to be laid out.
 *
 * This is the single source of truth for navigation: the sidebar, the mobile
 * drawer and the topbar breadcrumb all read from it, so a route can never be
 * present in one and missing from another.
 */
export interface NavItem {
  label: string;
  href: string;
  icon: IconName;
  /** Short description used by the mobile drawer and the 404 page. */
  description: string;
}

export interface NavGroup {
  /** Section heading in the sidebar. */
  label: string;
  items: readonly NavItem[];
  /** Sits apart at the foot of the sidebar. */
  footer?: boolean;
}

export const NAV_GROUPS: readonly NavGroup[] = [
  {
    label: 'Workspace',
    items: [
      {
        label: 'Overview',
        href: '/dashboard',
        icon: 'grid',
        description: 'What happened, and what needs you',
      },
      { label: 'Leads', href: '/leads', icon: 'users', description: 'People AIBOT should call' },
      { label: 'Agents', href: '/agents', icon: 'bot', description: 'The AI callers on your team' },
      {
        label: 'Campaigns',
        href: '/campaigns',
        icon: 'megaphone',
        description: 'Turn a lead list into a workflow',
      },
    ],
  },
  {
    label: 'Conversations',
    items: [
      { label: 'Calls', href: '/calls', icon: 'phone', description: 'Transcripts and outcomes' },
      {
        label: 'Follow-ups',
        href: '/follow-ups',
        icon: 'clock',
        description: 'What is queued after a call',
      },
      {
        label: 'WhatsApp',
        href: '/whatsapp',
        icon: 'message',
        description: 'Messages, as they would arrive',
      },
    ],
  },
  {
    label: 'Insights',
    items: [
      {
        label: 'Analytics',
        href: '/analytics',
        icon: 'chart',
        description: 'Whether any of it is working',
      },
    ],
  },
  {
    label: 'Setup',
    footer: true,
    items: [
      {
        label: 'Settings',
        href: '/settings',
        icon: 'settings',
        description: 'Workspace configuration',
      },
    ],
  },
];

export const NAV_ITEMS: readonly NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

export const MAIN_GROUPS = NAV_GROUPS.filter((group) => !group.footer);
export const FOOTER_GROUPS = NAV_GROUPS.filter((group) => group.footer);

/**
 * Resolve the nav entry for a pathname. Matches nested routes (`/leads/123`)
 * against their section so detail pages keep the correct item highlighted.
 */
export function findNavItem(pathname: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
}
