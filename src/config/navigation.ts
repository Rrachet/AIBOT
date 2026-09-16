import type { IconName } from '@/components/icons';

/**
 * Product areas, in sidebar order.
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
  /**
   * True once this area reads real workspace data instead of sample records.
   * The topbar's "Sample figures" pill shows on every route without it, so the
   * flag must only be set once the area genuinely reads from the database —
   * setting it early would hide the one warning that the numbers are made up.
   */
  live?: boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Overview', href: '/', icon: 'grid', description: 'Workspace summary and next steps' },
  { label: 'Leads', href: '/leads', icon: 'users', description: 'People AIBOT should call', live: true },
  { label: 'AI Agents', href: '/agents', icon: 'bot', description: 'Voice agents that represent you', live: true },
  { label: 'Campaigns', href: '/campaigns', icon: 'megaphone', description: 'Outbound calling runs', live: true },
  { label: 'Calls', href: '/calls', icon: 'phone', description: 'Call history and outcomes', live: true },
  { label: 'WhatsApp', href: '/whatsapp', icon: 'message', description: 'Follow-up channel', live: true },
  { label: 'Analytics', href: '/analytics', icon: 'chart', description: 'Outreach performance' },
  { label: 'Settings', href: '/settings', icon: 'settings', description: 'Workspace configuration' },
] as const;

/**
 * Resolve the nav entry for a pathname. Matches nested routes (`/leads/123`)
 * against their section so detail pages keep the correct item highlighted.
 */
export function findNavItem(pathname: string): NavItem | undefined {
  if (pathname === '/') return NAV_ITEMS[0];
  return NAV_ITEMS.find((item) => item.href !== '/' && pathname.startsWith(item.href));
}
