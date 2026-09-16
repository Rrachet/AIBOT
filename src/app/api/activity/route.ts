import { requireAuth } from '@/lib/api/auth'

/**
 * The workspace timeline: what has happened, most recent first.
 *
 * `lead_activities` is already written by every operation that matters —
 * imports, campaign attachment, calls, outcomes, follow-ups — so the dashboard
 * reads that record rather than inferring a feed by joining several tables and
 * guessing at their order.
 *
 * The lead is embedded so a row reads as "Rahul Sharma was qualified" rather
 * than as an id, without the client fetching a lead per entry.
 */

const MAX_LIMIT = 50

export async function GET(request: Request) {
  const auth = await requireAuth(request)
  if (auth instanceof Response) return auth

  const url = new URL(request.url)
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? '12'), 1), MAX_LIMIT)
  const leadId = url.searchParams.get('leadId')

  let query = auth.supabase
    .from('lead_activities')
    .select('id, workspace_id, lead_id, type, data, created_at, leads(id, name, company)')
    .eq('workspace_id', auth.workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit)

  // Narrows within the workspace; it can never widen it.
  if (leadId) query = query.eq('lead_id', leadId)

  const { data, error } = await query

  if (error) {
    return Response.json(
      { error: { code: 'ACTIVITY_LOOKUP_FAILED', message: error.message } },
      { status: 500 }
    )
  }

  return Response.json({ data: data ?? [] })
}
