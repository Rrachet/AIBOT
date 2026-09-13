import { z } from 'zod'
import { requireAuth } from '@/lib/api/auth'

const agentSchema = z.object({
  name: z.string().trim().min(1).max(120),
  company_name: z.string().trim().max(200).optional().nullable(),
  purpose: z.string().trim().max(500).optional().nullable(),
  instructions: z.string().max(10000).optional().nullable(),
  business_context: z.string().max(10000).optional().nullable(),
  voice_provider: z.string().trim().max(80).optional().nullable(),
  voice_id: z.string().trim().max(200).optional().nullable(),
  active: z.boolean().optional(),
})

export async function GET(request: Request) {
  const auth = await requireAuth(request)
  if (auth instanceof Response) return auth
  const { data, error } = await auth.supabase.from('agents').select('*').eq('workspace_id', auth.workspaceId).order('created_at', { ascending: false })
  if (error) return Response.json({ error: { code: 'AGENTS_LOOKUP_FAILED', message: error.message } }, { status: 500 })
  return Response.json({ data: data ?? [] })
}

export async function POST(request: Request) {
  const auth = await requireAuth(request)
  if (auth instanceof Response) return auth
  const body = await request.json().catch(() => null)
  const parsed = agentSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() } }, { status: 400 })

  const { data, error } = await auth.supabase.from('agents').insert({ ...parsed.data, workspace_id: auth.workspaceId }).select('*').single()
  if (error) return Response.json({ error: { code: 'AGENT_CREATE_FAILED', message: error.message } }, { status: 500 })
  return Response.json({ data }, { status: 201 })
}
