'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { SectionPage } from '@/components/section-page';
import { Card, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/badge';
import { DemoCallTag } from '@/components/ui/demo-tag';
import { WhatsAppPreview } from '../../whatsapp/components/whatsapp-preview';
import type { CallDetail, FollowUp } from '@/domain/types';
import { ApiError } from '@/lib/api/client';
import { callLeadName, fetchCall } from '@/lib/calls';
import { formatAbsoluteTime } from '@/lib/format';
import { CALL_OUTCOME_DISPLAY, CALL_STATUS_DISPLAY, formatDuration } from '@/lib/status';

type LoadState =
  | { phase: 'loading' }
  | { phase: 'ready'; call: CallDetail }
  | { phase: 'error'; title: string; message: string; notFound: boolean };

export function CallDetailView({ callId }: { callId: string }) {
  const [state, setState] = useState<LoadState>({ phase: 'loading' });
  const requestRef = useRef(0);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      const requestId = ++requestRef.current;
      setState({ phase: 'loading' });

      try {
        const call = await fetchCall(callId, signal);
        if (requestRef.current !== requestId) return;
        setState({ phase: 'ready', call });
      } catch (error) {
        if (signal?.aborted || requestRef.current !== requestId) return;
        const apiError = error instanceof ApiError ? error : null;
        setState({
          phase: 'error',
          title: apiError?.status === 404 ? 'Call not found' : 'We could not load this call',
          message:
            apiError?.status === 404
              ? 'It may have been deleted, or it belongs to another workspace.'
              : apiError?.message ?? 'We could not reach the server.',
          notFound: apiError?.status === 404,
        });
      }
    },
    [callId]
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  // A follow-up updated here replaces the row in place, so the page shows what
  // the server stored rather than re-fetching the whole call.
  const handleFollowUpChange = useCallback((updated: FollowUp) => {
    setState((current) => {
      if (current.phase !== 'ready') return current;
      return {
        ...current,
        call: {
          ...current.call,
          followUps: current.call.followUps.map((item) =>
            item.id === updated.id ? updated : item
          ),
        },
      };
    });
  }, []);

  if (state.phase === 'loading') {
    return (
      <SectionPage eyebrow="Voice activity" title="Call" subtitle="Loading…">
        <Card>
          <div className="card-body">
            <span className="skeleton" style={{ width: 220 }} />
            <span className="skeleton" style={{ width: 160, marginTop: 10 }} />
          </div>
        </Card>
      </SectionPage>
    );
  }

  if (state.phase === 'error') {
    return (
      <SectionPage eyebrow="Voice activity" title="Call" subtitle="">
        <Card>
          <EmptyState
            icon="alert"
            title={state.title}
            description={state.message}
            actions={
              state.notFound ? (
                <Link className="primary-button" href="/calls">
                  Back to calls
                </Link>
              ) : (
                <button type="button" className="secondary-button" onClick={() => void load()}>
                  Try again
                </button>
              )
            }
          />
        </Card>
      </SectionPage>
    );
  }

  const { call } = state;
  const name = callLeadName(call);

  return (
    <SectionPage
      eyebrow="Voice activity"
      title={name}
      subtitle={call.phoneNumber}
      actions={
        <Link className="secondary-button" href="/calls">
          All calls
        </Link>
      }
    >
      {call.simulated ? (
        <p className="demo-banner" role="note">
          <strong>Demo call.</strong> AIBOT simulated this conversation to show how a call is
          recorded. No phone number was dialled, nobody was spoken to, and no telephony provider
          is connected to this workspace.
        </p>
      ) : null}

      <Card>
        <CardHeader
          title="Call"
          subtitle={call.createdAt ? formatAbsoluteTime(call.createdAt) : undefined}
          action={
            <span className="cell-stack">
              <StatusBadge status={CALL_STATUS_DISPLAY[call.status]} />
              {call.simulated ? <DemoCallTag /> : null}
            </span>
          }
        />
        <dl className="detail-grid">
          <div className="detail-cell">
            <dt className="detail-label">Outcome</dt>
            <dd className="detail-value">
              {call.outcome ? (
                <StatusBadge status={CALL_OUTCOME_DISPLAY[call.outcome]} />
              ) : (
                <span className="muted">Not recorded</span>
              )}
            </dd>
          </div>
          <div className="detail-cell">
            <dt className="detail-label">Duration</dt>
            <dd className="detail-value">
              {call.durationSeconds > 0 ? formatDuration(call.durationSeconds) : '—'}
            </dd>
          </div>
          <div className="detail-cell">
            <dt className="detail-label">Campaign</dt>
            <dd className="detail-value">
              {call.campaignId && call.campaignName ? (
                <Link href={`/campaigns/${call.campaignId}`}>{call.campaignName}</Link>
              ) : (
                <span className="muted">None</span>
              )}
            </dd>
          </div>
          <div className="detail-cell">
            <dt className="detail-label">Agent</dt>
            <dd className="detail-value">
              {call.agentName ?? <span className="muted">None</span>}
            </dd>
          </div>
        </dl>
      </Card>

      <Card>
        <CardHeader title="Lead" subtitle="Who this call was to" />
        <dl className="detail-grid">
          <div className="detail-cell">
            <dt className="detail-label">Name</dt>
            <dd className="detail-value">{name}</dd>
          </div>
          <div className="detail-cell">
            <dt className="detail-label">Company</dt>
            <dd className="detail-value">
              {call.leadCompany ?? <span className="muted">—</span>}
            </dd>
          </div>
          <div className="detail-cell">
            <dt className="detail-label">Phone</dt>
            <dd className="detail-value">{call.phoneNumber}</dd>
          </div>
          <div className="detail-cell">
            <dt className="detail-label">Started</dt>
            <dd className="detail-value">
              {call.startedAt ? formatAbsoluteTime(call.startedAt) : <span className="muted">—</span>}
            </dd>
          </div>
        </dl>
      </Card>

      <Card>
        <CardHeader title="AI summary" subtitle="Recorded when the call ended" />
        {call.summary ? (
          <div className="card-body">
            <p className="summary-text">{call.summary}</p>
            {call.nextAction ? (
              <p className="next-action">
                <span className="next-action-label">Next action</span>
                {call.nextAction}
              </p>
            ) : null}
          </div>
        ) : (
          <EmptyState
            icon="sparkles"
            title="No summary"
            description="This call was not summarised. Nothing is generated here — the summary is only ever what was stored when the call ended."
          />
        )}
      </Card>

      <Card>
        <CardHeader
          title="Transcript"
          subtitle={call.transcript ? 'As recorded when the call ended' : undefined}
        />
        {call.transcript ? (
          <Transcript text={call.transcript} />
        ) : (
          <EmptyState
            icon="phone"
            title={call.status === 'NO_ANSWER' ? 'Nobody answered' : 'No transcript'}
            description={
              call.status === 'NO_ANSWER'
                ? 'The call was not answered, so there was no conversation to record.'
                : 'No transcript was stored for this call.'
            }
          />
        )}
      </Card>

      {call.followUps.length > 0 ? (
        <Card>
          <CardHeader
            title="Follow-up"
            subtitle="Scheduled from the outcome of this call"
          />
          <div className="card-body follow-up-stack">
            {call.followUps.map((followUp) => (
              <WhatsAppPreview
                key={followUp.id}
                followUp={followUp}
                onChange={handleFollowUpChange}
              />
            ))}
          </div>
        </Card>
      ) : null}
    </SectionPage>
  );
}

/**
 * Renders the stored transcript.
 *
 * Lines arrive as "Speaker: text" and are split only for layout. The text
 * itself is never rewritten — a line that does not match simply renders whole,
 * so nothing that was said can be dropped by a parsing assumption.
 */
function Transcript({ text }: { text: string }) {
  const lines = text.split('\n').filter((line) => line.trim().length > 0);

  return (
    <div className="transcript">
      {lines.map((line, index) => {
        const separator = line.indexOf(': ');
        const speaker = separator > 0 ? line.slice(0, separator) : null;
        const body = separator > 0 ? line.slice(separator + 2) : line;
        const isAgent = speaker?.toLowerCase() === 'agent';

        return (
          <div
            key={index}
            className={`transcript-line ${speaker ? (isAgent ? 'is-agent' : 'is-lead') : 'is-plain'}`}
          >
            {speaker ? <span className="transcript-speaker">{speaker}</span> : null}
            <span className="transcript-text">{body}</span>
          </div>
        );
      })}
    </div>
  );
}
