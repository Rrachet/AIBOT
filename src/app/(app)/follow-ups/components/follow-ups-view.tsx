'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/icons';
import { SectionPage } from '@/components/section-page';
import { Card, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import type { FollowUp } from '@/domain/types';
import { ApiError } from '@/lib/api/client';
import { fetchFollowUps, followUpLeadName, simulateSend } from '@/lib/follow-ups';
import { formatDateTime } from '@/lib/format';
import { FOLLOW_UP_CHANNEL_LABEL, FOLLOW_UP_STATUS_DISPLAY } from '@/lib/status';

/**
 * The follow-up queue, as a place to work rather than a place to look.
 *
 * `/whatsapp` shows what a message says; this shows what is owed and when,
 * across every channel, with the send control on the row itself so clearing
 * the queue never requires leaving the table. Ordering is by scheduled time
 * with the overdue ones first, because that is the order the work is due in.
 */

type Filter = 'DUE' | 'PENDING' | 'SENT' | 'FAILED' | 'ALL';

const FILTERS: readonly { id: Filter; label: string }[] = [
  { id: 'DUE', label: 'Due now' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'SENT', label: 'Sent' },
  { id: 'FAILED', label: 'Failed' },
  { id: 'ALL', label: 'All' },
];

const COLUMNS = [
  { key: 'lead', header: 'Lead' },
  { key: 'channel', header: 'Channel' },
  { key: 'message', header: 'Message' },
  { key: 'scheduled', header: 'Scheduled' },
  { key: 'status', header: 'Status' },
  { key: 'action', header: 'Action' },
] as const;

/** A follow-up that can still be sent. Cancelled and sent rows cannot. */
function isSendable(followUp: FollowUp): boolean {
  return followUp.status === 'PENDING' || followUp.status === 'FAILED';
}

/** Pending and already past its scheduled time — the work that is late. */
function isDue(followUp: FollowUp, now: number): boolean {
  if (followUp.status !== 'PENDING') return false;
  const at = Date.parse(followUp.scheduledAt);
  return Number.isNaN(at) ? true : at <= now;
}

function matches(followUp: FollowUp, filter: Filter, now: number): boolean {
  switch (filter) {
    case 'DUE':
      return isDue(followUp, now);
    case 'PENDING':
      return followUp.status === 'PENDING';
    case 'SENT':
      return followUp.status === 'SENT' || followUp.status === 'COMPLETED';
    case 'FAILED':
      return followUp.status === 'FAILED';
    case 'ALL':
      return true;
  }
}

/** Overdue first, then soonest-scheduled, then everything already handled. */
function queueOrder(a: FollowUp, b: FollowUp, now: number): number {
  const rank = (item: FollowUp) => (isDue(item, now) ? 0 : isSendable(item) ? 1 : 2);
  const difference = rank(a) - rank(b);
  if (difference !== 0) return difference;
  return Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt);
}

type LoadState =
  | { phase: 'loading' }
  | { phase: 'ready'; followUps: FollowUp[] }
  | { phase: 'error'; message: string };

export function FollowUpsView() {
  const [state, setState] = useState<LoadState>({ phase: 'loading' });
  const [filter, setFilter] = useState<Filter>('DUE');
  const requestRef = useRef(0);

  // Pinned at load. Recomputing `Date.now()` on every render would let a row
  // silently leave the "Due now" filter mid-interaction.
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async (signal?: AbortSignal) => {
    const requestId = ++requestRef.current;
    setState({ phase: 'loading' });

    try {
      const followUps = await fetchFollowUps(signal);
      if (requestRef.current !== requestId) return;
      setNow(Date.now());
      setState({ phase: 'ready', followUps });
    } catch (error) {
      if (signal?.aborted || requestRef.current !== requestId) return;
      const apiError = error instanceof ApiError ? error : null;
      setState({ phase: 'error', message: apiError?.message ?? 'We could not reach the server.' });
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const handleChange = useCallback((updated: FollowUp) => {
    setState((current) => {
      if (current.phase !== 'ready') return current;
      return {
        ...current,
        followUps: current.followUps.map((item) => (item.id === updated.id ? updated : item)),
      };
    });
  }, []);

  const followUps = state.phase === 'ready' ? state.followUps : [];

  const counts = useMemo(() => {
    const due = followUps.filter((item) => isDue(item, now)).length;
    const pending = followUps.filter((item) => item.status === 'PENDING').length;
    const sent = followUps.filter(
      (item) => item.status === 'SENT' || item.status === 'COMPLETED'
    ).length;
    const failed = followUps.filter((item) => item.status === 'FAILED').length;
    return { due, pending, sent, failed, scheduled: pending - due };
  }, [followUps, now]);

  const visible = useMemo(
    () =>
      followUps
        .filter((item) => matches(item, filter, now))
        .sort((a, b) => queueOrder(a, b, now)),
    [followUps, filter, now]
  );

  const activeFilter = FILTERS.find((item) => item.id === filter);

  return (
    <SectionPage
      eyebrow="After the call"
      title="Follow-ups"
      subtitle="Everything AIBOT owes a lead, in the order it is due."
      actions={
        <Link className="secondary-button" href="/whatsapp">
          <Icon name="message" size={15} />
          Message centre
        </Link>
      }
    >
      <p className="demo-banner" role="note">
        <strong>Demo / Simulated delivery.</strong> No messaging provider is connected to this
        workspace, so nothing here reaches a phone. Sending records the follow-up as sent on the
        real row and on the lead&rsquo;s timeline, which is what the rest of the product reads.
      </p>

      <div className="stat-grid">
        <StatCard
          label="Due now"
          value={state.phase === 'ready' ? counts.due.toLocaleString() : '—'}
          meta={counts.due > 0 ? 'Waiting on you' : 'Nothing overdue'}
          icon="clock"
        />
        <StatCard
          label="Scheduled later"
          value={state.phase === 'ready' ? Math.max(counts.scheduled, 0).toLocaleString() : '—'}
          meta="Queued for a future time"
          icon="calendar"
        />
        <StatCard
          label="Sent"
          value={state.phase === 'ready' ? counts.sent.toLocaleString() : '—'}
          meta="Recorded against the lead"
          icon="check"
        />
        <StatCard
          label="Failed"
          value={state.phase === 'ready' ? counts.failed.toLocaleString() : '—'}
          meta={counts.failed > 0 ? 'Can be retried' : 'None'}
          icon="alert"
        />
      </div>

      <Card>
        <CardHeader
          title="Queue"
          subtitle={
            state.phase === 'ready'
              ? `${followUps.length.toLocaleString()} follow-up${followUps.length === 1 ? '' : 's'} in this workspace`
              : 'Loading…'
          }
          action={
            <div className="toolbar" role="group" aria-label="Filter follow-ups">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`filter-chip${filter === item.id ? ' is-active' : ''}`}
                  aria-pressed={filter === item.id}
                  onClick={() => setFilter(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          }
        />

        {state.phase === 'loading' ? (
          <div className="card-body">
            <span className="skeleton" style={{ width: 260 }} />
            <span className="skeleton" style={{ width: 200, marginTop: 10 }} />
            <span className="skeleton" style={{ width: 230, marginTop: 10 }} />
          </div>
        ) : state.phase === 'error' ? (
          <EmptyState
            icon="alert"
            title="We could not load your follow-ups"
            description={state.message}
            actions={
              <button type="button" className="secondary-button" onClick={() => void load()}>
                Try again
              </button>
            }
          />
        ) : followUps.length === 0 ? (
          <EmptyState
            icon="clock"
            title="No follow-ups yet"
            description="When a call goes unanswered or a lead asks to be contacted later, AIBOT writes the follow-up and queues it here."
            actions={
              <Link className="primary-button" href="/campaigns">
                Run a campaign
              </Link>
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon="check"
            title={filter === 'DUE' ? 'Nothing is due' : `No ${activeFilter?.label.toLowerCase()} follow-ups`}
            description={
              filter === 'DUE'
                ? 'Every follow-up that has come due has been dealt with. The rest are scheduled for later.'
                : 'Nothing in this workspace matches that filter right now.'
            }
            actions={
              <button type="button" className="secondary-button" onClick={() => setFilter('ALL')}>
                Show all follow-ups
              </button>
            }
          />
        ) : (
          <DataTable columns={COLUMNS} tourTarget="follow-ups-queue" caption="Follow-ups for this workspace">
            {visible.map((followUp) => (
              <FollowUpRow
                key={followUp.id}
                followUp={followUp}
                due={isDue(followUp, now)}
                onChange={handleChange}
              />
            ))}
          </DataTable>
        )}
      </Card>
    </SectionPage>
  );
}

function FollowUpRow({
  followUp,
  due,
  onChange,
}: {
  followUp: FollowUp;
  due: boolean;
  onChange: (updated: FollowUp) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      onChange(await simulateSend(followUp.id));
    } catch (caught) {
      const apiError = caught instanceof ApiError ? caught : null;
      setError(apiError?.message ?? 'We could not update this follow-up.');
    } finally {
      setBusy(false);
    }
  };

  const sent = followUp.status === 'SENT' || followUp.status === 'COMPLETED';

  return (
    <tr data-follow-up-id={followUp.id} data-status={followUp.status}>
      <td>
        <div className="lead-name">
          <span>
            <strong>{followUpLeadName(followUp)}</strong>
            {followUp.leadPhone ? <span className="lead-sub">{followUp.leadPhone}</span> : null}
          </span>
        </div>
      </td>
      <td className="muted">{FOLLOW_UP_CHANNEL_LABEL[followUp.channel]}</td>
      <td>
        {followUp.messageTemplate ? (
          <span className="queue-message" title={followUp.messageTemplate}>
            {followUp.messageTemplate}
          </span>
        ) : (
          <span className="muted">No message composed</span>
        )}
      </td>
      <td className="muted">
        <span className="cell-stack">
          <span>{formatDateTime(sent ? followUp.sentAt : followUp.scheduledAt)}</span>
          {due ? <span className="due-flag">Due</span> : null}
        </span>
      </td>
      <td>
        <StatusBadge status={FOLLOW_UP_STATUS_DISPLAY[followUp.status]} />
      </td>
      <td>
        <span className="cell-stack">
          {isSendable(followUp) ? (
            <button
              type="button"
              className="secondary-button sm"
              onClick={() => void send()}
              disabled={busy}
            >
              <Icon name="message" size={14} />
              {busy ? 'Working…' : followUp.status === 'FAILED' ? 'Retry send' : 'Simulate send'}
            </button>
          ) : null}
          {followUp.callId ? (
            <Link className="table-link" href={`/calls/${followUp.callId}`}>
              View call
            </Link>
          ) : null}
          {!isSendable(followUp) && !followUp.callId ? <span className="muted">—</span> : null}
          {error ? (
            <span className="field-error" role="alert">
              {error}
            </span>
          ) : null}
        </span>
      </td>
    </tr>
  );
}
