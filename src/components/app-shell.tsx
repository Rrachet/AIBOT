'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from './icons';
import { NAV_ITEMS, findNavItem } from '@/config/navigation';
import { fetchWorkspace, workspaceInitial, type WorkspaceIdentity } from '@/lib/workspace';

/**
 * Application chrome: sidebar, topbar and mobile drawer.
 *
 * The active nav item is derived from the current pathname rather than passed
 * in by each page, so navigation state can never drift out of sync with the
 * route. Pages stay server components — they are passed through as `children`.
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

  const navLinks = (onNavigate?: () => void) =>
    NAV_ITEMS.map((item) => {
      const isActive = current?.href === item.href;
      return (
        <Link
          key={item.href}
          href={item.href}
          className={isActive ? 'active' : undefined}
          aria-current={isActive ? 'page' : undefined}
          title={item.label}
          onClick={onNavigate}
        >
          <span className="nav-icon">
            <Icon name={item.icon} size={16} />
          </span>
          <span>{item.label}</span>
        </Link>
      );
    });

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            AI
          </div>
          <div className="brand-name">AIBOT</div>
        </div>

        <button type="button" className="workspace">
          <span className="workspace-avatar" aria-hidden="true">
            {workspace ? workspaceInitial(workspace.workspaceName) : '·'}
          </span>
          <span className="workspace-copy">
            <strong>{workspace?.workspaceName || 'Loading…'}</strong>
            <span>{workspace?.role ? roleLabel(workspace.role) : 'Workspace'}</span>
          </span>
          <Icon name="chevron-down" size={14} />
        </button>

        <div className="nav-label">Workspace</div>
        <nav className="nav" aria-label="Main">
          {navLinks()}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-help">
            <strong>Build your first campaign</strong>
            <span>Import leads, choose an agent, and start your first AI call.</span>
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
              Workspace / <strong>{current?.label ?? 'Overview'}</strong>
            </span>
          </div>

          <div className="top-actions">
            <button type="button" className="icon-button" aria-label="Search">
              <Icon name="search" size={16} />
            </button>
            <button type="button" className="icon-button" aria-label="Notifications">
              <Icon name="bell" size={16} />
            </button>
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
              <div className="brand" style={{ padding: 0 }}>
                <div className="brand-mark" aria-hidden="true">
                  AI
                </div>
                <div className="brand-name">AIBOT</div>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Close navigation menu"
                onClick={closeDrawer}
              >
                <Icon name="close" size={17} />
              </button>
            </div>
            <nav className="nav" aria-label="Main">
              {navLinks(closeDrawer)}
            </nav>
            <div className="sidebar-bottom">
              <SignOutButton />
            </div>
          </div>
        </>
      ) : null}
    </div>
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
