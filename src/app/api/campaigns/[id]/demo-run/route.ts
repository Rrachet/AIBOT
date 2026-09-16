import { z } from 'zod'
import { requireAuth, type AuthContext } from '@/lib/api/auth'
import { recordActivities, type ActivityEntry } from '@/lib/api/activity'
import { DemoVoiceProvider, DEMO_PROVIDER } from '@/server/providers/demo-voice'
import { isDemoVoice } from '@/server/providers/voice'
import { DemoAIProvider, leadStatusFor } from '@/server/ai/demo-ai'
import type { AgentContext, LeadContext } from '@/server/demo/transcript'

/**
 * Runs a batch of simulated calls for a campaign.
 *
 * This is the demo execution path. It exists because AIBOT has no telephony
 * provider connected yet, and the rest of the product — outcomes, lead status,
 * follow-ups, the timeline, analytics — is only worth anything once calls have
 * happened. Everything it writes is real: real rows, real workspace scoping,
 * real RLS. Only the phone call is simulated.
 *
 * It refuses to run unless the app is in demo mode, so connecting a real
 * provider later disables it rather than leaving a route that fabricates calls
 * alongside genuine ones.
 *
 * Bounded and synchronous by design: at most BATCH leads per request, a handful
 * of bulk statements, no queue and no background worker. That fits comfortably
 * inside a serverless invocation and needs no paid infrastructure.
 */

/** Never process more than this many leads in one request. */
const BATCH = 10

const bodySchema = z
  .object({ limit: z.number().int().min(1).max(BATCH).optional() })
  .nullable()
  .optional()

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
  if (!z.string().uuid().safeParse(id).success) {
    return Response.json(
      { error: { code: 'CAMPAIGN_NOT_FOUND', message: 'Campaign not found' } },
      { status: 404 }
    )
  }

  const parsedBody = bodySchema.safeParse(await request.json().catch(() => null))
  const limit = Math.min(parsedBody.success ? parsedBody.data?.limit ?? BATCH : BATCH, BATCH)

  const { data: campaign } = await auth.supabase
    .from('campaigns')
    .select('id, status, max_attempts, whatsapp_fallback_enabled, whatsapp_fallback_delay_minutes, agent_id, agents(id, name, company_name, purpose, instructions, business_context)')
    .eq('workspace_id', auth.workspaceId)
    .eq('id', id)
    .maybeSingle()

  if (!campaign) {
    return Response.json(
      { error: { code: 'CAMPAIGN_NOT_FOUND', message: 'Campaign not found' } },
      { status: 404 }
    )
  }

  if (campaign.status !== 'RUNNING') {
    return Response.json(
      {
        error: {
          code: 'CAMPAIGN_NOT_RUNNING',
          message: 'Start the campaign before running calls.',
        },
      },
      { status: 409 }
    )
  }

  const agentRow = Array.isArray(campaign.agents) ? campaign.agents[0] : campaign.agents
  if (!agentRow) {
    return Response.json(
      { error: { code: 'AGENT_MISSING', message: 'This campaign has no agent assigned.' } },
      { status: 409 }
    )
  }

  const agent: AgentContext = {
    name: agentRow.name ?? 'Agent',
    companyName: agentRow.company_name ?? null,
    purpose: agentRow.purpose ?? null,
    instructions: agentRow.instructions ?? null,
    businessContext: agentRow.business_context ?? null,
  }

  // Leads that still have attempts left, oldest first. `attempts` already
  // exists on campaign_leads and is the natural cursor: a lead is due while it
  // has been tried fewer times than the campaign allows.
  const { data: members, error: membersError } = await auth.supabase
    .from('campaign_leads')
    .select('lead_id, attempts, leads(id, name, phone, company)')
    .eq('campaign_id', id)
    .lt('attempts', campaign.max_attempts)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (membersError) {
    return Response.json(
      { error: { code: 'MEMBERS_LOOKUP_FAILED', message: membersError.message } },
      { status: 500 }
    )
  }

  const due = (members ?? []).filter((member) => {
    const related = member.leads
    return Array.isArray(related) ? related.length > 0 : related !== null
  })

  if (due.length === 0) {
    return Response.json({
      data: { processed: 0, remaining: 0, message: 'Every lead in this campaign has been called.' },
    })
  }

  const voice = new DemoVoiceProvider()
  const now = Date.now()

  const callRows: Record<string, unknown>[] = []
  const leadUpdates: { id: string; status: string }[] = []
  const followUpRows: Record<string, unknown>[] = []
  const memberUpdates: { leadId: string; attempts: number }[] = []
  const activities: ActivityEntry[] = []

  for (const [index, member] of due.entries()) {
    const related = member.leads
    const leadRow = (Array.isArray(related) ? related[0] : related) as LeadRow | null
    if (!leadRow) continue

    const attempt = (member.attempts as number) + 1
    const lead: LeadContext = { name: leadRow.name, company: leadRow.company }

    const simulated = voice.simulate(leadRow.id, index, attempt, agent, lead)
    const analysis = await new DemoAIProvider(simulated.scenario).analyzeCall({
      transcript: simulated.transcript,
      answered: simulated.scenario.answered,
      agent,
      lead,
      facts: simulated.facts,
    })

    const startedAt = new Date(now - simulated.durationSeconds * 1000)
    const endedAt = new Date(now)

    callRows.push({
      workspace_id: auth.workspaceId,
      lead_id: leadRow.id,
      agent_id: campaign.agent_id,
      campaign_id: id,
      provider: DEMO_PROVIDER,
      provider_call_id: simulated.providerCallId,
      phone_number: leadRow.phone,
      status: simulated.status,
      outcome: analysis.outcome,
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      duration_seconds: simulated.durationSeconds,
      transcript: simulated.transcript,
      summary: analysis.summary,
      // next_action has no column of its own; metadata already exists for
      // exactly this kind of provider-shaped extra.
      metadata: { simulated: true, next_action: analysis.nextAction, scenario: simulated.scenario.key },
    })

    leadUpdates.push({ id: leadRow.id, status: leadStatusFor(analysis.outcome) })
    memberUpdates.push({ leadId: leadRow.id, attempts: attempt })

    activities.push(
      { leadId: leadRow.id, type: 'CALL_COMPLETED', data: { campaign_id: id, duration_seconds: simulated.durationSeconds, simulated: true } },
      { leadId: leadRow.id, type: 'CALL_OUTCOME', data: { outcome: analysis.outcome, summary: analysis.summary, next_action: analysis.nextAction } }
    )

    // A follow-up is scheduled only where it makes sense: the lead did not
    // answer, or asked to be contacted later, and the campaign opted in.
    const wantsFollowUp = analysis.outcome === 'NO_ANSWER' || analysis.outcome === 'FOLLOW_UP'
    if (wantsFollowUp && campaign.whatsapp_fallback_enabled) {
      const scheduledAt = new Date(now + (campaign.whatsapp_fallback_delay_minutes ?? 0) * 60_000)
      followUpRows.push({
        workspace_id: auth.workspaceId,
        lead_id: leadRow.id,
        channel: 'WHATSAPP',
        status: 'PENDING',
        scheduled_at: scheduledAt.toISOString(),
        message_template: buildWhatsAppMessage(agent, lead, analysis.outcome),
        provider: DEMO_PROVIDER,
        metadata: { simulated: true, campaign_id: id },
      })
      activities.push({
        leadId: leadRow.id,
        type: 'FOLLOW_UP_SCHEDULED',
        data: { channel: 'WHATSAPP', scheduled_at: scheduledAt.toISOString() },
      })
    }
  }

  const written = await persist(auth, { callRows, leadUpdates, followUpRows, memberUpdates, campaignId: id })
  if (written) return written

  await recordActivities(auth, activities)

  const { count: remaining } = await auth.supabase
    .from('campaign_leads')
    .select('lead_id', { count: 'exact', head: true })
    .eq('campaign_id', id)
    .lt('attempts', campaign.max_attempts)

  // Nothing left to call means the campaign is done.
  if (!remaining) {
    await auth.supabase
      .from('campaigns')
      .update({ status: 'COMPLETED' })
      .eq('workspace_id', auth.workspaceId)
      .eq('id', id)
  }

  return Response.json({
    data: {
      processed: callRows.length,
      followUps: followUpRows.length,
      remaining: remaining ?? 0,
      simulated: true,
    },
  })
}

/** Composes the WhatsApp message a follow-up would send. */
function buildWhatsAppMessage(agent: AgentContext, lead: LeadContext, outcome: string): string {
  const name = lead.name?.trim().split(/\s+/)[0] ?? 'there'
  const company = agent.companyName?.trim() || 'our team'
  const context = agent.businessContext?.trim()
  const offer = context ? `\n\n${context.split(/(?<=[.!?])\s/)[0]}` : ''

  if (outcome === 'NO_ANSWER') {
    return `Hi ${name} 👋\n\nWe tried calling from ${company} but could not reach you.${offer}\n\nReply here and we will pick it up whenever suits you.`
  }
  return `Hi ${name} 👋\n\nThanks for speaking with us at ${company}. As discussed, here are the details.${offer}\n\nLet me know what works best for you.`
}

/** Writes every row this run produced, or returns the first failure. */
async function persist(
  auth: AuthContext,
  input: {
    callRows: Record<string, unknown>[]
    leadUpdates: { id: string; status: string }[]
    followUpRows: Record<string, unknown>[]
    memberUpdates: { leadId: string; attempts: number }[]
    campaignId: string
  }
): Promise<Response | null> {
  if (input.callRows.length > 0) {
    // upsert on the provider pair rather than insert: re-running a batch must
    // not create a second call for the same attempt.
    const { error } = await auth.supabase
      .from('calls')
      .upsert(input.callRows, { onConflict: 'provider,provider_call_id' })

    if (error) {
      return Response.json(
        { error: { code: 'CALL_WRITE_FAILED', message: error.message } },
        { status: 500 }
      )
    }
  }

  for (const update of input.leadUpdates) {
    await auth.supabase
      .from('leads')
      .update({ status: update.status })
      .eq('workspace_id', auth.workspaceId)
      .eq('id', update.id)
  }

  for (const update of input.memberUpdates) {
    await auth.supabase
      .from('campaign_leads')
      .update({ attempts: update.attempts, last_attempt_at: new Date().toISOString() })
      .eq('campaign_id', input.campaignId)
      .eq('lead_id', update.leadId)
  }

  if (input.followUpRows.length > 0) {
    const { error } = await auth.supabase.from('follow_ups').insert(input.followUpRows)
    if (error) {
      return Response.json(
        { error: { code: 'FOLLOW_UP_WRITE_FAILED', message: error.message } },
        { status: 500 }
      )
    }
  }

  return null
}
