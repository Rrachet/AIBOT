import type { ActivityType } from '@/lib/api/activity'
import { asBoolean, asNumber, asString, isRecord, request } from '@/lib/api/client'

/** Client-side boundary for `/api/analytics/summary` and `/api/activity`. */

export type StatusCounts = Record<string, number>

export interface AgentPerformance {
  agentId: string
  agentName: string
  active: boolean
  calls: number
  answered: number
  qualified: number
  avgDurationSeconds: number
}

export interface CampaignPerformance {
  campaignId: string
  name: string
  status: string
  leads: number
  attempted: number
  calls: number
  qualified: number
  followUp: number
  notInterested: number
  noAnswer: number
}

export interface AnalyticsSummary {
  leads: { total: number; byStatus: StatusCounts }
  campaigns: { total: number; running: number; completed: number; draft: number }
  agents: { total: number; active: number }
  calls: {
    total: number
    answered: number
    byStatus: StatusCounts
    byOutcome: StatusCounts
    totalDurationSeconds: number
    avgDurationSeconds: number
    simulated: number
  }
  followUps: { total: number; byStatus: StatusCounts }
  agentPerformance: AgentPerformance[]
  campaignPerformance: CampaignPerformance[]
  coverage: {
    sampleLimit: number
    leadsTruncated: boolean
    callsTruncated: boolean
    followUpsTruncated: boolean
  }
}

export interface ActivityEvent {
  id: string
  leadId: string
  leadName: string | null
  type: ActivityType | string
  data: Record<string, unknown>
  createdAt: string
}

function counts(value: unknown): StatusCounts {
  if (!isRecord(value)) return {}
  const result: StatusCounts = {}
  for (const [key, raw] of Object.entries(value)) {
    const n = asNumber(raw)
    if (n !== null) result[key] = n
  }
  return result
}

function num(value: unknown, key: string): number {
  return (isRecord(value) ? asNumber(value[key]) : null) ?? 0
}

const EMPTY: AnalyticsSummary = {
  leads: { total: 0, byStatus: {} },
  campaigns: { total: 0, running: 0, completed: 0, draft: 0 },
  agents: { total: 0, active: 0 },
  calls: {
    total: 0,
    answered: 0,
    byStatus: {},
    byOutcome: {},
    totalDurationSeconds: 0,
    avgDurationSeconds: 0,
    simulated: 0,
  },
  followUps: { total: 0, byStatus: {} },
  agentPerformance: [],
  campaignPerformance: [],
  coverage: {
    sampleLimit: 0,
    leadsTruncated: false,
    callsTruncated: false,
    followUpsTruncated: false,
  },
}

function toAgentPerformance(value: unknown): AgentPerformance | null {
  if (!isRecord(value)) return null
  const agentId = asString(value.agentId)
  if (!agentId) return null
  return {
    agentId,
    agentName: asString(value.agentName) ?? 'Unnamed agent',
    active: asBoolean(value.active, false),
    calls: num(value, 'calls'),
    answered: num(value, 'answered'),
    qualified: num(value, 'qualified'),
    avgDurationSeconds: num(value, 'avgDurationSeconds'),
  }
}

function toCampaignPerformance(value: unknown): CampaignPerformance | null {
  if (!isRecord(value)) return null
  const campaignId = asString(value.campaignId)
  if (!campaignId) return null
  return {
    campaignId,
    name: asString(value.name) ?? 'Untitled campaign',
    status: asString(value.status) ?? 'DRAFT',
    leads: num(value, 'leads'),
    attempted: num(value, 'attempted'),
    calls: num(value, 'calls'),
    qualified: num(value, 'qualified'),
    followUp: num(value, 'followUp'),
    notInterested: num(value, 'notInterested'),
    noAnswer: num(value, 'noAnswer'),
  }
}

export async function fetchSummary(signal?: AbortSignal): Promise<AnalyticsSummary> {
  const data = await request('/api/analytics/summary', {
    method: 'GET',
    signal,
    fallback: 'The server did not return your figures. This is usually temporary.',
  })

  if (!isRecord(data)) return EMPTY

  const leads = isRecord(data.leads) ? data.leads : {}
  const campaigns = isRecord(data.campaigns) ? data.campaigns : {}
  const agents = isRecord(data.agents) ? data.agents : {}
  const calls = isRecord(data.calls) ? data.calls : {}
  const followUps = isRecord(data.followUps) ? data.followUps : {}
  const coverage = isRecord(data.coverage) ? data.coverage : {}

  return {
    leads: { total: num(leads, 'total'), byStatus: counts(leads.byStatus) },
    campaigns: {
      total: num(campaigns, 'total'),
      running: num(campaigns, 'running'),
      completed: num(campaigns, 'completed'),
      draft: num(campaigns, 'draft'),
    },
    agents: { total: num(agents, 'total'), active: num(agents, 'active') },
    calls: {
      total: num(calls, 'total'),
      answered: num(calls, 'answered'),
      byStatus: counts(calls.byStatus),
      byOutcome: counts(calls.byOutcome),
      totalDurationSeconds: num(calls, 'totalDurationSeconds'),
      avgDurationSeconds: num(calls, 'avgDurationSeconds'),
      simulated: num(calls, 'simulated'),
    },
    followUps: { total: num(followUps, 'total'), byStatus: counts(followUps.byStatus) },
    agentPerformance: (Array.isArray(data.agentPerformance) ? data.agentPerformance : [])
      .map(toAgentPerformance)
      .filter((item): item is AgentPerformance => item !== null),
    campaignPerformance: (Array.isArray(data.campaignPerformance) ? data.campaignPerformance : [])
      .map(toCampaignPerformance)
      .filter((item): item is CampaignPerformance => item !== null),
    coverage: {
      sampleLimit: num(coverage, 'sampleLimit'),
      leadsTruncated: asBoolean(coverage.leadsTruncated, false),
      callsTruncated: asBoolean(coverage.callsTruncated, false),
      followUpsTruncated: asBoolean(coverage.followUpsTruncated, false),
    },
  }
}

function toActivity(value: unknown): ActivityEvent | null {
  if (!isRecord(value)) return null
  const id = asString(value.id)
  const leadId = asString(value.lead_id)
  const type = asString(value.type)
  const createdAt = asString(value.created_at)
  if (!id || !leadId || !type || !createdAt) return null

  const related = value.leads
  const lead = Array.isArray(related) ? related[0] : related

  return {
    id,
    leadId,
    leadName: isRecord(lead) ? asString(lead.name) : null,
    type,
    data: isRecord(value.data) ? value.data : {},
    createdAt,
  }
}

export async function fetchActivity(limit = 12, signal?: AbortSignal): Promise<ActivityEvent[]> {
  const data = await request(`/api/activity?limit=${limit}`, {
    method: 'GET',
    signal,
    fallback: 'The server did not return recent activity.',
  })

  const rows = Array.isArray(data) ? data : []
  return rows.map(toActivity).filter((item): item is ActivityEvent => item !== null)
}

/** Percentage of `total`, or null when there is nothing to divide by. */
export function rate(part: number, total: number): number | null {
  if (total <= 0) return null
  return Math.round((part / total) * 1000) / 10
}

/** A rate as text, or an em dash when it cannot honestly be computed. */
export function formatRate(part: number, total: number): string {
  const value = rate(part, total)
  return value === null ? '—' : `${value}%`
}
