'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { SectionPage } from '@/components/section-page';
import { Card, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import type { FollowUp } from '@/domain/types';
import { ApiError } from '@/lib/api/client';
import { fetchFollowUps, followUpLeadName } from '@/lib/follow-ups';
import { formatDateTime } from '@/lib/format';
import { FOLLOW_UP_CHANNEL_LABEL, FOLLOW_UP_STATUS_DISPLAY } from '@/lib/status';
import { WhatsAppPreview } from './whatsapp-preview';

/**
 * How many message previews to render.
 *
 * Every follow-up in the table used to get its own preview card, which on a
 * workspace with a few dozen of them produced a page metres long that nobody
 * could scan. The table above is the complete list; these are the ones worth
 * looking at, which means the ones still waiting to go out.
 */
const PREVIEW_LIMIT = 6;

/** Pending first, then the rest, capped. */
function previewSelection(followUps: readonly FollowUp[]): string[] {
  const pending = followUps.filter((item) => item.status === 'PENDING');
  const rest = followUps.filter((item) => item.status !== 'PENDING');
  return [...pending, ...rest].slice(0, PREVIEW_LIMIT).map((item) => item.id);
}

const COLUMNS = [
  { key: 'lead', header: 'Lead' },
  { key: 'channel', header: 'Channel' },
  { key: 'status', header: 'Status' },
  { key: 'scheduled', header: 'Scheduled' },
  { key: 'sent', header: 'Sent' },
] as const;

type LoadState =
  | { phase: 'loading' }
  | { phase: 'ready'; followUps: FollowUp[] }
  | { phase: 'error'; message: string };

export function WhatsAppView() {
  const [state, setState] = useState<LoadState>({ phase: 'loading' });
  // Which follow-ups get a preview card, chosen once per load. Re-deriving it
  // from the current rows would pull a card out from under the user the moment
  // they sent it, since sending moves that row out of the pending group.
  const [previewIds, setPreviewIds] = useState<string[]>([]);
  const requestRef = useRef(0);

  const load = useCallback(async (signal?: AbortSignal) => {
    const requestId = ++requestRef.current;
    setState({ phase: 'loading' });

    try {
      const followUps = await fetchFollowUps(signal);
      if (requestRef.current !== requestId) return;
      setPreviewIds(previewSelection(followUps));
      setState({ phase: 'ready', followUps });
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
  const pending = followUps.filter((item) => item.status === 'PENDING');
  const byId = new Map(followUps.map((item) => [item.id, item]));
  const previews = previewIds
    .map((id) => byId.get(id))
    .filter((item): item is FollowUp => item !== undefined);

  return (
    <SectionPage
      eyebrow="Follow-up channel"
      title="WhatsApp"
      subtitle="Turn missed calls into conversations without losing context."
    >
      <p className="demo-banner" role="note">
        <strong>Demo / Simulated WhatsApp.</strong> No WhatsApp Business account is connected to
        this workspace, so nothing here is delivered to a phone. &ldquo;Simulate Send&rdquo; records
        what would have been sent, on the real follow-up and the lead&rsquo;s timeline, so the rest
        of the product can be seen working before a messaging provider is bought.
      </p>

      <Card>
        <CardHeader
          title="Follow-ups"
          subtitle={
            state.phase === 'ready'
              ? `${followUps.length.toLocaleString()} scheduled · ${pending.length.toLocaleString()} waiting to go out`
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
            icon="message"
            title="No follow-ups yet"
            description="When a campaign call goes unanswered or a lead asks to be contacted later, the follow-up is scheduled here."
            actions={
              <Link className="primary-button" href="/campaigns">
                Go to campaigns
              </Link>
            }
          />
        ) : (
          <DataTable columns={COLUMNS} caption="Follow-ups for this workspace">
            {followUps.map((followUp) => (
              <tr key={followUp.id}>
                <td>
                  <div className="lead-name">
                    <span>
                      <strong>{followUpLeadName(followUp)}</strong>
                      {followUp.leadPhone ? (
                        <span className="lead-sub">{followUp.leadPhone}</span>
                      ) : null}
                    </span>
                  </div>
                </td>
                <td className="muted">{FOLLOW_UP_CHANNEL_LABEL[followUp.channel]}</td>
                <td>
                  <StatusBadge status={FOLLOW_UP_STATUS_DISPLAY[followUp.status]} />
                </td>
                <td className="muted">{formatDateTime(followUp.scheduledAt)}</td>
                <td className="muted">{formatDateTime(followUp.sentAt)}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </Card>

      {previews.length > 0 ? (
        <Card>
          <CardHeader
            title="Message preview"
            subtitle={
              previews.length < followUps.length
                ? `Exactly what would be sent, as it is stored — showing ${previews.length} of ${followUps.length}`
                : 'Exactly what would be sent, as it is stored'
            }
          />
          <div className="card-body follow-up-stack">
            {previews.map((followUp) => (
              <WhatsAppPreview key={followUp.id} followUp={followUp} onChange={handleChange} />
            ))}
          </div>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title="Before you connect a real account"
          subtitle="What WhatsApp requires from your business"
        />
        <div className="card-body">
          <ul className="notes">
            <li>An official WhatsApp Business account, verified against your business.</li>
            <li>
              Pre-approved message templates. WhatsApp does not allow free-form messages to someone
              who has not messaged you in the last 24 hours, so the first follow-up must use a
              template.
            </li>
            <li>A dedicated phone number that is not already registered to WhatsApp.</li>
          </ul>
        </div>
      </Card>
    </SectionPage>
  );
}
