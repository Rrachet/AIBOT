import { z } from 'zod'
import { requireAuth } from '@/lib/api/auth'

/**
 * Moves a campaign into RUNNING.
 *
 * Validates the three things that make a campaign runnable — it exists in this
 * workspace, its agent is present and active, and it has at least one attached
 * lead — and refuses with a message naming the missing one rather than a
 * generic failure. Starting is idempotent: a campaign already RUNNING returns
 * its current state instead of erroring.
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
    .select('id, status, agent_id, agents(id, active)')
    .eq('workspace_id', auth.workspaceId)
    .eq('id', id)
    .maybeSingle()

  if (!campaign) {
    return Response.json(
      { error: { code: 'CAMPAIGN_NOT_FOUND', message: 'Campaign not found' } },
      { status: 404 }
    )
  }

  if (campaign.status === 'COMPLETED' || campaign.status === 'CANCELLED') {
    return Response.json(
      {
        error: {
          code: 'CAMPAIGN_FINISHED',
          message: 'This campaign has finished and cannot be started again.',
        },
      },
      { status: 409 }
    )
  }

  const agent = Array.isArray(campaign.agents) ? campaign.agents[0] : campaign.agents
  if (!agent) {
    return Response.json(
      { error: { code: 'AGENT_MISSING', message: 'This campaign has no agent assigned.' } },
      { status: 409 }
    )
  }
  if (agent.active === false) {
    return Response.json(
      {
        error: {
          code: 'AGENT_PAUSED',
          message: 'The assigned agent is paused. Activate it before starting the campaign.',
        },
      },
      { status: 409 }
    )
  }

  const { count } = await auth.supabase
    .from('campaign_leads')
    .select('lead_id', { count: 'exact', head: true })
    .eq('campaign_id', id)

  if (!count) {
    return Response.json(
      {
        error: {
          code: 'NO_LEADS',
          message: 'Attach at least one lead before starting this campaign.',
        },
      },
      { status: 409 }
    )
  }

  if (campaign.status === 'RUNNING') {
    return Response.json({ data: { id, status: 'RUNNING', leads: count } })
  }

  const { data, error } = await auth.supabase
    .from('campaigns')
    .update({ status: 'RUNNING' })
    .eq('workspace_id', auth.workspaceId)
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error || !data) {
    return Response.json(
      { error: { code: 'CAMPAIGN_START_FAILED', message: error?.message ?? 'Could not start' } },
      { status: 500 }
    )
  }

  return Response.json({ data: { ...data, leads: count } })
}
