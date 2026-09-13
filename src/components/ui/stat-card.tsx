import { Icon, type IconName } from '@/components/icons';

export interface StatCardProps {
  label: string;
  value: string;
  meta?: string;
  trend?: 'up' | 'down';
  icon?: IconName;
}

export function StatCard({ label, value, meta, trend, icon }: StatCardProps) {
  return (
    <div className="card stat-card">
      <div className="stat-top">
        <span>{label}</span>
        {icon ? (
          <span className="stat-icon">
            <Icon name={icon} size={15} />
          </span>
        ) : null}
      </div>
      <div className="stat-value">{value}</div>
      {meta ? (
        <div className={`stat-meta${trend ? ` ${trend}` : ''}`}>
          {trend === 'up' ? '↗ ' : trend === 'down' ? '↘ ' : ''}
          {meta}
        </div>
      ) : null}
    </div>
  );
}
