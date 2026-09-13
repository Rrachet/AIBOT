import type { BadgeTone, StatusDisplay } from '@/lib/status';

export function Badge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

/** Renders a mapped domain status (see `src/lib/status.ts`). */
export function StatusBadge({ status }: { status: StatusDisplay }) {
  return <Badge tone={status.tone}>{status.label}</Badge>;
}
