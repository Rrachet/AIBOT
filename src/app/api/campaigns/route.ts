import { z } from 'zod'
import { requireAuth } from '@/lib/api/auth'
import { aiCallConfigSchema } from '@/domain/ai-config'

const campaignSchema = z.object({
  name: z.string().trim().min(1).max(160),
  agent_id: z.string().uuid(),
  max_attempts: z.number().int().min(1).max(10).default(1),
  whatsapp_fallback_enabled: z.boolean().default(false),
  whatsapp_fallback_delay_minutes: z.number().int().min(0).default(10),
  ai_call_config: aiCallConfigSchema.default({}),
})

export async function GET(request: Request) {
  const auth = await requireAuth(request)
  if (auth instanceof Response) return auth
  // The agent is embedded, not just referenced: the list shows each campaign's
  // agent by name, and selecting `*` alone left every card reading
  // "No agent assigned" however the campaign was actually configured.
  const { data, error } = await auth.supabase
    .from('campaigns')
    .select('*, agents(id, name)')
    .eq('workspace_id', auth.workspaceId)
    .order('created_at', { ascending: false })
  if (error) return Response.json({ error: { code: 'CAMPAIGNS_LOOKUP_FAILED', message: error.message } }, { status: 500 })
  return Response.json({ data: data ?? [] })
}

export async function POST(request: Request) {
  const auth = await requireAuth(request)
  if (auth instanceof Response) return auth
  const body = await request.json().catch(() => null)
  const parsed = campaignSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() } }, { status: 400 })

  const { data: agent } = await auth.supabase.from('agents').select('id').eq('id', parsed.data.agent_id).eq('workspace_id', auth.workspaceId).single()
  if (!agent) return Response.json({ error: { code: 'AGENT_NOT_FOUND', message: 'Agent does not belong to this workspace' } }, { status: 400 })

  const { data, error } = await auth.supabase
    .from('campaigns')
    .insert({ ...parsed.data, workspace_id: auth.workspaceId })
    .select('*, agents(id, name)')
    .single()
  if (error) return Response.json({ error: { code: 'CAMPAIGN_CREATE_FAILED', message: error.message } }, { status: 500 })
  return Response.json({ data }, { status: 201 })
}
