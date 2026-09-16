import { requireAuth } from '@/lib/api/auth'

/**
 * Every number the dashboard and the analytics page show.
 *
 * One endpoint rather than one per metric: both pages want the same picture of
 * the workspace, and splitting it would mean several round trips to render a
 * single screen.
 *
 * Shape of the work: five bounded queries, not one per lead or per call. Each
 * table is read once with a narrow projection and an exact count, and every
 * breakdown is derived from that in memory. The exact count is authoritative
 * for the headline totals even when the projection is capped, so "Total leads"
 * is always right; only the breakdowns are computed from the sample, and the
 * response says so rather than presenting a partial count as a complete one.
 *
 * Everything is filtered by the workspace `requireAuth` resolved from the
 * session. The browser never supplies a workspace id.
 */

/**
 * How many rows each breakdown is computed from.
 *
 * Generous enough that a demo workspace is always counted in full, bounded so
 * one request cannot pull an unbounded table into memory. When a table is
 * larger than this the response reports it rather than quietly under-counting.
 */
const SAMPLE_LIMIT = 2000

type Counts = Record<string, number>

/** Counts rows by one of their string fields, skipping nulls. */
function tally<T>(rows: readonly T[], pick: (row: T) => string | null): Counts {
  const counts: Counts = {}
  for (const row of rows) {
    const value = pick(row)
    if (value === null) continue
    counts[value] = (counts[value] ?? 0) + 1
  }
  return counts
}

interface CallRow {
  id: string
  status: string
  outcome: string | null
  duration_seconds: number | null
  agent_id: string | null
  campaign_id: string | null
  metadata: Record<string, unknown> | null
}

interface AgentRow {
  id: string
  name: string | null
  active: boolean | null
}

interface CampaignRow {
  id: string
  name: string | null
  status: string
}

interface MemberRow {
  campaign_id: string
  attempts: number | null
}

export async function GET(request: Request) {
  const auth = await requireAuth(request)
  if (auth instanceof Response) return auth

  const [leads, calls, followUps, agents, campaigns] = await Promise.all([
    auth.supabase
      .from('leads')
      .select('id, status', { count: 'exact' })
      .eq('workspace_id', auth.workspaceId)
      .limit(SAMPLE_LIMIT),
    auth.supabase
      .from('calls')
      .select('id, status, outcome, duration_seconds, agent_id, campaign_id, metadata', {
        count: 'exact',
      })
      .eq('workspace_id', auth.workspaceId)
      .order('created_at', { ascending: false })
      .limit(SAMPLE_LIMIT),
    auth.supabase
      .from('follow_ups')
      .select('id, status, channel', { count: 'exact' })
      .eq('workspace_id', auth.workspaceId)
      .limit(SAMPLE_LIMIT),
    auth.supabase
      .from('agents')
      .select('id, name, active')
      .eq('workspace_id', auth.workspaceId),
    auth.supabase
      .from('campaigns')
      .select('id, name, status')
      .eq('workspace_id', auth.workspaceId)
      .order('created_at', { ascending: false }),
  ])

  const failure = [leads, calls, followUps, agents, campaigns].find((result) => result.error)
  if (failure?.error) {
    return Response.json(
      { error: { code: 'ANALYTICS_LOOKUP_FAILED', message: failure.error.message } },
      { status: 500 }
    )
  }

  const leadRows = (leads.data ?? []) as { id: string; status: string }[]
  const callRows = (calls.data ?? []) as unknown as CallRow[]
  const followUpRows = (followUps.data ?? []) as { id: string; status: string; channel: string }[]
  const agentRows = (agents.data ?? []) as AgentRow[]
  const campaignRows = (campaigns.data ?? []) as CampaignRow[]

  // campaign_leads carries no workspace_id of its own, so it is restricted to
  // the campaign ids this workspace owns rather than left to the table's
  // policy. One query for every campaign, not one per campaign.
  const campaignIds = campaignRows.map((row) => row.id)
  const { data: memberData } = campaignIds.length
    ? await auth.supabase
        .from('campaign_leads')
        .select('campaign_id, attempts')
        .in('campaign_id', campaignIds)
    : { data: [] }
  const memberRows = (memberData ?? []) as MemberRow[]

  const leadTotal = leads.count ?? leadRows.length
  const callTotal = calls.count ?? callRows.length
  const followUpTotal = followUps.count ?? followUpRows.length

  const leadStatus = tally(leadRows, (row) => row.status)
  const callStatus = tally(callRows, (row) => row.status)
  const callOutcome = tally(callRows, (row) => row.outcome)
  const followUpStatus = tally(followUpRows, (row) => row.status)

  // Only answered calls have a length worth averaging; including the zeros
  // from unanswered calls would drag the average toward a number no
  // conversation ever lasted.
  const answered = callRows.filter((row) => (row.duration_seconds ?? 0) > 0)
  const totalDuration = answered.reduce((sum, row) => sum + (row.duration_seconds ?? 0), 0)

  const agentName = new Map(agentRows.map((row) => [row.id, row.name ?? 'Unnamed agent']))
  const campaignName = new Map(campaignRows.map((row) => [row.id, row.name ?? 'Untitled campaign']))

  const agentPerformance = agentRows
    .map((agent) => {
      const own = callRows.filter((row) => row.agent_id === agent.id)
      const connected = own.filter((row) => (row.duration_seconds ?? 0) > 0)
      const duration = connected.reduce((sum, row) => sum + (row.duration_seconds ?? 0), 0)
      return {
        agentId: agent.id,
        agentName: agentName.get(agent.id) ?? 'Unnamed agent',
        active: agent.active === true,
        calls: own.length,
        answered: connected.length,
        qualified: own.filter((row) => row.outcome === 'QUALIFIED').length,
        avgDurationSeconds: connected.length > 0 ? Math.round(duration / connected.length) : 0,
      }
    })
    .sort((a, b) => b.calls - a.calls)

  const campaignPerformance = campaignRows
    .map((campaign) => {
      const own = callRows.filter((row) => row.campaign_id === campaign.id)
      const attached = memberRows.filter((row) => row.campaign_id === campaign.id)
      return {
        campaignId: campaign.id,
        name: campaignName.get(campaign.id) ?? 'Untitled campaign',
        status: campaign.status,
        leads: attached.length,
        // A lead is "called" once it has had at least one attempt, which is
        // what campaign_leads.attempts already records.
        attempted: attached.filter((row) => (row.attempts ?? 0) > 0).length,
        calls: own.length,
        qualified: own.filter((row) => row.outcome === 'QUALIFIED').length,
        followUp: own.filter((row) => row.outcome === 'FOLLOW_UP').length,
        notInterested: own.filter((row) => row.outcome === 'NOT_INTERESTED').length,
        noAnswer: own.filter((row) => row.status === 'NO_ANSWER').length,
      }
    })
    .sort((a, b) => b.calls - a.calls)

  return Response.json({
    data: {
      leads: {
        total: leadTotal,
        byStatus: leadStatus,
      },
      campaigns: {
        total: campaignRows.length,
        running: campaignRows.filter((row) => row.status === 'RUNNING').length,
        completed: campaignRows.filter((row) => row.status === 'COMPLETED').length,
        draft: campaignRows.filter((row) => row.status === 'DRAFT').length,
      },
      agents: {
        total: agentRows.length,
        active: agentRows.filter((row) => row.active === true).length,
      },
      calls: {
        total: callTotal,
        answered: answered.length,
        byStatus: callStatus,
        byOutcome: callOutcome,
        totalDurationSeconds: totalDuration,
        avgDurationSeconds: answered.length > 0 ? Math.round(totalDuration / answered.length) : 0,
        // Read from the stamp the demo runner writes, so the UI can say how
        // many of these calls were simulated rather than implying they all
        // reached a phone.
        simulated: callRows.filter(
          (row) => (row.metadata as Record<string, unknown> | null)?.simulated === true
        ).length,
      },
      followUps: {
        total: followUpTotal,
        byStatus: followUpStatus,
      },
      agentPerformance,
      campaignPerformance,
      coverage: {
        sampleLimit: SAMPLE_LIMIT,
        // True when a breakdown was computed from a capped sample rather than
        // the whole table. The totals above stay exact either way.
        leadsTruncated: leadTotal > leadRows.length,
        callsTruncated: callTotal > callRows.length,
        followUpsTruncated: followUpTotal > followUpRows.length,
      },
    },
  })
}
