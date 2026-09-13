import type { ReactNode } from 'react';
import { AppShell } from './app-shell';

export interface SectionPageProps {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  /** Page-level actions, rendered top-right (top-full-width on mobile). */
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Standard product page layout: shell + page header + content.
 *
 * The active navigation item is resolved from the route inside `AppShell`,
 * so pages never declare which nav entry they belong to.
 */
export function SectionPage({ title, eyebrow, subtitle, actions, children }: SectionPageProps) {
  return (
    <AppShell>
      <main className="content" id="main-content">
        <div className="page-head">
          <div>
            {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
            <h1 className="page-title">{title}</h1>
            {subtitle ? <p className="subtitle">{subtitle}</p> : null}
          </div>
          {actions ? <div className="page-head-actions">{actions}</div> : null}
        </div>
        <div className="section-stack">{children}</div>
      </main>
    </AppShell>
  );
}
