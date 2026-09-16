import { z } from 'zod'
import { requireAuth, type AuthContext } from '@/lib/api/auth'
import { recordActivities, type ActivityEntry } from '@/lib/api/activity'
import { DemoVoiceProvider, DEMO_PROVIDER } from '@/server/providers/demo-voice'
import { isDemoVoice } from '@/server/providers/voice'
import { DemoAIProvider } from '@/server/ai/demo-ai'
import type { AgentContext, LeadContext } from '@/server/demo/transcript'
import { DEMO_CONTACT } from '@/domain/demo-contact'

/**
 * Runs one simulated call for a single agent, outside any campaign.
 *
 * This is how someone sees what an agent they have just configured would
 * actually do, before committing to building a campaign around it. It uses the
 * same provider and the same analysis as the campaign runner, so what is shown
 * here is what a campaign would produce — not a separate mock that could drift
 * away from the real path.
 *
 * It differs from the campaign runner in two deliberate ways:
 *
 * - It does not change the lead's status. A campaign call is a real attempt on
 *   that lead and should move them through the pipeline; a demonstration of an
 *   agent is not, and silently marking someone's genuine lead "not interested"
 *   because they clicked a demo button would be a bad surprise.
 * - It sets `follow_ups.call_id`, which the campaign runner cannot: it writes
 *   its follow-ups in the same batch that inserts the calls, before their ids
 *   exist. Here there is exactly one call, so the link is available.
 *
 * As with every other simulated path, no phone number is contacted and every
 * row it writes is stamped so the UI can say so.
 */

const bodySchema = z
  .object({ lead_id: z.string().uuid().optional() })
  .nullable()
  .optional()

const idSchema = z.string().uuid()

/**
 * How long a repeat of the same demo call is treated as a double click rather
 * than a second intention.
 */
const REPEAT_WINDOW_MS = 4000

function agentNotFound() {
  return Response.json(
    { error: { code: 'AGENT_NOT_FOUND', message: 'Agent not found' } },
    { status: 404 }
  )
}

interface LeadRow {
  id: string
  name: string | null
  phone: string
  company: string | null
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request)
  if (auth instanceof Response) return auth

  if (!isDemoVoice()) {
    return Response.json(
      {
        error: {
          code: 'DEMO_DISABLED',
          message: 'A real voice provider is configured, so simulated calls are disabled.',
        },
      },
      { status: 409 }
    )
  }

  const { id } = await context.params
  if (!idSchema.safeParse(id).success) return agentNotFound()

  const parsedBody = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsedBody.success) {
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', details: parsedBody.error.flatten() } },
      { status: 400 }
    )
  }

  const { data: agentRow } = await auth.supabase
    .from('agents')
    .select('id, name, company_name, purpose, instructions, business_context, active')
    .eq('workspace_id', auth.workspaceId)
    .eq('id', id)
    .maybeSingle()

  if (!agentRow) return agentNotFound()

  const agent: AgentContext = {
    name: agentRow.name ?? 'Agent',
    companyName: agentRow.company_name ?? null,
    purpose: agentRow.purpose ?? null,
    instructions: agentRow.instructions ?? null,
    businessContext: agentRow.business_context ?? null,
  }

  const leadResult = await resolveLead(auth, parsedBody.data?.lead_id)
  if (leadResult instanceof Response) return leadResult
  const lead: LeadRow = leadResult

  // Demo calls this agent has already made to this lead. The count picks the
  // scenario, so running the demo again shows a different outcome instead of
  // repeating the first one.
  const { data: priorRows } = await auth.supabase
    .from('calls')
    .select('id, created_at')
    .eq('workspace_id', auth.workspaceId)
    .eq('agent_id', agentRow.id)
    .eq('lead_id', lead.id)
    .is('campaign_id', null)
    .order('created_at', { ascending: false })

  const prior = priorRows ?? []

  // A double click is two requests for one intention. If this agent called
  // this contact a moment ago, that call is the answer — returning it beats
  // writing a second one the user never asked for. A deliberate re-run seconds
  // later is still a new call.
  const newest = prior[0]
  if (newest && Date.now() - Date.parse(newest.created_at as string) < REPEAT_WINDOW_MS) {
    const { data: recent } = await auth.supabase
      .from('calls')
      .select('*')
      .eq('workspace_id', auth.workspaceId)
      .eq('id', newest.id)
      .single()

    if (recent) {
      const { data: existingFollowUp } = await auth.supabase
        .from('follow_ups')
        .select('*')
        .eq('workspace_id', auth.workspaceId)
        .eq('call_id', recent.id)
        .limit(1)

      return Response.json({
        data: {
          call: recent,
          followUp: existingFollowUp?.[0] ?? null,
          lead: { id: lead.id, name: lead.name, phone: lead.phone, company: lead.company },
          nextAction: (recent.metadata as Record<string, unknown> | null)?.next_action ?? null,
        },
      })
    }
  }

  const priorCalls = prior.length
  const attempt = priorCalls + 1

  const voice = new DemoVoiceProvider()
  const simulated = voice.simulate(lead.id, priorCalls, 1, agent, {
    name: lead.name,
    company: lead.company,
  } satisfies LeadContext)

  const analysis = await new DemoAIProvider(simulated.scenario).analyzeCall({
    transcript: simulated.transcript,
    answered: simulated.scenario.answered,
    agent,
    lead: { name: lead.name, company: lead.company },
    facts: simulated.facts,
  })

  // Deliberately not `demoCallId`, which keys on (lead, attempt) and would
  // collide with a campaign's call to the same lead on the same attempt.
  const providerCallId = `demo_agent_${agentRow.id}_${lead.id}_${attempt}`

  const now = Date.now()
  const startedAt = new Date(now - simulated.durationSeconds * 1000)

  const { data: call, error } = await auth.supabase
    .from('calls')
    .upsert(
      {
        workspace_id: auth.workspaceId,
        lead_id: lead.id,
        agent_id: agentRow.id,
        campaign_id: null,
        provider: DEMO_PROVIDER,
        provider_call_id: providerCallId,
        phone_number: lead.phone,
        status: simulated.status,
        outcome: analysis.outcome,
        started_at: startedAt.toISOString(),
        ended_at: new Date(now).toISOString(),
        duration_seconds: simulated.durationSeconds,
        transcript: simulated.transcript,
        summary: analysis.summary,
        metadata: {
          simulated: true,
          agent_demo: true,
          next_action: analysis.nextAction,
          scenario: simulated.scenario.key,
        },
      },
      { onConflict: 'provider,provider_call_id' }
    )
    .select('*')
    .single()

  if (error) {
    return Response.json(
      { error: { code: 'CALL_WRITE_FAILED', message: error.message } },
      { status: 500 }
    )
  }

  const activities: ActivityEntry[] = [
    {
      leadId: lead.id,
      type: 'CALL_COMPLETED',
      data: { agent_id: agentRow.id, duration_seconds: simulated.durationSeconds, simulated: true, agent_demo: true },
    },
    {
      leadId: lead.id,
      type: 'CALL_OUTCOME',
      data: { outcome: analysis.outcome, summary: analysis.summary, next_action: analysis.nextAction, agent_demo: true },
    },
  ]

  // At most one follow-up, and only where the conversation actually called for
  // one. A single click should not fill the workspace with records.
  let followUp: Record<string, unknown> | null = null
  const wantsFollowUp = analysis.outcome === 'NO_ANSWER' || analysis.outcome === 'FOLLOW_UP'

  if (wantsFollowUp) {
    const { data: existing } = await auth.supabase
      .from('follow_ups')
      .select('*')
      .eq('workspace_id', auth.workspaceId)
      .eq('call_id', call.id)
      .maybeSingle()

    if (existing) {
      followUp = existing
    } else {
      const { data: created } = await auth.supabase
        .from('follow_ups')
        .insert({
          workspace_id: auth.workspaceId,
          lead_id: lead.id,
          call_id: call.id,
          channel: 'WHATSAPP',
          status: 'PENDING',
          scheduled_at: new Date(now).toISOString(),
          message_template: buildMessage(agent, lead, analysis.outcome),
          provider: DEMO_PROVIDER,
          metadata: { simulated: true, agent_demo: true, agent_id: agentRow.id },
        })
        .select('*')
        .single()

      followUp = created ?? null
      if (created) {
        activities.push({
          leadId: lead.id,
          type: 'FOLLOW_UP_SCHEDULED',
          data: { channel: 'WHATSAPP', call_id: call.id, agent_demo: true },
        })
      }
    }
  }

  await recordActivities(auth, activities)

  return Response.json({
    data: {
      call,
      followUp,
      lead: { id: lead.id, name: lead.name, phone: lead.phone, company: lead.company },
      nextAction: analysis.nextAction,
    },
  })
}

/**
 * The lead the demo call is placed to.
 *
 * A caller-supplied id is re-read under the session's workspace, so an id from
 * another workspace is not found rather than used. With no id, the workspace's
 * own stand-in contact is reused, and only created the first time — one click
 * should not add a new person to somebody's lead list every time.
 */
async function resolveLead(auth: AuthContext, leadId?: string): Promise<LeadRow | Response> {
  if (leadId) {
    const { data } = await auth.supabase
      .from('leads')
      .select('id, name, phone, company')
      .eq('workspace_id', auth.workspaceId)
      .eq('id', leadId)
      .maybeSingle()

    if (!data) {
      return Response.json(
        { error: { code: 'LEAD_NOT_FOUND', message: 'Lead not found' } },
        { status: 404 }
      )
    }
    return data as LeadRow
  }

  // `.limit(1)` rather than `.maybeSingle()`: leads carry no uniqueness
  // constraint on phone, and maybeSingle resolves to null as soon as more than
  // one row matches — which would insert yet another stand-in every time.
  const { data: existing } = await auth.supabase
    .from('leads')
    .select('id, name, phone, company')
    .eq('workspace_id', auth.workspaceId)
    .eq('phone', DEMO_CONTACT.phone)
    .order('created_at', { ascending: true })
    .limit(1)

  if (existing && existing.length > 0) return existing[0] as LeadRow

  const { data: created, error } = await auth.supabase
    .from('leads')
    .insert({
      workspace_id: auth.workspaceId,
      name: DEMO_CONTACT.name,
      phone: DEMO_CONTACT.phone,
      company: DEMO_CONTACT.company,
      source: 'MANUAL',
      status: 'NEW',
      // Marked so this stand-in can be told apart from a real lead, here and
      // by anything that later wants to clean it up.
      metadata: { demo_contact: true },
    })
    .select('id, name, phone, company')
    .single()

  if (error || !created) {
    return Response.json(
      { error: { code: 'DEMO_CONTACT_FAILED', message: error?.message ?? 'Could not prepare a demo contact.' } },
      { status: 500 }
    )
  }

  return created as LeadRow
}

/** The WhatsApp message this follow-up would send. */
function buildMessage(agent: AgentContext, lead: LeadRow, outcome: string): string {
  const name = lead.name?.trim().split(/\s+/)[0] ?? 'there'
  const company = agent.companyName?.trim() || 'our team'
  const context = agent.businessContext?.trim()
  const offer = context ? `\n\n${context.split(/(?<=[.!?])\s/)[0]}` : ''

  if (outcome === 'NO_ANSWER') {
    return `Hi ${name} 👋\n\nWe tried calling from ${company} but could not reach you.${offer}\n\nReply here and we will pick it up whenever suits you.`
  }
  return `Hi ${name} 👋\n\nThanks for speaking with us at ${company}. As discussed, here are the details.${offer}\n\nLet me know what works best for you.`
}
