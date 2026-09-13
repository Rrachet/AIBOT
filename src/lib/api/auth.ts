import { createClient } from '@/lib/supabase/server'

export async function requireAuth(request: Request) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub

  if (error || !userId) {
    return Response.json({ error: 'Authentication required' }, { status: 401 })
  }

  const requestedWorkspace = request.headers.get('x-workspace-id')
  let query = supabase.from('workspace_members').select('workspace_id, role, created_at').eq('user_id', userId)
  if (requestedWorkspace) query = query.eq('workspace_id', requestedWorkspace)

  const { data: memberships, error: membershipError } = await query.order('created_at', { ascending: true }).limit(1)
  const membership = memberships?.[0]

  if (membershipError || !membership) {
    return Response.json({ error: 'Workspace required' }, { status: 403 })
  }

  return { supabase, userId, workspaceId: membership.workspace_id, role: membership.role }
}
