import type { Agent } from '@/domain/types'
import { ApiError, asBoolean, asString, isRecord, request } from '@/lib/api/client'

/**
 * Client-side boundary for `/api/agents`.
 *
 * The API returns raw database rows (snake_case); this module is the only place
 * that shape is known, mapping them onto the camelCase `Agent` domain type so
 * views never depend on column names.
 */

export interface AgentInput {
  name: string
  companyName: string
  purpose: string
  instructions: string
  businessContext: string
  active: boolean
}

export const EMPTY_AGENT: AgentInput = {
  name: '',
  companyName: '',
  purpose: '',
  instructions: '',
  businessContext: '',
  active: true,
}

/** Returns null for a row without an id, so one bad record cannot break the list. */
function toAgent(value: unknown): Agent | null {
  if (!isRecord(value)) return null

  const id = asString(value.id)
  if (!id) return null

  return {
    id,
    workspaceId: asString(value.workspace_id) ?? '',
    name: asString(value.name) ?? 'Untitled agent',
    companyName: asString(value.company_name),
    purpose: asString(value.purpose),
    instructions: asString(value.instructions),
    businessContext: asString(value.business_context),
    voiceProvider: asString(value.voice_provider),
    voiceId: asString(value.voice_id),
    active: asBoolean(value.active, true),
  }
}

/** Optional text is sent as null, so an emptied field clears the column. */
function toPayload(input: AgentInput) {
  return {
    name: input.name.trim(),
    company_name: input.companyName.trim() || null,
    purpose: input.purpose.trim() || null,
    instructions: input.instructions.trim() || null,
    business_context: input.businessContext.trim() || null,
    active: input.active,
  }
}

function requireAgent(value: unknown, status: number): Agent {
  const agent = toAgent(value)
  if (!agent) throw new ApiError('The agent was saved but could not be read back.', { status })
  return agent
}

export async function fetchAgents(signal?: AbortSignal): Promise<Agent[]> {
  const data = await request('/api/agents', {
    method: 'GET',
    signal,
    fallback: 'The server did not return your agents. This is usually temporary.',
  })

  const rows = Array.isArray(data) ? data : []
  return rows.map(toAgent).filter((agent): agent is Agent => agent !== null)
}

export async function createAgent(input: AgentInput): Promise<Agent> {
  const data = await request('/api/agents', {
    method: 'POST',
    body: JSON.stringify(toPayload(input)),
    fallback: 'The server could not save this agent. Please try again.',
  })
  return requireAgent(data, 201)
}

/** Maps one domain field onto its column, for partial updates. */
const COLUMN: Record<keyof AgentInput, string> = {
  name: 'name',
  companyName: 'company_name',
  purpose: 'purpose',
  instructions: 'instructions',
  businessContext: 'business_context',
  active: 'active',
}

export async function updateAgent(id: string, input: Partial<AgentInput>): Promise<Agent> {
  // Only the fields actually supplied are sent, so toggling `active` from the
  // card cannot blank the instructions the form never showed.
  const payload: Record<string, string | boolean | null> = {}
  for (const [field, column] of Object.entries(COLUMN) as [keyof AgentInput, string][]) {
    const value = input[field]
    if (value === undefined) continue
    payload[column] = typeof value === 'string' ? value.trim() || null : value
  }
  // `name` is the one column the server will not accept as null.
  if (typeof payload.name === 'object') delete payload.name

  const data = await request(`/api/agents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    fallback: 'The server could not update this agent. Please try again.',
  })
  return requireAgent(data, 200)
}

export async function deleteAgent(id: string): Promise<void> {
  await request(`/api/agents/${id}`, {
    method: 'DELETE',
    fallback: 'The server could not delete this agent. Please try again.',
  })
}

/** Initial used for the avatar chip, matching the existing agent card. */
export function agentInitial(agent: Agent): string {
  return agent.name.trim()[0]?.toUpperCase() ?? 'A'
}

/** Secondary line under the name: company, falling back to purpose. */
export function agentSecondaryLine(agent: Agent): string | null {
  return agent.companyName?.trim() || agent.purpose?.trim() || null
}
