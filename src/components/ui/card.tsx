import type { ReactNode } from 'react';

export function Card({
  children,
  className = '',
  tourTarget,
}: {
  children: ReactNode;
  className?: string;
  /** `data-tour` value, so the guided tour can point at this card. */
  tourTarget?: string;
}) {
  return (
    <div className={`card ${className}`.trim()} data-tour={tourTarget}>
      {children}
    </div>
  );
}

/**
 * Card header. `title` is rendered as plain text, so pass a heading element
 * via `titleAs` when the card is a real landmark on the page.
 */
export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card-head">
      <div>
        <div className="card-title">{title}</div>
        {subtitle ? <div className="card-subtitle">{subtitle}</div> : null}
      </div>
      {action}
    </div>
  );
}
