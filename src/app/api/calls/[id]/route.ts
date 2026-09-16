import { z } from 'zod'
import { requireAuth } from '@/lib/api/auth'

/**
 * One call, with everything its detail page shows.
 *
 * The transcript and summary are returned exactly as they were stored when the
 * call was recorded. Nothing is regenerated here: a transcript is a record of
 * what was said, and re-deriving it on read would mean the page could show
 * something the call never contained.
 *
 * Follow-ups are returned alongside because a follow-up is only meaningful next
 * to the call that caused it. `follow_ups.call_id` is the link when it is set.
 * The demo runner cannot set it — it writes its follow-ups in the same batch
 * that inserts the calls, before their ids exist — so it stamps
 * `metadata.campaign_id` instead, and that is used as the fallback. Matching on
 * the lead alone would be wrong: a lead called by two campaigns would show both
 * campaigns' follow-ups under each of their calls.
 */

const idSchema = z.string().uuid()

const CALL_SELECT = `
  id, workspace_id, lead_id, agent_id, campaign_id, provider, provider_call_id,
  phone_number, status, outcome, started_at, ended_at, duration_seconds,
  transcript, summary, metadata, created_at,
  leads(id, name, company, phone, email, status),
  campaigns(id, name, status),
  agents(id, name, company_name, purpose)
`

const FOLLOW_UP_SELECT = `
  id, workspace_id, lead_id, call_id, channel, status, scheduled_at, sent_at,
  message_template, provider, metadata, created_at,
  leads(id, name, phone)
`

function notFound() {
  return Response.json(
    { error: { code: 'CALL_NOT_FOUND', message: 'Call not found' } },
    { status: 404 }
  )
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request)
  if (auth instanceof Response) return auth

  const { id } = await context.params
  if (!idSchema.safeParse(id).success) return notFound()

  const { data: call, error } = await auth.supabase
    .from('calls')
    .select(CALL_SELECT)
    .eq('workspace_id', auth.workspaceId)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return Response.json(
      { error: { code: 'CALL_LOOKUP_FAILED', message: error.message } },
      { status: 500 }
    )
  }

  if (!call) return notFound()

  // Scoped by workspace as well as by lead: the lead id came from a row this
  // session was already allowed to read, but the filter does not rely on that.
  const { data: followUps } = await auth.supabase
    .from('follow_ups')
    .select(FOLLOW_UP_SELECT)
    .eq('workspace_id', auth.workspaceId)
    .eq('lead_id', call.lead_id)
    .order('scheduled_at', { ascending: true })

  const related = (followUps ?? []).filter((row) => {
    if (row.call_id) return row.call_id === call.id
    const campaignId = (row.metadata as Record<string, unknown> | null)?.campaign_id
    return campaignId === call.campaign_id
  })

  return Response.json({ data: { call, followUps: related } })
}
