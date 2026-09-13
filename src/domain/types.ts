export type LeadSource = 'MANUAL' | 'CSV' | 'EXCEL' | 'META' | 'WEBSITE' | 'CRM';

export type LeadStatus =
  | 'NEW' | 'QUEUED' | 'CALLING' | 'CONTACTED' | 'NO_ANSWER'
  | 'FAILED' | 'QUALIFIED' | 'NOT_INTERESTED' | 'FOLLOW_UP' | 'COMPLETED';

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
