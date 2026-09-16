import type { CallOutcome, CallStatus, CampaignStatus, LeadStatus } from '@/domain/types';

/**
 * Visual tones available to badges. Kept deliberately small so status colour
 * stays meaningful: green = good outcome, amber = needs attention,
 * red = failure, purple = in progress / scheduled, gray = neutral.
 */
export type BadgeTone = 'green' | 'amber' | 'red' | 'purple' | 'gray';

export interface StatusDisplay {
  label: string;
  tone: BadgeTone;
}

/**
 * Domain status -> presentation.
 *
 * Views render from these maps rather than hard-coding strings, so the UI is
 * driven by the same union the database will use. Adding a status to the
 * domain type surfaces here as a compile error until it is given a label.
 */
export const LEAD_STATUS_DISPLAY: Record<LeadStatus, StatusDisplay> = {
  NEW: { label: 'New', tone: 'gray' },
  QUEUED: { label: 'Queued', tone: 'gray' },
  CALLING: { label: 'Calling', tone: 'purple' },
  CONTACTED: { label: 'Contacted', tone: 'green' },
  NO_ANSWER: { label: 'No answer', tone: 'amber' },
  FAILED: { label: 'Failed', tone: 'red' },
  QUALIFIED: { label: 'Qualified', tone: 'green' },
  NOT_INTERESTED: { label: 'Not interested', tone: 'red' },
  FOLLOW_UP: { label: 'Follow-up', tone: 'purple' },
  COMPLETED: { label: 'Completed', tone: 'gray' },
};

export const CAMPAIGN_STATUS_DISPLAY: Record<CampaignStatus, StatusDisplay> = {
  DRAFT: { label: 'Draft', tone: 'gray' },
  READY: { label: 'Ready', tone: 'gray' },
  RUNNING: { label: 'Running', tone: 'purple' },
  PAUSED: { label: 'Paused', tone: 'amber' },
  COMPLETED: { label: 'Completed', tone: 'green' },
  CANCELLED: { label: 'Cancelled', tone: 'red' },
};

export const CALL_STATUS_DISPLAY: Record<CallStatus, StatusDisplay> = {
  QUEUED: { label: 'Queued', tone: 'gray' },
  RINGING: { label: 'Ringing', tone: 'purple' },
  IN_PROGRESS: { label: 'In progress', tone: 'purple' },
  COMPLETED: { label: 'Completed', tone: 'green' },
  NO_ANSWER: { label: 'No answer', tone: 'amber' },
  FAILED: { label: 'Failed', tone: 'red' },
  CANCELLED: { label: 'Cancelled', tone: 'gray' },
};

export const CALL_OUTCOME_DISPLAY: Record<CallOutcome, StatusDisplay> = {
  CONNECTED: { label: 'Connected', tone: 'green' },
  NO_ANSWER: { label: 'No answer', tone: 'amber' },
  BUSY: { label: 'Busy', tone: 'amber' },
  FAILED: { label: 'Failed', tone: 'red' },
  QUALIFIED: { label: 'Qualified', tone: 'green' },
  NOT_INTERESTED: { label: 'Not interested', tone: 'red' },
  FOLLOW_UP: { label: 'Follow-up', tone: 'purple' },
};

/** Initials for an avatar, e.g. "Rahul Sharma" -> "RS". */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** Seconds -> "4:32". */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
