import type { ReactNode } from "react";

export interface SectionPageProps {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  /** Page-level actions, rendered top-right (top-full-width on mobile). */
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Standard product page layout: page header + content.
 *
 * The shell around this — sidebar, topbar, Zemo — is the `(app)` layout, which
 * is mounted once and survives navigation. This component is only the part
 * that changes per page.
 */
export function SectionPage({
  title,
  eyebrow,
  subtitle,
  actions,
  children,
}: SectionPageProps) {
  return (
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
  );
}
