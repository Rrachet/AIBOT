import type { IconName } from '@/components/icons';
import type { ActivityType } from '@/lib/api/activity';
import type {
  CallOutcome,
  CallStatus,
  CampaignStatus,
  FollowUpChannel,
  FollowUpStatus,
  LeadStatus,
} from '@/domain/types';

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

export const FOLLOW_UP_STATUS_DISPLAY: Record<FollowUpStatus, StatusDisplay> = {
  PENDING: { label: 'Pending', tone: 'purple' },
  SENT: { label: 'Sent', tone: 'green' },
  FAILED: { label: 'Failed', tone: 'red' },
  CANCELLED: { label: 'Cancelled', tone: 'gray' },
  COMPLETED: { label: 'Completed', tone: 'green' },
};

export const FOLLOW_UP_CHANNEL_LABEL: Record<FollowUpChannel, string> = {
  WHATSAPP: 'WhatsApp',
  PHONE: 'Phone',
  EMAIL: 'Email',
};

/**
 * How a timeline entry is shown.
 *
 * Kept here rather than imported from the writer module so a client component
 * rendering the feed does not pull the server-side activity writer into the
 * browser bundle.
 */
export const ACTIVITY_DISPLAY: Record<ActivityType, { label: string; icon: IconName }> = {
  LEAD_CREATED: { label: 'Lead added', icon: 'users' },
  LEAD_IMPORTED: { label: 'Lead imported', icon: 'upload' },
  LEAD_UPDATED: { label: 'Lead updated', icon: 'users' },
  CAMPAIGN_ATTACHED: { label: 'Added to campaign', icon: 'megaphone' },
  CALL_STARTED: { label: 'Call started', icon: 'phone' },
  CALL_COMPLETED: { label: 'Call completed', icon: 'phone' },
  CALL_OUTCOME: { label: 'Outcome recorded', icon: 'target' },
  FOLLOW_UP_SCHEDULED: { label: 'Follow-up scheduled', icon: 'clock' },
  FOLLOW_UP_SENT: { label: 'Follow-up sent', icon: 'message' },
};

/** Falls back gracefully for a type the UI has not been taught yet. */
export function activityDisplay(type: string): { label: string; icon: IconName } {
  return ACTIVITY_DISPLAY[type as ActivityType] ?? { label: 'Activity', icon: 'sparkles' };
}

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
