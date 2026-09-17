'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from './icons';
import { ThemeSwitcher } from './theme/theme-switcher';
import { ZemoWidget } from './zemo/zemo-widget';
import { FOOTER_GROUPS, MAIN_GROUPS, findNavItem, type NavGroup } from '@/config/navigation';
import { WorkspaceProvider } from './workspace-context';
import { fetchWorkspace, workspaceInitial, type WorkspaceIdentity } from '@/lib/workspace';

/**
 * Application chrome: sidebar, topbar, mobile drawer and Zemo.
 *
 * The sidebar is grouped the way the work is — what you own, what was said,
 * what it added up to — rather than as one flat list of routes. The active
 * item is derived from the pathname rather than passed in by each page, so
 * navigation state can never drift out of sync with the route. Pages stay
 * server components; they come through as `children`.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const current = findNavItem(pathname);
  const workspace = useWorkspace();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // Close on navigation so the drawer never covers the page the user chose.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // While open: lock body scroll, close on Escape, and keep Tab inside the panel.
  useEffect(() => {
    if (!drawerOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDrawer();
        toggleRef.current?.focus();
        return;
      }

      if (event.key !== 'Tab' || !drawerRef.current) return;

      const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    drawerRef.current?.querySelector<HTMLElement>('button, a[href]')?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [drawerOpen, closeDrawer]);

  const renderGroup = (group: NavGroup, onNavigate?: () => void) => (
    <div className="nav-group" key={group.label}>
      <div className="nav-label">{group.label}</div>
      <nav className="nav" aria-label={group.label}>
        {group.items.map((item) => {
          const isActive = current?.href === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={isActive ? 'active' : undefined}
              aria-current={isActive ? 'page' : undefined}
              data-tour={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={onNavigate}
            >
              <span className="nav-icon">
                <Icon name={item.icon} size={16} />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <WorkspaceProvider value={workspace}>
      <div className="app-shell">
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>

        <aside className="sidebar">
          <Link className="brand" href="/dashboard">
            <span className="brand-mark" aria-hidden="true">
              AI
            </span>
            <span className="brand-name">AIBOT</span>
          </Link>

          {/* Informational, not a switcher: this account has one workspace, and a
              control that looks like a menu but opens nothing is worse than a
              label. It links to the page where the name is actually editable. */}
          <Link className="workspace" href="/settings">
            <span className="workspace-avatar" aria-hidden="true">
              {workspace ? workspaceInitial(workspace.workspaceName) : '·'}
            </span>
            <span className="workspace-copy">
              <strong>{workspace?.workspaceName || 'Loading…'}</strong>
              <span>{workspace?.role ? roleLabel(workspace.role) : 'Workspace'}</span>
            </span>
            <Icon name="settings" size={14} />
          </Link>

          <div className="sidebar-scroll">{MAIN_GROUPS.map((group) => renderGroup(group))}</div>

          <div className="sidebar-bottom">
            {FOOTER_GROUPS.map((group) => renderGroup(group))}
            <div className="sidebar-theme">
              <ThemeSwitcher compact />
            </div>
            <SignOutButton />
          </div>
        </aside>

        <div className="main">
          <header className="topbar">
            <div className="breadcrumb">
              <button
                type="button"
                ref={toggleRef}
                className="icon-button nav-toggle"
                aria-label="Open navigation menu"
                aria-expanded={drawerOpen}
                onClick={() => setDrawerOpen(true)}
              >
                <Icon name="menu" size={17} />
              </button>
              <span className="breadcrumb-trail">
                {workspace?.workspaceName ?? 'Workspace'} /{' '}
                <strong>{current?.label ?? 'Overview'}</strong>
              </span>
            </div>

            <div className="top-actions">
              <div className="topbar-theme">
                <ThemeSwitcher compact />
              </div>
              <div className="avatar" aria-hidden="true">
                {workspace ? workspaceInitial(workspace.workspaceName) : '·'}
              </div>
            </div>
          </header>

          {children}
        </div>

        {drawerOpen ? (
          <>
            <button
              type="button"
              className="drawer-backdrop"
              aria-label="Close navigation menu"
              onClick={closeDrawer}
            />
            <div
              ref={drawerRef}
              className="drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
            >
              <div className="drawer-head">
                <Link className="brand" href="/dashboard" style={{ padding: 0 }}>
                  <span className="brand-mark" aria-hidden="true">
                    AI
                  </span>
                  <span className="brand-name">AIBOT</span>
                </Link>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Close navigation menu"
                  onClick={closeDrawer}
                >
                  <Icon name="close" size={17} />
                </button>
              </div>
              <div className="sidebar-scroll">
                {MAIN_GROUPS.map((group) => renderGroup(group, closeDrawer))}
              </div>
              <div className="sidebar-bottom">
                {FOOTER_GROUPS.map((group) => renderGroup(group, closeDrawer))}
                <div className="sidebar-theme">
                  <ThemeSwitcher />
                </div>
                <SignOutButton />
              </div>
            </div>
          </>
        ) : null}

        {/* The workspace id scopes tour progress: the same person joining a
            second workspace has not been shown that one yet. */}
        <ZemoWidget userState="active-workspace" workspaceId={workspace?.workspaceId} />
      </div>
    </WorkspaceProvider>
  );
}

/**
 * Reads the signed-in workspace once per mount.
 *
 * The name is never compiled into the build: it comes from `/api/me`, which
 * resolves it from the session's membership row. Until it arrives the shell
 * shows a placeholder rather than a plausible-looking name that belongs to
 * nobody. A failure is left silent — the shell is chrome, and a workspace name
 * that cannot be read is not worth an error over the page inside it.
 */
function useWorkspace(): WorkspaceIdentity | null {
  const [workspace, setWorkspace] = useState<WorkspaceIdentity | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetchWorkspace(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setWorkspace(result);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  return workspace;
}

/** `workspace_members.role` as a person would read it. */
function roleLabel(role: string): string {
  if (!role) return 'Workspace';
  return role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, ' ');
}

/**
 * Ends the session. A form POST to the sign-out route rather than a link, so a
 * prefetch or a stray GET can never sign the user out.
 */
function SignOutButton() {
  return (
    <form action="/auth/signout" method="post" className="sidebar-signout">
      <button type="submit" className="sidebar-signout-button">
        <span className="nav-icon">
          <Icon name="signout" size={16} />
        </span>
        <span>Sign out</span>
      </button>
    </form>
  );
}
