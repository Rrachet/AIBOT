import { z } from 'zod'
import { requireAuth } from '@/lib/api/auth'
import { recordActivities } from '@/lib/api/activity'

/** Bounded so one request cannot attach an unbounded number of rows. */
const MAX_ATTACH = 500

const bodySchema = z.object({
  lead_ids: z.array(z.string().uuid()).min(1).max(MAX_ATTACH),
})

/**
 * Attaches leads to a campaign.
 *
 * Both the campaign and every lead are re-read under the session's workspace
 * before anything is written, so an id belonging to another workspace is
 * dropped rather than attached. Leads already on the campaign are reported as
 * skipped instead of failing the request, which makes the call idempotent: the
 * same request twice leaves the same rows.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request)
  if (auth instanceof Response) return auth

  const { id } = await context.params
  if (!z.string().uuid().safeParse(id).success) {
    return Response.json(
      { error: { code: 'CAMPAIGN_NOT_FOUND', message: 'Campaign not found' } },
      { status: 404 }
    )
  }

  const body = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() } },
      { status: 400 }
    )
  }

  const { data: campaign } = await auth.supabase
    .from('campaigns')
    .select('id, status')
    .eq('workspace_id', auth.workspaceId)
    .eq('id', id)
    .maybeSingle()

  if (!campaign) {
    return Response.json(
      { error: { code: 'CAMPAIGN_NOT_FOUND', message: 'Campaign not found' } },
      { status: 404 }
    )
  }

  const requested = [...new Set(parsed.data.lead_ids)]

  // Only ids that are really leads in this workspace survive this query.
  const { data: leads, error: leadsError } = await auth.supabase
    .from('leads')
    .select('id, name, phone')
    .eq('workspace_id', auth.workspaceId)
    .in('id', requested)

  if (leadsError) {
    return Response.json(
      { error: { code: 'LEADS_LOOKUP_FAILED', message: leadsError.message } },
      { status: 500 }
    )
  }

  const owned = leads ?? []
  const rejected = requested.length - owned.length

  const { data: existing } = await auth.supabase
    .from('campaign_leads')
    .select('lead_id')
    .eq('campaign_id', id)

  const already = new Set((existing ?? []).map((row) => row.lead_id as string))
  const toAttach = owned.filter((lead) => !already.has(lead.id))

  if (toAttach.length > 0) {
    const { error } = await auth.supabase
      .from('campaign_leads')
      .insert(toAttach.map((lead) => ({ campaign_id: id, lead_id: lead.id })))

    if (error) {
      return Response.json(
        { error: { code: 'ATTACH_FAILED', message: error.message } },
        { status: 500 }
      )
    }

    await recordActivities(
      auth,
      toAttach.map((lead) => ({
        leadId: lead.id,
        type: 'CAMPAIGN_ATTACHED',
        data: { campaign_id: id },
      }))
    )
  }

  return Response.json({
    data: {
      attached: toAttach.length,
      skipped: owned.length - toAttach.length,
      rejected,
      total: requested.length,
    },
  })
}
