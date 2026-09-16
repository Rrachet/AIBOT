import { z } from 'zod'
import { requireAuth } from '@/lib/api/auth'

/**
 * Pauses a campaign.
 *
 * Nothing is deleted: calls, outcomes and follow-ups already recorded stay
 * exactly as they are, and only further execution is prevented. A campaign that
 * is not running is returned unchanged rather than treated as an error.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request)
  if (auth instanceof Response) return auth

  const { id } = await context.params
  if (!z.string().uuid().safeParse(id).success) {
    return Response.json(
      { error: { code: 'CAMPAIGN_NOT_FOUND', message: 'Campaign not found' } },
      { status: 404 }
    )
  }

  const { data: campaign } = await auth.supabase
    .from('campaigns')
    .select('id, status')
    .eq('workspace_id', auth.workspaceId)
    .eq('id', id)
    .maybeSingle()

  if (!campaign) {
    return Response.json(
      { error: { code: 'CAMPAIGN_NOT_FOUND', message: 'Campaign not found' } },
      { status: 404 }
    )
  }

  if (campaign.status !== 'RUNNING') {
    return Response.json({ data: campaign })
  }

  const { data, error } = await auth.supabase
    .from('campaigns')
    .update({ status: 'PAUSED' })
    .eq('workspace_id', auth.workspaceId)
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error || !data) {
    return Response.json(
      { error: { code: 'CAMPAIGN_STOP_FAILED', message: error?.message ?? 'Could not stop' } },
      { status: 500 }
    )
  }

  return Response.json({ data })
}
