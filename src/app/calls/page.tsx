import type { Metadata } from 'next';
import { SectionPage } from '@/components/section-page';
import { Card, CardHeader } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { DataTable, EntityCell } from '@/components/ui/data-table';
import { CALL_OUTCOME_DISPLAY, CALL_STATUS_DISPLAY, formatDuration, initials } from '@/lib/status';
import { DEMO_CALLS } from '@/lib/demo-data';
import { requireUser } from '@/lib/auth/require-user';

export const metadata: Metadata = { title: 'Calls' };

const COLUMNS = [
  { key: 'lead', header: 'Lead' },
  { key: 'agent', header: 'Agent' },
  { key: 'time', header: 'Time' },
  { key: 'duration', header: 'Duration', numeric: true },
  { key: 'status', header: 'Status' },
  { key: 'outcome', header: 'Outcome' },
] as const;

export default async function CallsPage() {
  await requireUser('/calls');

  return (
    <SectionPage
      eyebrow="Voice activity"
      title="Calls"
      subtitle="Every AI call, outcome and follow-up in one place."
    >
      <Card>
        <CardHeader
          title="Recent calls"
          subtitle="Recording, transcript and AI summary open from a call once a voice provider is connected"
        />
        <DataTable columns={COLUMNS} caption="Call history for this workspace">
          {DEMO_CALLS.map((call) => (
            <tr key={call.id}>
              <td>
                <EntityCell
                  initials={initials(call.leadName)}
                  name={call.leadName}
                  meta={call.leadCompany}
                />
              </td>
              <td className="muted">{call.agentName}</td>
              <td className="muted">{call.timeLabel}</td>
              <td className="muted numeric">
                {call.durationSeconds > 0 ? formatDuration(call.durationSeconds) : '—'}
              </td>
              <td>
                <StatusBadge status={CALL_STATUS_DISPLAY[call.status]} />
              </td>
              <td>
                {call.outcome ? (
                  <StatusBadge status={CALL_OUTCOME_DISPLAY[call.outcome]} />
                ) : (
                  <span className="muted">—</span>
                )}
              </td>
            </tr>
          ))}
        </DataTable>
      </Card>
    </SectionPage>
  );
}
