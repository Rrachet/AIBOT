import { requireAuth } from '@/lib/api/auth'

/**
 * Call history for the session's workspace.
 *
 * The lead, campaign and agent are embedded rather than fetched per row, so
 * the calls table renders names without the client issuing a request per
 * call. Every row is filtered by the workspace resolved from the session;
 * the browser never supplies one.
 */

const MAX_LIMIT = 100

/**
 * Columns the list needs. `transcript` is deliberately absent — it is large and
 * only the detail route shows it.
 */
const SELECT = `
  id, workspace_id, lead_id, agent_id, campaign_id, provider, provider_call_id,
  phone_number, status, outcome, started_at, ended_at, duration_seconds,
  summary, metadata, created_at,
  leads(id, name, company, phone),
  campaigns(id, name),
  agents(id, name)
`

export async function GET(request: Request) {
  const auth = await requireAuth(request)
  if (auth instanceof Response) return auth

  const url = new URL(request.url)
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? '50'), 1), MAX_LIMIT)
  const campaignId = url.searchParams.get('campaignId')
  const leadId = url.searchParams.get('leadId')

  let query = auth.supabase
    .from('calls')
    .select(SELECT)
    .eq('workspace_id', auth.workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit)

  // Filters narrow within the workspace; they can never widen it.
  if (campaignId) query = query.eq('campaign_id', campaignId)
  if (leadId) query = query.eq('lead_id', leadId)

  const { data, error } = await query

  if (error) {
    return Response.json(
      { error: { code: 'CALLS_LOOKUP_FAILED', message: error.message } },
      { status: 500 }
    )
  }

  return Response.json({ data: data ?? [] })
}
