import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/icons';

export interface EmptyStateProps {
  icon: IconName;
  title: string;
  description: string;
  /** Primary/secondary actions. Keep to two at most. */
  actions?: ReactNode;
}

/**
 * Product-facing empty state. Copy should tell the user what this area does
 * and how to fill it — never describe internal implementation status.
 */
export function EmptyState({ icon, title, description, actions }: EmptyStateProps) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon name={icon} size={20} />
      </div>
      <strong>{title}</strong>
      <p>{description}</p>
      {actions ? <div className="empty-actions">{actions}</div> : null}
    </div>
  );
}
