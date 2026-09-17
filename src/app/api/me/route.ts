import { requireAuth } from '@/lib/api/auth'
import { capabilitiesFor } from '@/server/capabilities'

/**
 * Diagnostic endpoint: confirms that the browser session, the server session
 * and workspace resolution all agree.
 *
 * Returns identifiers only — never tokens, keys or other auth internals.
 *
 * Capabilities are included because the shell has to know which controls to
 * render, and they are resolved here from the workspace the session actually
 * belongs to. They are a description of what this workspace may do, not the
 * permission itself: anything a capability unlocks is checked again on the
 * server when it is used, so a browser that edited this response would gain a
 * button and nothing behind it.
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
      capabilities: capabilitiesFor(auth.workspaceId),
    },
  })
}
