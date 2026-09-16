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
  /** Settings sits apart from the working areas, at the foot of the sidebar. */
  footer?: boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'grid', description: 'Workspace summary and next steps' },
  { label: 'Leads', href: '/leads', icon: 'users', description: 'People AIBOT should call' },
  { label: 'AI Agents', href: '/agents', icon: 'bot', description: 'Voice agents that represent you' },
  { label: 'Campaigns', href: '/campaigns', icon: 'megaphone', description: 'Outbound calling runs' },
  { label: 'Calls', href: '/calls', icon: 'phone', description: 'Call history and outcomes' },
  { label: 'Follow-ups', href: '/follow-ups', icon: 'clock', description: 'What is queued after a call' },
  { label: 'WhatsApp', href: '/whatsapp', icon: 'message', description: 'Message previews and delivery' },
  { label: 'Analytics', href: '/analytics', icon: 'chart', description: 'Outreach performance' },
  { label: 'Settings', href: '/settings', icon: 'settings', description: 'Workspace configuration', footer: true },
] as const;

export const MAIN_NAV = NAV_ITEMS.filter((item) => !item.footer);
export const FOOTER_NAV = NAV_ITEMS.filter((item) => item.footer);

/**
 * Resolve the nav entry for a pathname. Matches nested routes (`/leads/123`)
 * against their section so detail pages keep the correct item highlighted.
 */
export function findNavItem(pathname: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
}
