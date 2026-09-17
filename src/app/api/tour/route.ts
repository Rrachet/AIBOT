import { z } from 'zod'
import { requireAuth } from '@/lib/api/auth'

/**
 * Where the signed-in person has got to in the product tour.
 *
 * Keyed by the user and the workspace `requireAuth` resolved from the session
 * — neither is taken from the request — so a person cannot read or write
 * anyone else's progress, and the RLS policy on `user_preferences` enforces
 * the same thing a second time at the database.
 *
 * This is presentation state only. Nothing here grants access to anything:
 * the tour walks a user through routes they can already reach, and every page
 * and API call it leads them to is authorised independently.
 */

const STATES = ['NOT_STARTED', 'INTRO', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'] as const

const updateSchema = z.object({
  state: z.enum(STATES),
  // The step id the tour is on, so a reload resumes rather than restarts.
  step: z.string().trim().max(64).nullable().optional(),
})

export async function GET(request: Request) {
  const auth = await requireAuth(request)
  if (auth instanceof Response) return auth

  const { data, error } = await auth.supabase
    .from('user_preferences')
    .select('tour_state, tour_step')
    .eq('user_id', auth.userId)
    .eq('workspace_id', auth.workspaceId)
    .maybeSingle()

  if (error) {
    return Response.json(
      { error: { code: 'TOUR_STATE_LOOKUP_FAILED', message: error.message } },
      { status: 500 }
    )
  }

  // No row yet simply means this person has not met the tour in this
  // workspace, which is the same thing as NOT_STARTED.
  return Response.json({
    data: {
      state: data?.tour_state ?? 'NOT_STARTED',
      step: data?.tour_step ?? null,
    },
  })
}

export async function PUT(request: Request) {
  const auth = await requireAuth(request)
  if (auth instanceof Response) return auth

  const body = await request.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() } },
      { status: 400 }
    )
  }

  const { data, error } = await auth.supabase
    .from('user_preferences')
    .upsert(
      {
        user_id: auth.userId,
        workspace_id: auth.workspaceId,
        tour_state: parsed.data.state,
        tour_step: parsed.data.step ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,workspace_id' }
    )
    .select('tour_state, tour_step')
    .maybeSingle()

  if (error) {
    return Response.json(
      { error: { code: 'TOUR_STATE_SAVE_FAILED', message: error.message } },
      { status: 500 }
    )
  }

  return Response.json({
    data: { state: data?.tour_state ?? parsed.data.state, step: data?.tour_step ?? null },
  })
}
