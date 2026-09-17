import { z } from 'zod'
import { requireAuth } from '@/lib/api/auth'
import { capabilitiesFor } from '@/server/capabilities'

/**
 * The workspace the session belongs to.
 *
 * The id is never taken from the request: `requireAuth` resolves it from
 * `workspace_members` for the authenticated user, and the update is filtered by
 * that id. The `workspace_update` RLS policy narrows it further to owners and
 * admins, so a member without the role gets no rows back and is told they
 * cannot rename it rather than silently appearing to succeed.
 */

const updateSchema = z.object({
  name: z.string().trim().min(1, 'Give your workspace a name.').max(120),
})

export async function GET(request: Request) {
  const auth = await requireAuth(request)
  if (auth instanceof Response) return auth

  return Response.json({
    data: {
      workspaceId: auth.workspaceId,
      workspaceName: auth.workspaceName,
      role: auth.role,
      capabilities: capabilitiesFor(auth.workspaceId),
    },
  })
}

export async function PATCH(request: Request) {
  const auth = await requireAuth(request)
  if (auth instanceof Response) return auth

  const body = await request.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() } },
      { status: 400 }
    )
  }

  const { data, error } = await auth.supabase
    .from('workspaces')
    .update({ name: parsed.data.name })
    .eq('id', auth.workspaceId)
    .select('id, name')
    .maybeSingle()

  if (error) {
    return Response.json(
      { error: { code: 'WORKSPACE_UPDATE_FAILED', message: error.message } },
      { status: 500 }
    )
  }

  // No row came back although the workspace exists: RLS refused the update
  // because this member is neither owner nor admin.
  if (!data) {
    return Response.json(
      {
        error: {
          code: 'WORKSPACE_FORBIDDEN',
          message: 'Only an owner or admin can rename this workspace.',
        },
      },
      { status: 403 }
    )
  }

  // Capabilities are resolved from the id, which a rename cannot change. They
  // are returned so the caller's picture of the workspace stays complete rather
  // than silently losing them on a save.
  return Response.json({
    data: {
      workspaceId: data.id,
      workspaceName: data.name,
      role: auth.role,
      capabilities: capabilitiesFor(auth.workspaceId),
    },
  })
}
