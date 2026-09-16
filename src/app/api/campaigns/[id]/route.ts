import { z } from 'zod'
import { requireAuth } from '@/lib/api/auth'
import { aiCallConfigSchema } from '@/domain/ai-config'

/**
 * Single-campaign routes.
 *
 * `GET` returns the campaign with its agent and a progress count, because every
 * view that shows a campaign needs all three and would otherwise make three
 * round trips.
 */

const updateSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    agent_id: z.string().uuid(),
    max_attempts: z.number().int().min(1).max(10),
    whatsapp_fallback_enabled: z.boolean(),
    whatsapp_fallback_delay_minutes: z.number().int().min(0).max(10080),
    // Replaced wholesale rather than merged: the form always sends the full
    // configuration, and a partial merge would make clearing a field
    // impossible.
    ai_call_config: aiCallConfigSchema,
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  })

const idSchema = z.string().uuid()

function notFound() {
  return Response.json(
    { error: { code: 'CAMPAIGN_NOT_FOUND', message: 'Campaign not found' } },
    { status: 404 }
  )
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request)
  if (auth instanceof Response) return auth

  const { id } = await context.params
  if (!idSchema.safeParse(id).success) return notFound()

  const { data: campaign, error } = await auth.supabase
    .from('campaigns')
    .select('*, agents(id, name, company_name, purpose, active)')
    .eq('workspace_id', auth.workspaceId)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return Response.json(
      { error: { code: 'CAMPAIGN_LOOKUP_FAILED', message: error.message } },
      { status: 500 }
    )
  }
  if (!campaign) return notFound()

  // Attached leads, with the call rows that belong to this campaign so the
  // detail view can show progress without a second request.
  const { data: members } = await auth.supabase
    .from('campaign_leads')
    .select('lead_id, attempts, last_attempt_at, next_attempt_at, leads(id, name, phone, company, status)')
    .eq('campaign_id', id)
    .order('created_at', { ascending: true })

  const { data: calls } = await auth.supabase
    .from('calls')
    .select('id, lead_id, status, outcome, duration_seconds, created_at')
    .eq('workspace_id', auth.workspaceId)
    .eq('campaign_id', id)
    .order('created_at', { ascending: false })

  return Response.json({ data: { campaign, members: members ?? [], calls: calls ?? [] } })
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

  // A campaign may only point at an agent from its own workspace. Checked here
  // rather than trusted from the client, which never supplies a workspace.
  if (parsed.data.agent_id) {
    const { data: agent } = await auth.supabase
      .from('agents')
      .select('id')
      .eq('id', parsed.data.agent_id)
      .eq('workspace_id', auth.workspaceId)
      .maybeSingle()

    if (!agent) {
      return Response.json(
        { error: { code: 'AGENT_NOT_FOUND', message: 'Agent does not belong to this workspace' } },
        { status: 400 }
      )
    }
  }

  const { data, error } = await auth.supabase
    .from('campaigns')
    .update(parsed.data)
    .eq('workspace_id', auth.workspaceId)
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error) {
    return Response.json(
      { error: { code: 'CAMPAIGN_UPDATE_FAILED', message: error.message } },
      { status: 500 }
    )
  }
  if (!data) return notFound()

  return Response.json({ data })
}
