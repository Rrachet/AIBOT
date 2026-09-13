import { requireAuth } from '@/lib/api/auth'

export async function GET(request: Request) {
  const auth = await requireAuth(request)
  if (auth instanceof Response) return auth

  const url = new URL(request.url)
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? '50'), 1), 100)
  const { data, error } = await auth.supabase
    .from('calls')
    .select('*')
    .eq('workspace_id', auth.workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return Response.json({ error: { code: 'CALLS_LOOKUP_FAILED', message: error.message } }, { status: 500 })
  return Response.json({ data: data ?? [] })
}
