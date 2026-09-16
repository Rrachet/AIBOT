import type { AiCallConfig } from './ai-config';

export type LeadSource = 'MANUAL' | 'CSV' | 'EXCEL' | 'META' | 'WEBSITE' | 'CRM';

export type LeadStatus =
  | 'NEW' | 'QUEUED' | 'CALLING' | 'CONTACTED' | 'NO_ANSWER'
  | 'FAILED' | 'QUALIFIED' | 'NOT_INTERESTED' | 'FOLLOW_UP' | 'COMPLETED';

export type CampaignStatus =
  | 'DRAFT' | 'READY' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export type CallStatus =
  | 'QUEUED' | 'RINGING' | 'IN_PROGRESS' | 'COMPLETED'
  | 'NO_ANSWER' | 'FAILED' | 'CANCELLED';

export type CallOutcome =
  | 'CONNECTED' | 'NO_ANSWER' | 'BUSY' | 'FAILED'
  | 'QUALIFIED' | 'NOT_INTERESTED' | 'FOLLOW_UP';

export interface Lead {
  id: string;
  workspaceId: string;
  name: string | null;
  phone: string;
  email: string | null;
  company: string | null;
  source: LeadSource;
  status: LeadStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Agent {
  id: string;
  workspaceId: string;
  name: string;
  companyName: string | null;
  purpose: string | null;
  instructions: string | null;
  businessContext: string | null;
  voiceProvider: string | null;
  voiceId: string | null;
  active: boolean;
}

export interface Campaign {
  id: string;
  workspaceId: string;
  name: string;
  agentId: string;
  agentName: string | null;
  status: CampaignStatus;
  maxAttempts: number;
  whatsappFallbackEnabled: boolean;
  whatsappFallbackDelayMinutes: number;
  /** What this campaign sells and how it should be talked about. */
  aiCallConfig: AiCallConfig;
  createdAt: string;
}

/** A lead attached to a campaign, with the progress columns that already exist. */
export interface CampaignMember {
  leadId: string;
  name: string | null;
  phone: string;
  company: string | null;
  status: LeadStatus;
  attempts: number;
  lastAttemptAt: string | null;
}

export interface InitiateCallInput {
  workspaceId: string;
  leadId: string;
  phoneNumber: string;
  agentId: string;
  campaignId?: string;
}

export interface CallResult {
  provider: string;
  providerCallId: string;
  status: CallStatus;
}

export interface VoiceProvider {
  initiateCall(input: InitiateCallInput): Promise<CallResult>;
  getCallStatus(providerCallId: string): Promise<CallStatus>;
  getRecording?(providerCallId: string): Promise<string | null>;
  getTranscript?(providerCallId: string): Promise<string | null>;
}

export type FollowUpChannel = 'WHATSAPP' | 'PHONE' | 'EMAIL';

export type FollowUpStatus = 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED' | 'COMPLETED';

/**
 * A call as the UI reads it.
 *
 * `simulated` is not a database column; it is read from `metadata.simulated`,
 * which the demo runner stamps on every row it writes. The UI keys its
 * "Demo call" labelling off this, so a simulated call can never be presented
 * as one that reached a real phone.
 */
export interface Call {
  id: string;
  workspaceId: string;
  leadId: string;
  leadName: string | null;
  leadCompany: string | null;
  campaignId: string | null;
  campaignName: string | null;
  agentId: string | null;
  agentName: string | null;
  phoneNumber: string;
  status: CallStatus;
  outcome: CallOutcome | null;
  durationSeconds: number;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  provider: string | null;
  simulated: boolean;
}

/** A call plus the parts only its own page shows. */
export interface CallDetail extends Call {
  transcript: string | null;
  summary: string | null;
  nextAction: string | null;
  followUps: FollowUp[];
}

export interface FollowUp {
  id: string;
  workspaceId: string;
  leadId: string;
  leadName: string | null;
  leadPhone: string | null;
  callId: string | null;
  channel: FollowUpChannel;
  status: FollowUpStatus;
  scheduledAt: string;
  sentAt: string | null;
  messageTemplate: string | null;
  provider: string | null;
  simulated: boolean;
}
