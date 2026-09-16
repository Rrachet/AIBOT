import { z } from 'zod'
import { requireAuth } from '@/lib/api/auth'

/**
 * Single-agent routes.
 *
 * Every query is filtered by the workspace resolved from the session, so an id
 * belonging to another workspace reads as "not found" rather than leaking its
 * existence. The browser never supplies a workspace.
 */

const updateSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    company_name: z.string().trim().max(200).nullable(),
    purpose: z.string().trim().max(500).nullable(),
    instructions: z.string().max(10000).nullable(),
    business_context: z.string().max(10000).nullable(),
    voice_provider: z.string().trim().max(80).nullable(),
    voice_id: z.string().trim().max(200).nullable(),
    active: z.boolean(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  })

const idSchema = z.string().uuid()

function notFound() {
  return Response.json(
    { error: { code: 'AGENT_NOT_FOUND', message: 'Agent not found' } },
    { status: 404 }
  )
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request)
  if (auth instanceof Response) return auth

  const { id } = await context.params
  if (!idSchema.safeParse(id).success) return notFound()

  const { data, error } = await auth.supabase
    .from('agents')
    .select('*')
    .eq('workspace_id', auth.workspaceId)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return Response.json(
      { error: { code: 'AGENT_LOOKUP_FAILED', message: error.message } },
      { status: 500 }
    )
  }
  if (!data) return notFound()

  return Response.json({ data })
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request)
  if (auth instanceof Response) return auth

  const { id } = await context.params
  if (!idSchema.safeParse(id).success) return notFound()

  const body = await request.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() } },
      { status: 400 }
    )
  }

  const { data, error } = await auth.supabase
    .from('agents')
    .update(parsed.data)
    .eq('workspace_id', auth.workspaceId)
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error) {
    return Response.json(
      { error: { code: 'AGENT_UPDATE_FAILED', message: error.message } },
      { status: 500 }
    )
  }
  if (!data) return notFound()

  return Response.json({ data })
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request)
  if (auth instanceof Response) return auth

  const { id } = await context.params
  if (!idSchema.safeParse(id).success) return notFound()

  const { data, error } = await auth.supabase
    .from('agents')
    .delete()
    .eq('workspace_id', auth.workspaceId)
    .eq('id', id)
    .select('id')
    .maybeSingle()

  // campaigns.agent_id is ON DELETE RESTRICT, so an agent in use cannot be
  // removed. Say which constraint stopped it rather than returning a raw
  // Postgres error.
  if (error) {
    const inUse = /foreign key|violates/i.test(error.message)
    return Response.json(
      {
        error: {
          code: inUse ? 'AGENT_IN_USE' : 'AGENT_DELETE_FAILED',
          message: inUse
            ? 'This agent is used by a campaign. Delete or reassign the campaign first.'
            : error.message,
        },
      },
      { status: inUse ? 409 : 500 }
    )
  }
  if (!data) return notFound()

  return new Response(null, { status: 204 })
}
