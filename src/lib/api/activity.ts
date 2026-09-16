import type { AuthContext } from '@/lib/api/auth'

/**
 * Lead timeline writer.
 *
 * `lead_activities` is the record of what happened to a lead and in what order:
 * imports, edits, campaign attachment, calls, outcomes and follow-ups all land
 * here, and the lead timeline is rendered from it.
 *
 * Writing an activity is always secondary to the operation that caused it. A
 * failure here is logged and swallowed rather than propagated, because losing
 * a timeline entry is a much smaller harm than failing an import or a call that
 * has already been written. The one thing it must never do is corrupt the
 * caller's result.
 *
 * Rows are written through the caller's session, so RLS applies and the
 * workspace comes from `requireAuth` rather than from the browser.
 */

export type ActivityType =
  | 'LEAD_CREATED'
  | 'LEAD_IMPORTED'
  | 'LEAD_UPDATED'
  | 'CAMPAIGN_ATTACHED'
  | 'CALL_STARTED'
  | 'CALL_COMPLETED'
  | 'CALL_OUTCOME'
  | 'FOLLOW_UP_SCHEDULED'
  | 'FOLLOW_UP_SENT'

export interface ActivityEntry {
  leadId: string
  type: ActivityType
  data?: Record<string, unknown>
}

/** Human-readable label for each activity type, used by the timeline UI. */
export const ACTIVITY_LABEL: Record<ActivityType, string> = {
  LEAD_CREATED: 'Lead created',
  LEAD_IMPORTED: 'Lead imported',
  LEAD_UPDATED: 'Lead updated',
  CAMPAIGN_ATTACHED: 'Added to campaign',
  CALL_STARTED: 'Call started',
  CALL_COMPLETED: 'Call completed',
  CALL_OUTCOME: 'Outcome recorded',
  FOLLOW_UP_SCHEDULED: 'Follow-up scheduled',
  FOLLOW_UP_SENT: 'Follow-up sent',
}

/** Writes several activities in one statement. Never throws. */
export async function recordActivities(
  auth: AuthContext,
  entries: readonly ActivityEntry[]
): Promise<void> {
  if (entries.length === 0) return

  const rows = entries.map((entry) => ({
    workspace_id: auth.workspaceId,
    lead_id: entry.leadId,
    type: entry.type,
    data: entry.data ?? {},
  }))

  const { error } = await auth.supabase.from('lead_activities').insert(rows)

  if (error) {
    // Deliberately not rethrown: see the module comment.
    console.error(`lead_activities insert failed (${entries.length} rows): ${error.message}`)
  }
}

/** Writes a single activity. Never throws. */
export async function recordActivity(auth: AuthContext, entry: ActivityEntry): Promise<void> {
  await recordActivities(auth, [entry])
}
