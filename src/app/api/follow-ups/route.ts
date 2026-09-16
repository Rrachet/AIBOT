import { requireAuth } from '@/lib/api/auth'

/**
 * Follow-ups for the session's workspace.
 *
 * Pending first and soonest first, because the list exists to answer "what is
 * waiting to go out?" before "what already went?".
 */

const MAX_LIMIT = 100

const SELECT = `
  id, workspace_id, lead_id, call_id, channel, status, scheduled_at, sent_at,
  message_template, provider, metadata, created_at,
  leads(id, name, phone, company)
`

export async function GET(request: Request) {
  const auth = await requireAuth(request)
  if (auth instanceof Response) return auth

  const url = new URL(request.url)
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? '50'), 1), MAX_LIMIT)
  const status = url.searchParams.get('status')

  let query = auth.supabase
    .from('follow_ups')
    .select(SELECT)
    .eq('workspace_id', auth.workspaceId)
    .order('scheduled_at', { ascending: true })
    .limit(limit)

  if (status) query = query.eq('status', status)

  const { data, error } = await query

  if (error) {
    return Response.json(
      { error: { code: 'FOLLOW_UPS_LOOKUP_FAILED', message: error.message } },
      { status: 500 }
    )
  }

  return Response.json({ data: data ?? [] })
}
