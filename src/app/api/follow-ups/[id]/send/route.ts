import { z } from 'zod'
import { requireAuth } from '@/lib/api/auth'
import { recordActivity } from '@/lib/api/activity'
import { isDemoVoice } from '@/server/providers/voice'

/**
 * Marks a follow-up as sent, without sending anything.
 *
 * No WhatsApp provider is connected and none is contacted here. This exists so
 * the rest of the product — follow-up state, the lead timeline, the numbers
 * that read off them — can be exercised end to end before any paid messaging
 * integration is bought.
 *
 * What it writes is real: the follow-up row really moves to SENT with a real
 * `sent_at`, and a real activity lands on the lead's timeline. Both are stamped
 * so nothing downstream can mistake a simulated send for a delivered message.
 *
 * It refuses once a real provider is configured, rather than leaving a route
 * that marks messages delivered when they were not.
 */

const idSchema = z.string().uuid()

function notFound() {
  return Response.json(
    { error: { code: 'FOLLOW_UP_NOT_FOUND', message: 'Follow-up not found' } },
    { status: 404 }
  )
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request)
  if (auth instanceof Response) return auth

  if (!isDemoVoice()) {
    return Response.json(
      {
        error: {
          code: 'DEMO_DISABLED',
          message: 'A real provider is configured, so simulated sending is disabled.',
        },
      },
      { status: 409 }
    )
  }

  const { id } = await context.params
  if (!idSchema.safeParse(id).success) return notFound()

  const { data: followUp } = await auth.supabase
    .from('follow_ups')
    .select('id, lead_id, call_id, channel, status, scheduled_at, sent_at, message_template, metadata')
    .eq('workspace_id', auth.workspaceId)
    .eq('id', id)
    .maybeSingle()

  if (!followUp) return notFound()

  // Already sent is not an error: the same click twice must leave the same row,
  // and re-sending would move `sent_at` to a time the message never went out.
  if (followUp.status === 'SENT') {
    return Response.json({ data: followUp })
  }

  if (followUp.status === 'CANCELLED') {
    return Response.json(
      {
        error: {
          code: 'FOLLOW_UP_CANCELLED',
          message: 'This follow-up was cancelled and cannot be sent.',
        },
      },
      { status: 409 }
    )
  }

  const sentAt = new Date().toISOString()
  const metadata = {
    ...(followUp.metadata as Record<string, unknown> | null),
    simulated: true,
    simulated_send_at: sentAt,
  }

  const { data: updated, error } = await auth.supabase
    .from('follow_ups')
    .update({ status: 'SENT', sent_at: sentAt, metadata })
    .eq('workspace_id', auth.workspaceId)
    .eq('id', id)
    .select(
      'id, workspace_id, lead_id, call_id, channel, status, scheduled_at, sent_at, message_template, provider, metadata, created_at, leads(id, name, phone, company)'
    )
    .single()

  if (error) {
    return Response.json(
      { error: { code: 'FOLLOW_UP_SEND_FAILED', message: error.message } },
      { status: 500 }
    )
  }

  await recordActivity(auth, {
    leadId: followUp.lead_id,
    type: 'FOLLOW_UP_SENT',
    data: {
      channel: followUp.channel,
      follow_up_id: id,
      call_id: followUp.call_id,
      sent_at: sentAt,
      simulated: true,
    },
  })

  return Response.json({ data: updated })
}
