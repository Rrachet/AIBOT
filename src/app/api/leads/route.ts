import { z } from 'zod'
import { requireAuth } from '@/lib/api/auth'

const leadSchema = z.object({
  name: z.string().trim().max(200).optional().nullable(),
  phone: z.string().trim().min(5).max(40),
  email: z.string().trim().email().max(320).optional().nullable(),
  company: z.string().trim().max(200).optional().nullable(),
  source: z.enum(['MANUAL', 'CSV', 'EXCEL', 'META', 'WEBSITE', 'CRM']).default('MANUAL'),
  metadata: z.record(z.string(), z.unknown()).default({}),
})

export async function GET(request: Request) {
  const auth = await requireAuth(request)
  if (auth instanceof Response) return auth

  const url = new URL(request.url)
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? '50'), 1), 100)
  const status = url.searchParams.get('status')

  let query = auth.supabase
    .from('leads')
    .select('*')
    .eq('workspace_id', auth.workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return Response.json({ error: { code: 'LEADS_LOOKUP_FAILED', message: error.message } }, { status: 500 })
  return Response.json({ data: data ?? [] })
}

export async function POST(request: Request) {
  const auth = await requireAuth(request)
  if (auth instanceof Response) return auth

  const body = await request.json().catch(() => null)
  const parsed = leadSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() } }, { status: 400 })

  const { data, error } = await auth.supabase
    .from('leads')
    .insert({ ...parsed.data, workspace_id: auth.workspaceId })
    .select('*')
    .single()

  if (error) return Response.json({ error: { code: 'LEAD_CREATE_FAILED', message: error.message } }, { status: 500 })
  return Response.json({ data }, { status: 201 })
}
