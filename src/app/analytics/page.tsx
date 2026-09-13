import type { Metadata } from 'next';
import { SectionPage } from '@/components/section-page';
import { Icon } from '@/components/icons';
import { Card, CardHeader } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { DataTable } from '@/components/ui/data-table';
import { formatDuration } from '@/lib/status';
import { DEMO_AGENT_PERFORMANCE, DEMO_ANALYTICS_METRICS } from '@/lib/demo-data';
import { requireUser } from '@/lib/auth/require-user';

export const metadata: Metadata = { title: 'Analytics' };

const COLUMNS = [
  { key: 'agent', header: 'Agent' },
  { key: 'calls', header: 'Calls', numeric: true },
  { key: 'connect', header: 'Connect rate', numeric: true },
  { key: 'qualification', header: 'Qualification rate', numeric: true },
  { key: 'duration', header: 'Avg. duration', numeric: true },
] as const;

export default async function AnalyticsPage() {
  await requireUser('/analytics');

  return (
    <SectionPage
      eyebrow="Performance"
      title="Analytics"
      subtitle="Understand how your AI outreach turns leads into conversations."
      actions={
        <button type="button" className="secondary-button">
          <Icon name="download" size={15} /> Export report
        </button>
      }
    >
      <section className="stat-grid" aria-label="Outreach performance">
        {DEMO_ANALYTICS_METRICS.map((metric) => (
          <StatCard key={metric.label} {...metric} />
        ))}
      </section>

      <Card>
        <CardHeader title="Agent performance" subtitle="How each agent is converting conversations" />
        <DataTable columns={COLUMNS} caption="Performance by agent">
          {DEMO_AGENT_PERFORMANCE.map((row) => (
            <tr key={row.agentName}>
              <td style={{ fontWeight: 600 }}>{row.agentName}</td>
              <td className="numeric">{row.calls.toLocaleString()}</td>
              <td className="numeric">{row.connectRate}</td>
              <td className="numeric">{row.qualificationRate}</td>
              <td className="numeric">{formatDuration(row.avgDurationSeconds)}</td>
            </tr>
          ))}
        </DataTable>
      </Card>
    </SectionPage>
  );
}
