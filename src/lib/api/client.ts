/**
 * Shared browser-side plumbing for the `/api` routes.
 *
 * Every resource client (leads, agents, campaigns, calls) needs the same three
 * things: a typed error that distinguishes an expired session from a workspace
 * problem, a reader for the API's several error shapes, and safe accessors for
 * untyped JSON. They live here so a new resource does not fork another copy.
 *
 * The browser never sends a workspace id — it is resolved server-side from the
 * session by `requireAuth`.
 */

export class ApiError extends Error {
  readonly status: number
  readonly code: string | null
  /** Field-level messages from the API's Zod validation, keyed by field name. */
  readonly fieldErrors: Record<string, string>

  constructor(
    message: string,
    options: { status: number; code?: string | null; fieldErrors?: Record<string, string> }
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = options.status
    this.code = options.code ?? null
    this.fieldErrors = options.fieldErrors ?? {}
  }

  /** A missing or expired session; the caller should send the user to sign in. */
  get isAuthError(): boolean {
    return this.status === 401
  }

  /**
   * Signed in, but the account cannot use this workspace. Signing in again
   * will not help, so the UI must not offer that as the fix.
   */
  get isWorkspaceError(): boolean {
    return this.status === 403
  }

  /** The server is missing its Supabase configuration. */
  get isConfigError(): boolean {
    return this.code === 'SUPABASE_NOT_CONFIGURED'
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

export function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
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
export function toApiError(status: number, body: unknown, fallback: string): ApiError {
  const error = isRecord(body) ? body.error : undefined

  if (typeof error === 'string') {
    return new ApiError(error, { status })
  }

  if (isRecord(error)) {
    const fieldErrors = readFieldErrors(error.details)
    const message =
      asString(error.message) ??
      (Object.keys(fieldErrors).length > 0 ? 'Please correct the highlighted fields.' : fallback)
    return new ApiError(message, { status, code: asString(error.code), fieldErrors })
  }

  return new ApiError(fallback, { status })
}

export async function readBody(response: Response): Promise<unknown> {
  return response.json().catch(() => null)
}

/** Issues a request and returns the parsed `data` payload, or throws ApiError. */
export async function request(
  path: string,
  options: RequestInit & { fallback: string }
): Promise<unknown> {
  const { fallback, ...init } = options

  const response = await fetch(path, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : null),
      ...init.headers,
    },
    cache: 'no-store',
  })

  if (response.status === 204) return null

  const body = await readBody(response)
  if (!response.ok) throw toApiError(response.status, body, fallback)

  return isRecord(body) ? body.data : null
}
