import { ApiError, asString, isRecord, request } from '@/lib/api/client'

/**
 * Tour progress, and where it is kept.
 *
 * Server-side, keyed by user and workspace, so signing in on a second machine
 * does not replay an introduction somebody already sat through. A local mirror
 * answers instantly on load and absorbs the case where the request fails —
 * the tour is chrome, and a person should never be blocked from using the
 * product because a preference could not be read.
 */

export type TourState = 'NOT_STARTED' | 'INTRO' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED'

export interface TourProgress {
  state: TourState
  /** Step id, so a reload mid-tour resumes rather than restarts. */
  step: string | null
}

const STATES: TourState[] = ['NOT_STARTED', 'INTRO', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED']

/** Namespaced by workspace: a new workspace has not seen the tour. */
function cacheKey(workspaceId: string): string {
  return `aibot-tour:${workspaceId}`
}

export function readCachedProgress(workspaceId: string): TourProgress | null {
  try {
    const raw = localStorage.getItem(cacheKey(workspaceId))
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) return null
    const state = asString(parsed.state)
    if (!state || !STATES.includes(state as TourState)) return null
    return { state: state as TourState, step: asString(parsed.step) }
  } catch {
    return null
  }
}

function writeCachedProgress(workspaceId: string, progress: TourProgress) {
  try {
    localStorage.setItem(cacheKey(workspaceId), JSON.stringify(progress))
  } catch {
    // Private windows and blocked site data throw. The server copy is the
    // real one; this is only there to make the first paint instant.
  }
}

function toProgress(value: unknown): TourProgress {
  if (!isRecord(value)) return { state: 'NOT_STARTED', step: null }
  const state = asString(value.state)
  return {
    state: state && STATES.includes(state as TourState) ? (state as TourState) : 'NOT_STARTED',
    step: asString(value.step),
  }
}

export async function fetchProgress(
  workspaceId: string,
  signal?: AbortSignal
): Promise<TourProgress> {
  try {
    const data = await request('/api/tour', {
      method: 'GET',
      signal,
      fallback: 'Could not read your tour progress.',
    })
    const progress = toProgress(data)
    writeCachedProgress(workspaceId, progress)
    return progress
  } catch (error) {
    if (error instanceof ApiError && error.isAuthError) throw error
    // Fall back to whatever this browser last saw rather than replaying the
    // introduction at somebody who has already dismissed it.
    return readCachedProgress(workspaceId) ?? { state: 'NOT_STARTED', step: null }
  }
}

/**
 * Records progress. The local mirror is written first and unconditionally, so
 * a failed request cannot cause the introduction to reappear on next load.
 */
export async function saveProgress(
  workspaceId: string,
  progress: TourProgress
): Promise<void> {
  writeCachedProgress(workspaceId, progress)
  try {
    await request('/api/tour', {
      method: 'PUT',
      body: JSON.stringify({ state: progress.state, step: progress.step }),
      fallback: 'Could not save your tour progress.',
    })
  } catch {
    // Deliberately swallowed: the person is mid-tour, and an error toast about
    // a preference write would be noise on top of what they are reading.
  }
}
