import type { Call, CallDetail, CallOutcome, CallStatus, FollowUp } from '@/domain/types'
import { ApiError, asNumber, asString, isRecord, request } from '@/lib/api/client'
import { CALL_OUTCOME_DISPLAY, CALL_STATUS_DISPLAY } from '@/lib/status'
import { toFollowUp } from '@/lib/follow-ups'

/** Client-side boundary for `/api/calls`. */

const STATUSES = Object.keys(CALL_STATUS_DISPLAY) as CallStatus[]
const OUTCOMES = Object.keys(CALL_OUTCOME_DISPLAY) as CallOutcome[]

/** An embedded relation arrives as an object or a single-element array. */
export function embedded(value: unknown, key: string): Record<string, unknown> | null {
  const related = isRecord(value) ? value[key] : undefined
  const row = Array.isArray(related) ? related[0] : related
  return isRecord(row) ? row : null
}

function metadata(value: unknown): Record<string, unknown> {
  const meta = isRecord(value) ? value.metadata : undefined
  return isRecord(meta) ? meta : {}
}

/**
 * True when this row was produced by the demo runner rather than a telephony
 * provider. Read from the stamp the runner writes, never inferred from an
 * absent field, so a real call can never be mislabelled as a demo one or the
 * reverse.
 */
export function isSimulated(value: unknown): boolean {
  return metadata(value).simulated === true
}

function toCall(value: unknown): Call | null {
  if (!isRecord(value)) return null

  const id = asString(value.id)
  const leadId = asString(value.lead_id)
  if (!id || !leadId) return null

  const lead = embedded(value, 'leads')
  const campaign = embedded(value, 'campaigns')
  const agent = embedded(value, 'agents')

  const status = asString(value.status)
  const outcome = asString(value.outcome)

  return {
    id,
    workspaceId: asString(value.workspace_id) ?? '',
    leadId,
    leadName: lead ? asString(lead.name) : null,
    leadCompany: lead ? asString(lead.company) : null,
    campaignId: asString(value.campaign_id),
    campaignName: campaign ? asString(campaign.name) : null,
    agentId: asString(value.agent_id),
    agentName: agent ? asString(agent.name) : null,
    phoneNumber: asString(value.phone_number) ?? '',
    status: STATUSES.includes(status as CallStatus) ? (status as CallStatus) : 'QUEUED',
    outcome: OUTCOMES.includes(outcome as CallOutcome) ? (outcome as CallOutcome) : null,
    durationSeconds: asNumber(value.duration_seconds) ?? 0,
    startedAt: asString(value.started_at),
    endedAt: asString(value.ended_at),
    createdAt: asString(value.created_at) ?? '',
    provider: asString(value.provider),
    simulated: isSimulated(value),
  }
}

export async function fetchCalls(
  options: { campaignId?: string; leadId?: string; signal?: AbortSignal } = {}
): Promise<Call[]> {
  const params = new URLSearchParams()
  if (options.campaignId) params.set('campaignId', options.campaignId)
  if (options.leadId) params.set('leadId', options.leadId)
  const query = params.toString()

  const data = await request(`/api/calls${query ? `?${query}` : ''}`, {
    method: 'GET',
    signal: options.signal,
    fallback: 'The server did not return your calls. This is usually temporary.',
  })

  const rows = Array.isArray(data) ? data : []
  return rows.map(toCall).filter((item): item is Call => item !== null)
}

export async function fetchCall(id: string, signal?: AbortSignal): Promise<CallDetail> {
  const data = await request(`/api/calls/${id}`, {
    method: 'GET',
    signal,
    fallback: 'The server did not return this call.',
  })

  const raw = isRecord(data) ? data.call : null
  const call = toCall(raw)
  if (!call || !isRecord(raw)) {
    throw new ApiError('This call could not be read.', { status: 404 })
  }

  const followUpRows = isRecord(data) && Array.isArray(data.followUps) ? data.followUps : []

  return {
    ...call,
    // Stored when the call was recorded, and rendered as stored. The UI never
    // regenerates either: the transcript is a record of what was said.
    transcript: asString(raw.transcript),
    summary: asString(raw.summary),
    nextAction: asString(metadata(raw).next_action),
    followUps: followUpRows
      .map(toFollowUp)
      .filter((item): item is FollowUp => item !== null),
  }
}

/** Display name for a lead, which the database allows to be null. */
export function callLeadName(call: Pick<Call, 'leadName'>): string {
  return call.leadName?.trim() || 'Unnamed lead'
}
