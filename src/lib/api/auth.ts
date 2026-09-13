import { createClient } from '@/lib/supabase/server'
import { SupabaseConfigError } from '@/lib/supabase/env'

/** Error codes returned by the API layer. */
export type AuthErrorCode =
  | 'UNAUTHENTICATED'
  | 'NO_WORKSPACE'
  | 'WORKSPACE_FORBIDDEN'
  | 'SUPABASE_NOT_CONFIGURED'

export interface AuthContext {
  supabase: Awaited<ReturnType<typeof createClient>>
  userId: string
  workspaceId: string
  workspaceName: string
  role: string
}

function errorResponse(code: AuthErrorCode, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status })
}

interface MembershipRow {
  workspace_id: string
  role: string
  workspaces: { name: string } | { name: string }[] | null
}

function workspaceName(row: MembershipRow): string {
  const related = row.workspaces
  if (Array.isArray(related)) return related[0]?.name ?? ''
  return related?.name ?? ''
}

/**
 * Resolves the authenticated user and their active workspace for an API route.
 *
 * Returns a `Response` on failure so handlers can `if (auth instanceof Response)
 * return auth`. All failures use the same JSON envelope as the proxy:
 * `{ error: { code, message } }`.
 *
 * Identity comes from the session cookie via `getUser()`, which validates the
 * token against the auth server rather than trusting its contents. The
 * workspace is then resolved from `workspace_members` using that user id, so a
 * client can never assert which workspace it belongs to.
 */
export async function requireAuth(request: Request): Promise<AuthContext | Response> {
  let supabase: Awaited<ReturnType<typeof createClient>>

  try {
    supabase = await createClient()
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      return errorResponse('SUPABASE_NOT_CONFIGURED', error.message, 503)
    }
    throw error
  }

  const { data, error } = await supabase.auth.getUser()
  const userId = error ? undefined : data.user?.id

  if (!userId) {
    return errorResponse('UNAUTHENTICATED', 'Authentication required', 401)
  }

  // `x-workspace-id` only ever narrows the query. It is matched against the
  // caller's own memberships, so an id the user is not a member of returns no
  // row and is rejected below — it can never widen access.
  const requestedWorkspace = request.headers.get('x-workspace-id')

  let query = supabase
    .from('workspace_members')
    .select('workspace_id, role, created_at, workspaces(name)')
    .eq('user_id', userId)

  if (requestedWorkspace) query = query.eq('workspace_id', requestedWorkspace)

  const { data: memberships, error: membershipError } = await query
    .order('created_at', { ascending: true })
    .limit(1)
    .overrideTypes<MembershipRow[]>()

  if (membershipError) {
    return errorResponse('NO_WORKSPACE', 'Could not resolve a workspace for this account.', 403)
  }

  const membership = memberships?.[0]

  if (!membership) {
    // Distinguished so the caller can tell "you asked for a workspace that
    // isn't yours" from "your account has no workspace at all".
    return requestedWorkspace
      ? errorResponse('WORKSPACE_FORBIDDEN', 'You do not have access to that workspace.', 403)
      : errorResponse(
          'NO_WORKSPACE',
          'This account is not a member of any workspace. A workspace is created automatically at signup.',
          403
        )
  }

  return {
    supabase,
    userId,
    workspaceId: membership.workspace_id,
    workspaceName: workspaceName(membership),
    role: membership.role,
  }
}
