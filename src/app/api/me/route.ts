import { requireAuth } from '@/lib/api/auth'

export async function GET(request: Request) {
  const auth = await requireAuth(request)
  if (auth instanceof Response) return auth

  const { data, error } = await auth.supabase
    .from('workspace_members')
    .select('workspace_id, role, created_at')
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: true })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ userId: auth.userId, activeWorkspaceId: auth.workspaceId, workspaces: data ?? [] })
}
