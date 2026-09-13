import { requireAuth } from '@/lib/api/auth'

/**
 * Diagnostic endpoint: confirms that the browser session, the server session
 * and workspace resolution all agree.
 *
 * Returns identifiers only — never tokens, keys or other auth internals.
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request)
  if (auth instanceof Response) return auth

  return Response.json({
    data: {
      userId: auth.userId,
      workspaceId: auth.workspaceId,
      workspaceName: auth.workspaceName,
      role: auth.role,
    },
  })
}
