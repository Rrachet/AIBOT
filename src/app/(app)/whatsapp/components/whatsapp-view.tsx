'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/icons';
import { SectionPage } from '@/components/section-page';
import { Card, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import type { FollowUp } from '@/domain/types';
import { ApiError } from '@/lib/api/client';
import { fetchFollowUps } from '@/lib/follow-ups';
import { WhatsAppPreview } from './whatsapp-preview';

/**
 * The message centre.
 *
 * `/follow-ups` owns the queue — what is owed, to whom, and when. This page
 * owns the message itself: exactly what would arrive on the lead's phone,
 * rendered from the stored row rather than a mock-up. Splitting the two keeps
 * this page scannable; the previous single page put a metre of bubbles under
 * a table nobody could then get back to.
 */

/**
 * How many previews to render. The queue is the complete list; these are the
 * ones worth reading, which means the ones still waiting to go out.
 */
const PREVIEW_LIMIT = 6;

/** Pending first, then the rest, capped. */
function previewSelection(followUps: readonly FollowUp[]): string[] {
  const pending = followUps.filter((item) => item.status === 'PENDING');
  const rest = followUps.filter((item) => item.status !== 'PENDING');
  return [...pending, ...rest].slice(0, PREVIEW_LIMIT).map((item) => item.id);
}

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
      eyebrow="Message centre"
      title="WhatsApp"
      subtitle="Read the message before it goes out, and send it from here."
      actions={
        <Link className="secondary-button" href="/follow-ups">
          <Icon name="clock" size={15} />
          Open the queue
        </Link>
      }
    >
      <p className="demo-banner" role="note">
        <strong>Demo / Simulated WhatsApp.</strong> No WhatsApp Business account is connected to
        this workspace, so nothing here is delivered to a phone. &ldquo;Simulate Send&rdquo; records
        what would have been sent, on the real follow-up and the lead&rsquo;s timeline, so the rest
        of the product can be seen working before a messaging provider is bought.
      </p>

      <Card tourTarget="whatsapp-messages">
        <CardHeader
          title="Messages"
          subtitle={
            state.phase === 'ready'
              ? previews.length < followUps.length
                ? `${pending.length.toLocaleString()} waiting to go out · showing ${previews.length} of ${followUps.length}`
                : `${pending.length.toLocaleString()} waiting to go out`
              : 'Loading…'
          }
        />

        {state.phase === 'loading' ? (
          <div className="card-body">
            <span className="skeleton" style={{ width: 240 }} />
            <span className="skeleton" style={{ width: 300, marginTop: 10 }} />
            <span className="skeleton" style={{ width: 180, marginTop: 10 }} />
          </div>
        ) : state.phase === 'error' ? (
          <EmptyState
            icon="alert"
            title="We could not load your messages"
            description={state.message}
            actions={
              <button type="button" className="secondary-button" onClick={() => void load()}>
                Try again
              </button>
            }
          />
        ) : previews.length === 0 ? (
          <EmptyState
            icon="message"
            title="No messages yet"
            description="When a campaign call goes unanswered or a lead asks to be contacted later, AIBOT writes the follow-up message and it appears here, ready to read and send."
            actions={
              <Link className="primary-button" href="/campaigns">
                Run a campaign
              </Link>
            }
          />
        ) : (
          <div className="card-body follow-up-stack">
            {previews.map((followUp) => (
              <WhatsAppPreview key={followUp.id} followUp={followUp} onChange={handleChange} />
            ))}
          </div>
        )}

        {state.phase === 'ready' && previews.length < followUps.length ? (
          <div className="table-foot">
            <Link className="table-link" href="/follow-ups">
              See all {followUps.length.toLocaleString()} follow-ups in the queue
            </Link>
          </div>
        ) : null}
      </Card>

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
