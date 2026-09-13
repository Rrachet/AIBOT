import type { Lead, LeadSource, LeadStatus } from '@/domain/types'
import { LEAD_STATUS_DISPLAY } from '@/lib/status'

/**
 * Client-side boundary for `/api/leads`.
 *
 * The API returns raw database rows (snake_case). This module is the only
 * place that shape is known: it validates responses and maps them onto the
 * camelCase `Lead` domain type, so views never depend on column names.
 *
 * The browser never talks to Supabase directly and never sends a workspace id —
 * the workspace is resolved server-side from the session in `requireAuth`.
 *
 * Status labels and badge tones come from `lib/status.ts`, which is keyed by
 * the `LeadStatus` union, so the UI cannot drift from the database enum.
 */

export const LEAD_SOURCE_LABEL: Record<LeadSource, string> = {
  MANUAL: 'Manual entry',
  CSV: 'CSV import',
  EXCEL: 'Excel import',
  META: 'Meta Lead Ads',
  WEBSITE: 'Website form',
  CRM: 'CRM',
}

export const LEAD_SOURCES = Object.keys(LEAD_SOURCE_LABEL) as LeadSource[]

const LEAD_STATUSES = Object.keys(LEAD_STATUS_DISPLAY) as LeadStatus[]

/** Largest page size `/api/leads` accepts. */
export const LEADS_PAGE_SIZE = 100

/* -------------------------------------------------------------------------- */
/* Response parsing                                                           */
/* -------------------------------------------------------------------------- */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

/**
 * Map one database row onto the domain type. Returns null for a row that is
 * unusable (no id or phone) so a single malformed record cannot break the list.
 */
function toLead(value: unknown): Lead | null {
  if (!isRecord(value)) return null

  const id = asString(value.id)
  const phone = asString(value.phone)
  if (!id || !phone) return null

  const source = asString(value.source)
  const status = asString(value.status)

  return {
    id,
    workspaceId: asString(value.workspace_id) ?? '',
    name: asString(value.name),
    phone,
    email: asString(value.email),
    company: asString(value.company),
    source: LEAD_SOURCES.includes(source as LeadSource) ? (source as LeadSource) : 'MANUAL',
    status: LEAD_STATUSES.includes(status as LeadStatus) ? (status as LeadStatus) : 'NEW',
    metadata: isRecord(value.metadata) ? value.metadata : {},
    createdAt: asString(value.created_at) ?? '',
    updatedAt: asString(value.updated_at) ?? asString(value.created_at) ?? '',
  }
}

/* -------------------------------------------------------------------------- */
/* Errors                                                                     */
/* -------------------------------------------------------------------------- */

export class LeadApiError extends Error {
  readonly status: number
  readonly code: string | null
  /** Field-level messages from the API's Zod validation, keyed by field name. */
  readonly fieldErrors: Record<string, string>

  constructor(
    message: string,
    options: { status: number; code?: string | null; fieldErrors?: Record<string, string> }
  ) {
    super(message)
    this.name = 'LeadApiError'
    this.status = options.status
    this.code = options.code ?? null
    this.fieldErrors = options.fieldErrors ?? {}
  }

  /** A stale or missing session; the caller should send the user to sign in. */
  get isAuthError(): boolean {
    return this.status === 401 || this.status === 403
  }
}

function readFieldErrors(details: unknown): Record<string, string> {
  if (!isRecord(details) || !isRecord(details.fieldErrors)) return {}

  const result: Record<string, string> = {}
  for (const [field, messages] of Object.entries(details.fieldErrors)) {
    const first = Array.isArray(messages) ? asString(messages[0]) : null
    if (first) result[field] = first
  }
  return result
}

/**
 * `error` arrives in more than one shape: the proxy returns
 * `{ error: { code, message } }`, `requireAuth` returns `{ error: 'string' }`,
 * and validation failures return `{ error: { code, details } }`.
 */
function toApiError(status: number, body: unknown, fallback: string): LeadApiError {
  const error = isRecord(body) ? body.error : undefined

  if (typeof error === 'string') {
    return new LeadApiError(error, { status })
  }

  if (isRecord(error)) {
    const fieldErrors = readFieldErrors(error.details)
    const message =
      asString(error.message) ??
      (Object.keys(fieldErrors).length > 0 ? 'Please correct the highlighted fields.' : fallback)
    return new LeadApiError(message, { status, code: asString(error.code), fieldErrors })
  }

  return new LeadApiError(fallback, { status })
}

async function readBody(response: Response): Promise<unknown> {
  return response.json().catch(() => null)
}

/* -------------------------------------------------------------------------- */
/* Requests                                                                   */
/* -------------------------------------------------------------------------- */

export async function fetchLeads(signal?: AbortSignal): Promise<Lead[]> {
  const response = await fetch(`/api/leads?limit=${LEADS_PAGE_SIZE}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal,
  })

  const body = await readBody(response)
  if (!response.ok) {
    throw toApiError(
      response.status,
      body,
      'The server did not return your leads. This is usually temporary.'
    )
  }

  const rows = isRecord(body) && Array.isArray(body.data) ? body.data : []
  return rows.map(toLead).filter((lead): lead is Lead => lead !== null)
}

export interface CreateLeadInput {
  name: string
  phone: string
  email: string
  company: string
  source: LeadSource
}

export async function createLead(input: CreateLeadInput): Promise<Lead> {
  // Optional text fields are sent as null rather than '' so the column stays
  // empty instead of holding a blank string. `workspace_id` is never sent.
  const payload = {
    name: input.name.trim() || null,
    phone: input.phone.trim(),
    email: input.email.trim() || null,
    company: input.company.trim() || null,
    source: input.source,
  }

  const response = await fetch('/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  })

  const body = await readBody(response)
  if (!response.ok) {
    throw toApiError(response.status, body, 'The server could not save this lead. Please try again.')
  }

  const lead = toLead(isRecord(body) ? body.data : null)
  if (!lead) {
    throw new LeadApiError('The lead was saved but could not be read back.', { status: response.status })
  }

  return lead
}

/* -------------------------------------------------------------------------- */
/* Formatting                                                                 */
/* -------------------------------------------------------------------------- */

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * Short relative label for the "Updated" column. Computed in the browser only,
 * so it cannot cause a hydration mismatch.
 */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const timestamp = Date.parse(iso)
  if (Number.isNaN(timestamp)) return '—'

  const elapsed = now - timestamp
  if (elapsed < MINUTE) return 'just now'
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)} min ago`
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)} hr ago`
  if (elapsed < 7 * DAY) {
    const days = Math.floor(elapsed / DAY)
    return days === 1 ? 'yesterday' : `${days} days ago`
  }

  return new Date(timestamp).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Full timestamp, shown on hover so the relative label stays unambiguous. */
export function formatAbsoluteTime(iso: string): string {
  const timestamp = Date.parse(iso)
  if (Number.isNaN(timestamp)) return ''
  return new Date(timestamp).toLocaleString()
}

/** Display name for a lead, which the database allows to be null. */
export function leadDisplayName(lead: Lead): string {
  return lead.name?.trim() || 'Unnamed lead'
}

/** Secondary line under the name: company, falling back to email. */
export function leadSecondaryLine(lead: Lead): string | undefined {
  return lead.company?.trim() || lead.email?.trim() || undefined
}
