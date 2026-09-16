import type { FollowUp, FollowUpChannel, FollowUpStatus } from '@/domain/types'
import { ApiError, asString, isRecord, request } from '@/lib/api/client'
import { FOLLOW_UP_CHANNEL_LABEL, FOLLOW_UP_STATUS_DISPLAY } from '@/lib/status'

/** Client-side boundary for `/api/follow-ups`. */

const STATUSES = Object.keys(FOLLOW_UP_STATUS_DISPLAY) as FollowUpStatus[]
const CHANNELS = Object.keys(FOLLOW_UP_CHANNEL_LABEL) as FollowUpChannel[]

function embeddedLead(value: Record<string, unknown>): Record<string, unknown> | null {
  const related = value.leads
  const lead = Array.isArray(related) ? related[0] : related
  return isRecord(lead) ? lead : null
}

export function toFollowUp(value: unknown): FollowUp | null {
  if (!isRecord(value)) return null

  const id = asString(value.id)
  const leadId = asString(value.lead_id)
  const scheduledAt = asString(value.scheduled_at)
  if (!id || !leadId || !scheduledAt) return null

  const lead = embeddedLead(value)
  const channel = asString(value.channel)
  const status = asString(value.status)
  const metadata = isRecord(value.metadata) ? value.metadata : {}

  return {
    id,
    workspaceId: asString(value.workspace_id) ?? '',
    leadId,
    leadName: lead ? asString(lead.name) : null,
    leadPhone: lead ? asString(lead.phone) : null,
    callId: asString(value.call_id),
    channel: CHANNELS.includes(channel as FollowUpChannel)
      ? (channel as FollowUpChannel)
      : 'WHATSAPP',
    status: STATUSES.includes(status as FollowUpStatus)
      ? (status as FollowUpStatus)
      : 'PENDING',
    scheduledAt,
    sentAt: asString(value.sent_at),
    messageTemplate: asString(value.message_template),
    provider: asString(value.provider),
    simulated: metadata.simulated === true,
  }
}

export async function fetchFollowUps(signal?: AbortSignal): Promise<FollowUp[]> {
  const data = await request('/api/follow-ups', {
    method: 'GET',
    signal,
    fallback: 'The server did not return your follow-ups. This is usually temporary.',
  })

  const rows = Array.isArray(data) ? data : []
  return rows.map(toFollowUp).filter((item): item is FollowUp => item !== null)
}

/**
 * Marks a follow-up as sent. Nothing is transmitted — see the route comment.
 * Returns the row as the server wrote it, so the UI renders the stored state
 * rather than a guess at what the update did.
 */
export async function simulateSend(id: string): Promise<FollowUp> {
  const data = await request(`/api/follow-ups/${id}/send`, {
    method: 'POST',
    fallback: 'The server could not update this follow-up. Please try again.',
  })

  const followUp = toFollowUp(data)
  if (!followUp) {
    throw new ApiError('The follow-up was updated but could not be read back.', { status: 200 })
  }
  return followUp
}

export function followUpLeadName(followUp: Pick<FollowUp, 'leadName'>): string {
  return followUp.leadName?.trim() || 'Unnamed lead'
}
