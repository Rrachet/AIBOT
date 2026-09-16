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
