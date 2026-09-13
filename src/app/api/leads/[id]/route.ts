import { z } from 'zod'
import { requireAuth } from '@/lib/api/auth'

const updateSchema = z.object({
  name: z.string().trim().max(200).optional().nullable(),
  phone: z.string().trim().min(5).max(40).optional(),
  email: z.string().trim().email().max(320).optional().nullable(),
  company: z.string().trim().max(200).optional().nullable(),
  status: z.enum(['NEW', 'QUEUED', 'CALLING', 'CONTACTED', 'NO_ANSWER', 'FAILED', 'QUALIFIED', 'NOT_INTERESTED', 'FOLLOW_UP', 'COMPLETED']).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request)
  if (auth instanceof Response) return auth
  const { id } = await context.params

  const { data, error } = await auth.supabase.from('leads').select('*').eq('workspace_id', auth.workspaceId).eq('id', id).single()
  if (error) return Response.json({ error: { code: 'LEAD_NOT_FOUND', message: 'Lead not found' } }, { status: 404 })
  return Response.json({ data })
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request)
  if (auth instanceof Response) return auth
  const { id } = await context.params
  const body = await request.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() } }, { status: 400 })

  const { data, error } = await auth.supabase.from('leads').update(parsed.data).eq('workspace_id', auth.workspaceId).eq('id', id).select('*').single()
  if (error) return Response.json({ error: { code: 'LEAD_UPDATE_FAILED', message: error.message } }, { status: 500 })
  return Response.json({ data })
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request)
  if (auth instanceof Response) return auth
  const { id } = await context.params

  const { error } = await auth.supabase.from('leads').delete().eq('workspace_id', auth.workspaceId).eq('id', id)
  if (error) return Response.json({ error: { code: 'LEAD_DELETE_FAILED', message: error.message } }, { status: 500 })
  return new Response(null, { status: 204 })
}
