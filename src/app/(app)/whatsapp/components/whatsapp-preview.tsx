'use client';

import { useState } from 'react';
import { Icon } from '@/components/icons';
import { StatusBadge } from '@/components/ui/badge';
import { DemoMessageTag } from '@/components/ui/demo-tag';
import type { FollowUp } from '@/domain/types';
import { ApiError } from '@/lib/api/client';
import { followUpLeadName, simulateSend } from '@/lib/follow-ups';
import { formatDateTime } from '@/lib/format';
import { FOLLOW_UP_CHANNEL_LABEL, FOLLOW_UP_STATUS_DISPLAY } from '@/lib/status';

/**
 * A follow-up shown the way it would arrive.
 *
 * The bubble renders `follow_ups.message_template` exactly as it is stored —
 * this is a preview of a real row, not a mock-up, so what is on screen is what
 * would be sent. "Simulate send" moves the row to SENT and writes the lead's
 * timeline entry; it contacts no messaging provider, and the label above the
 * bubble says so before anyone clicks it.
 */
export function WhatsAppPreview({
  followUp,
  onChange,
}: {
  followUp: FollowUp;
  onChange?: (updated: FollowUp) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status = FOLLOW_UP_STATUS_DISPLAY[followUp.status];
  const sent = followUp.status === 'SENT' || followUp.status === 'COMPLETED';
  const sendable = followUp.status === 'PENDING' || followUp.status === 'FAILED';

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      const updated = await simulateSend(followUp.id);
      onChange?.(updated);
    } catch (caught) {
      const apiError = caught instanceof ApiError ? caught : null;
      setError(apiError?.message ?? 'We could not update this follow-up.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wa-preview" data-follow-up-id={followUp.id} data-status={followUp.status}>
      <div className="wa-preview-head">
        <div className="wa-preview-who">
          <span className="wa-avatar" aria-hidden="true">
            <Icon name="message" size={16} />
          </span>
          <span>
            <strong>{followUpLeadName(followUp)}</strong>
            <span className="wa-preview-meta">
              {followUp.leadPhone ?? FOLLOW_UP_CHANNEL_LABEL[followUp.channel]}
            </span>
          </span>
        </div>
        <span className="cell-stack">
          <StatusBadge status={status} />
          {followUp.simulated ? <DemoMessageTag /> : null}
        </span>
      </div>

      <div className="wa-window">
        {followUp.messageTemplate ? (
          <div className="wa-bubble">
            <span className="wa-bubble-text">{followUp.messageTemplate}</span>
            <span className="wa-bubble-time">
              {sent ? formatDateTime(followUp.sentAt) : 'Not sent'}
              <Icon name={sent ? 'check' : 'clock'} size={12} />
            </span>
          </div>
        ) : (
          <p className="wa-empty">No message was composed for this follow-up.</p>
        )}
      </div>

      <div className="wa-preview-foot">
        <span className="wa-schedule">
          {sent ? (
            <>Sent {formatDateTime(followUp.sentAt)}</>
          ) : (
            <>Scheduled for {formatDateTime(followUp.scheduledAt)}</>
          )}
        </span>

        {sendable ? (
          <button type="button" className="secondary-button" onClick={() => void send()} disabled={busy}>
            <Icon name="message" size={15} />
            {busy ? 'Working…' : 'Simulate Send'}
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="form-alert" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
