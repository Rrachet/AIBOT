'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { SectionPage } from '@/components/section-page';
import { Card, CardHeader } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { DataTable, EntityCell } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { DemoCallTag } from '@/components/ui/demo-tag';
import type { Call } from '@/domain/types';
import { ApiError } from '@/lib/api/client';
import { callLeadName, fetchCalls } from '@/lib/calls';
import { formatAbsoluteTime, formatRelativeTime } from '@/lib/format';
import { CALL_OUTCOME_DISPLAY, CALL_STATUS_DISPLAY, formatDuration, initials } from '@/lib/status';

const COLUMNS = [
  { key: 'lead', header: 'Lead' },
  { key: 'campaign', header: 'Campaign' },
  { key: 'time', header: 'Time' },
  { key: 'duration', header: 'Duration', numeric: true },
  { key: 'status', header: 'Status' },
  { key: 'outcome', header: 'Outcome' },
] as const;

type LoadState =
  | { phase: 'loading' }
  | { phase: 'ready'; calls: Call[] }
  | { phase: 'error'; message: string };

export function CallsView() {
  const [state, setState] = useState<LoadState>({ phase: 'loading' });
  const requestRef = useRef(0);

  const load = useCallback(async (signal?: AbortSignal) => {
    const requestId = ++requestRef.current;
    setState({ phase: 'loading' });

    try {
      const calls = await fetchCalls({ signal });
      if (requestRef.current !== requestId) return;
      setState({ phase: 'ready', calls });
    } catch (error) {
      if (signal?.aborted || requestRef.current !== requestId) return;
      const apiError = error instanceof ApiError ? error : null;
      setState({
        phase: 'error',
        message: apiError?.message ?? 'We could not reach the server.',
      });
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const calls = state.phase === 'ready' ? state.calls : [];
  const simulated = calls.filter((call) => call.simulated).length;

  return (
    <SectionPage
      eyebrow="Voice activity"
      title="Calls"
      subtitle="Every call this workspace has made, with its outcome."
    >
      {simulated > 0 ? (
        <p className="demo-banner" role="note">
          <strong>Demo mode.</strong> {simulated === calls.length ? 'These calls were' : `${simulated} of these calls were`}{' '}
          simulated by AIBOT to show the product working. No phone number was dialled and no
          telephony provider is connected.
        </p>
      ) : null}

      <Card>
        <CardHeader
          title="Recent calls"
          subtitle={
            state.phase === 'ready'
              ? `${calls.length.toLocaleString()} ${calls.length === 1 ? 'call' : 'calls'}`
              : 'Loading…'
          }
        />

        {state.phase === 'loading' ? (
          <div className="card-body">
            <span className="skeleton" style={{ width: 240 }} />
            <span className="skeleton" style={{ width: 180, marginTop: 10 }} />
          </div>
        ) : state.phase === 'error' ? (
          <EmptyState
            icon="alert"
            title="We could not load your calls"
            description={state.message}
            actions={
              <button type="button" className="secondary-button" onClick={() => void load()}>
                Try again
              </button>
            }
          />
        ) : calls.length === 0 ? (
          <EmptyState
            icon="phone"
            title="No calls yet"
            description="Start a campaign and its calls will appear here with transcripts and outcomes."
            actions={
              <Link className="primary-button" href="/campaigns">
                Go to campaigns
              </Link>
            }
          />
        ) : (
          <DataTable columns={COLUMNS} tourTarget="calls-table" caption="Call history for this workspace">
            {calls.map((call) => (
              <CallRow key={call.id} call={call} />
            ))}
          </DataTable>
        )}
      </Card>
    </SectionPage>
  );
}

function CallRow({ call }: { call: Call }) {
  const name = callLeadName(call);

  return (
    <tr>
      <td>
        <Link href={`/calls/${call.id}`} className="row-link">
          <EntityCell
            initials={initials(name)}
            name={name}
            meta={call.leadCompany ?? call.phoneNumber}
          />
        </Link>
      </td>
      <td className="muted">
        {call.campaignId && call.campaignName ? (
          <Link href={`/campaigns/${call.campaignId}`}>{call.campaignName}</Link>
        ) : (
          '—'
        )}
      </td>
      <td className="muted">
        <time dateTime={call.createdAt} title={formatAbsoluteTime(call.createdAt)}>
          {formatRelativeTime(call.createdAt)}
        </time>
      </td>
      <td className="muted numeric">
        {call.durationSeconds > 0 ? formatDuration(call.durationSeconds) : '—'}
      </td>
      <td>
        <span className="cell-stack">
          <StatusBadge status={CALL_STATUS_DISPLAY[call.status]} />
          {call.simulated ? <DemoCallTag /> : null}
        </span>
      </td>
      <td>
        {call.outcome ? (
          <StatusBadge status={CALL_OUTCOME_DISPLAY[call.outcome]} />
        ) : (
          <span className="muted">—</span>
        )}
      </td>
    </tr>
  );
}
