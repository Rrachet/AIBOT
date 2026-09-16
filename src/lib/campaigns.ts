import type { Campaign, CampaignMember, CampaignStatus, LeadStatus } from '@/domain/types'
import { readAiCallConfig, type AiCallConfig } from '@/domain/ai-config'
import { ApiError, asBoolean, asNumber, asString, isRecord, request } from '@/lib/api/client'
import { toCallDetail } from '@/lib/calls'
import { CAMPAIGN_STATUS_DISPLAY } from '@/lib/status'

/** Client-side boundary for `/api/campaigns`. */

const STATUSES = Object.keys(CAMPAIGN_STATUS_DISPLAY) as CampaignStatus[]

export interface CampaignInput {
  name: string
  agentId: string
  maxAttempts: number
  whatsappFallbackEnabled: boolean
  whatsappFallbackDelayMinutes: number
}

export const EMPTY_CAMPAIGN: CampaignInput = {
  name: '',
  agentId: '',
  maxAttempts: 1,
  whatsappFallbackEnabled: true,
  whatsappFallbackDelayMinutes: 15,
}

/** The embedded agent arrives as an object or a single-element array. */
function embeddedAgentName(value: unknown): string | null {
  const related = isRecord(value) ? value.agents : undefined
  const agent = Array.isArray(related) ? related[0] : related
  return isRecord(agent) ? asString(agent.name) : null
}

function toCampaign(value: unknown): Campaign | null {
  if (!isRecord(value)) return null

  const id = asString(value.id)
  const agentId = asString(value.agent_id)
  if (!id || !agentId) return null

  const status = asString(value.status)

  return {
    id,
    workspaceId: asString(value.workspace_id) ?? '',
    name: asString(value.name) ?? 'Untitled campaign',
    agentId,
    agentName: embeddedAgentName(value),
    status: STATUSES.includes(status as CampaignStatus) ? (status as CampaignStatus) : 'DRAFT',
    maxAttempts: asNumber(value.max_attempts) ?? 1,
    whatsappFallbackEnabled: asBoolean(value.whatsapp_fallback_enabled, false),
    whatsappFallbackDelayMinutes: asNumber(value.whatsapp_fallback_delay_minutes) ?? 0,
    aiCallConfig: readAiCallConfig(value.ai_call_config),
    createdAt: asString(value.created_at) ?? '',
  }
}

function toMember(value: unknown): CampaignMember | null {
  if (!isRecord(value)) return null

  const related = value.leads
  const lead = Array.isArray(related) ? related[0] : related
  if (!isRecord(lead)) return null

  const leadId = asString(lead.id)
  const phone = asString(lead.phone)
  if (!leadId || !phone) return null

  return {
    leadId,
    name: asString(lead.name),
    phone,
    company: asString(lead.company),
    status: (asString(lead.status) ?? 'NEW') as LeadStatus,
    attempts: asNumber(value.attempts) ?? 0,
    lastAttemptAt: asString(value.last_attempt_at),
  }
}

export interface CampaignDetail {
  campaign: Campaign
  members: CampaignMember[]
  callCount: number
  /**
   * Whether the campaign's agent is currently active. Read from the embedded
   * agent rather than assumed, so an agent paused after the campaign was built
   * still shows up as something to fix.
   */
  agentActive: boolean
}

export async function fetchCampaigns(signal?: AbortSignal): Promise<Campaign[]> {
  const data = await request('/api/campaigns', {
    method: 'GET',
    signal,
    fallback: 'The server did not return your campaigns. This is usually temporary.',
  })
  const rows = Array.isArray(data) ? data : []
  return rows.map(toCampaign).filter((item): item is Campaign => item !== null)
}

export async function fetchCampaign(id: string, signal?: AbortSignal): Promise<CampaignDetail> {
  const data = await request(`/api/campaigns/${id}`, {
    method: 'GET',
    signal,
    fallback: 'The server did not return this campaign.',
  })

  const campaign = toCampaign(isRecord(data) ? data.campaign : null)
  if (!campaign) throw new ApiError('This campaign could not be read.', { status: 404 })

  const memberRows = isRecord(data) && Array.isArray(data.members) ? data.members : []
  const callRows = isRecord(data) && Array.isArray(data.calls) ? data.calls : []

  const embedded = isRecord(data) && isRecord(data.campaign) ? data.campaign.agents : null
  const agentRow = Array.isArray(embedded) ? embedded[0] : embedded

  return {
    campaign,
    members: memberRows.map(toMember).filter((item): item is CampaignMember => item !== null),
    callCount: callRows.length,
    agentActive: isRecord(agentRow) ? asBoolean(agentRow.active, false) : false,
  }
}

/** Replaces this campaign's AI call configuration. */
export async function saveAiCallConfig(
  campaignId: string,
  config: AiCallConfig
): Promise<Campaign> {
  const data = await request(`/api/campaigns/${campaignId}`, {
    method: 'PATCH',
    body: JSON.stringify({ ai_call_config: config }),
    fallback: 'The server could not save this configuration. Please try again.',
  })

  const campaign = toCampaign(data)
  if (!campaign) {
    throw new ApiError('The configuration was saved but could not be read back.', { status: 200 })
  }
  return campaign
}

export interface ScriptUpload {
  script: string
  fileName: string
  characters: number
}

/**
 * Reads a `.txt` or `.md` script server-side and returns its text.
 *
 * Nothing is saved by this call: the text lands in the editor so the user can
 * see what was extracted before saving it with the rest of the configuration.
 */
export async function uploadScript(campaignId: string, file: File): Promise<ScriptUpload> {
  const body = new FormData()
  body.append('file', file)

  const response = await fetch(`/api/campaigns/${campaignId}/script`, {
    method: 'POST',
    body,
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const error = isRecord(payload) && isRecord(payload.error) ? payload.error : null
    throw new ApiError(
      asString(error?.message) ?? 'That file could not be read.',
      { status: response.status, code: asString(error?.code) }
    )
  }

  const data = isRecord(payload) ? payload.data : null
  const script = isRecord(data) ? asString(data.script) : null
  if (!script) throw new ApiError('That file had no readable text.', { status: 400 })

  return {
    script,
    fileName: (isRecord(data) ? asString(data.fileName) : null) ?? file.name,
    characters: (isRecord(data) ? asNumber(data.characters) : null) ?? script.length,
  }
}

export interface TestCallResult {
  callId: string
  status: string
  outcome: string | null
  durationSeconds: number
  transcript: string | null
  summary: string | null
  nextAction: string | null
  contact: { name: string; phone: string }
}

/** Runs one simulated call against this campaign's configuration. */
export async function runTestCall(
  campaignId: string,
  contact: { name: string; phone: string }
): Promise<TestCallResult> {
  const data = await request(`/api/campaigns/${campaignId}/test-call`, {
    method: 'POST',
    body: JSON.stringify(contact),
    fallback: 'The test call could not be completed. Please try again.',
  })

  const call = toCallDetail(isRecord(data) ? data.call : null)
  if (!call) throw new ApiError('The call finished but could not be read back.', { status: 200 })

  return {
    callId: call.id,
    status: call.status,
    outcome: call.outcome,
    durationSeconds: call.durationSeconds,
    transcript: call.transcript,
    summary: call.summary,
    nextAction: call.nextAction,
    contact,
  }
}

export async function createCampaign(input: CampaignInput): Promise<Campaign> {
  const data = await request('/api/campaigns', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name.trim(),
      agent_id: input.agentId,
      max_attempts: input.maxAttempts,
      whatsapp_fallback_enabled: input.whatsappFallbackEnabled,
      whatsapp_fallback_delay_minutes: input.whatsappFallbackDelayMinutes,
    }),
    fallback: 'The server could not create this campaign. Please try again.',
  })

  const campaign = toCampaign(data)
  if (!campaign) throw new ApiError('The campaign was saved but could not be read back.', { status: 201 })
  return campaign
}

export interface AttachResult {
  attached: number
  skipped: number
  rejected: number
  total: number
}

export async function attachLeads(campaignId: string, leadIds: string[]): Promise<AttachResult> {
  const data = await request(`/api/campaigns/${campaignId}/leads`, {
    method: 'POST',
    body: JSON.stringify({ lead_ids: leadIds }),
    fallback: 'The server could not attach these leads. Please try again.',
  })

  return {
    attached: (isRecord(data) ? asNumber(data.attached) : null) ?? 0,
    skipped: (isRecord(data) ? asNumber(data.skipped) : null) ?? 0,
    rejected: (isRecord(data) ? asNumber(data.rejected) : null) ?? 0,
    total: (isRecord(data) ? asNumber(data.total) : null) ?? 0,
  }
}

async function transition(campaignId: string, action: 'start' | 'stop'): Promise<CampaignStatus> {
  const data = await request(`/api/campaigns/${campaignId}/${action}`, {
    method: 'POST',
    fallback: `The server could not ${action} this campaign.`,
  })
  const status = isRecord(data) ? asString(data.status) : null
  return STATUSES.includes(status as CampaignStatus) ? (status as CampaignStatus) : 'DRAFT'
}

export const startCampaign = (id: string) => transition(id, 'start')
export const stopCampaign = (id: string) => transition(id, 'stop')
