import type { ReactNode } from 'react';
import { AppShell } from '@/components/app-shell';

/**
 * Chrome for every signed-in screen.
 *
 * The shell used to be rendered by each page through `SectionPage`, which
 * meant navigating from Leads to Calls tore down the sidebar, the topbar and
 * Zemo and built them again. That is wasteful, it flashes, and it made a
 * guided tour impossible: the thing running the tour was destroyed by the
 * first step that changed route.
 *
 * As a layout it is mounted once and survives navigation, so Zemo keeps its
 * conversation and its place in the tour while the page underneath changes.
 *
 * This is a route group, so the URLs are unchanged — `/dashboard` is still
 * `/dashboard`. Authorisation is untouched: every page below still calls
 * `requireUser`, and `src/proxy.ts` still gates the routes. A layout is not a
 * permission boundary and nothing here treats it as one.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
