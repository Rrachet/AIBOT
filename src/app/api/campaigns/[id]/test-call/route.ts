import { z } from 'zod'
import { requireAuth, type AuthContext } from '@/lib/api/auth'
import { readAiCallConfig } from '@/domain/ai-config'
import { DemoVoiceProvider, DEMO_PROVIDER } from '@/server/providers/demo-voice'
import { isDemoVoice } from '@/server/providers/voice'
import { DemoAIProvider } from '@/server/ai/demo-ai'
import { buildCallContext } from '@/server/demo/call-context'
import { capabilitiesFor } from '@/server/capabilities'
import { SPEECH_REGISTERS, type SpeechRegister } from '@/lib/speech/speech-types'
import { PREVIEW_SCENARIOS } from '@/domain/voice-scenarios'
import { scenarioByKey, scenarioFor } from '@/server/demo/scenarios'
import type { AgentContext, LeadContext } from '@/server/demo/transcript'

/**
 * One simulated call against a campaign's full configuration.
 *
 * This is the "will it say the right thing?" check a business owner runs before
 * pointing a campaign at real people. Unlike the agent demo call, it uses the
 * campaign's product, script, questions and constraints, so what it shows is
 * what that campaign would actually do.
 *
 * It never dials. The number the user types is stored on the call record
 * because a test is only meaningful if you can see who it was aimed at, but no
 * telephony provider is contacted and the UI says so before and during.
 *
 * Three things it deliberately does not do, all so that testing cannot
 * contaminate the real numbers:
 *
 * - It does not attach the call to the campaign. `campaign_id` stays null, so
 *   campaign performance counts only calls the campaign actually made.
 * - It does not change any lead's status. Testing a script is not an attempt on
 *   a person.
 * - It does not schedule a follow-up. Nobody was contacted, so there is nothing
 *   to follow up.
 *
 * A workspace with the live voice preview capability may also choose the
 * language the conversation is held in. That choice reaches the one transcript
 * builder, so the call really is in that language — it is not an English call
 * read aloud with a Hindi accent, and there is no second script anywhere. The
 * capability is checked here, against the workspace `requireAuth` resolved from
 * the session, because a control the browser can see is not a permission.
 */

/**
 * Enough to cover international formats without accepting free text. The
 * number is never dialled; this stops the field being used as a notes box.
 */
const PHONE = /^[+]?[0-9 ()\-.]{6,24}$/

const bodySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter a name for the test contact.')
    .max(80)
    // Control characters would survive into the transcript and the call record.
    // eslint-disable-next-line no-control-regex
    .refine((value) => !/[\u0000-\u001F\u007F]/.test(value), 'That name contains invalid characters.'),
  phone: z
    .string()
    .trim()
    .min(6)
    .max(24)
    .regex(PHONE, 'Enter a phone number, digits only apart from + ( ) - and spaces.'),
  /**
   * The language to hold the call in. Absent means English, which is what
   * every workspace without the capability gets and what every existing caller
   * already sent.
   */
  language: z.enum(SPEECH_REGISTERS).optional(),
  /**
   * Which conversation to hold. Absent keeps the rotation a test call has
   * always used, so every existing caller gets exactly what it got before.
   */
  scenario: z.enum(PREVIEW_SCENARIOS).optional(),
})

const idSchema = z.string().uuid()

/** A second submission inside this window is treated as a double click. */
const REPEAT_WINDOW_MS = 4000

function notFound() {
  return Response.json(
    { error: { code: 'CAMPAIGN_NOT_FOUND', message: 'Campaign not found' } },
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
          message: 'A real voice provider is configured, so simulated calls are disabled.',
        },
      },
      { status: 409 }
    )
  }

  const { id } = await context.params
  if (!idSchema.safeParse(id).success) return notFound()

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() } },
      { status: 400 }
    )
  }

  // Refused rather than quietly downgraded to English. A caller that asked for
  // a Hindi call and silently received an English one would have no way of
  // knowing, and "it did something else instead" is a worse answer than "no".
  const register: SpeechRegister = parsed.data.language ?? 'ENGLISH'
  const chosenScenario = parsed.data.scenario ?? null
  const wantsDemoOptions = register !== 'ENGLISH' || chosenScenario !== null

  if (wantsDemoOptions && !capabilitiesFor(auth.workspaceId).liveVoicePreview) {
    return Response.json(
      {
        error: {
          code: 'CAPABILITY_REQUIRED',
          message: 'This workspace cannot choose the language or scenario of a test call.',
        },
      },
      { status: 403 }
    )
  }

  // Campaign and agent are read together under this workspace, so a campaign
  // belonging to someone else reads as missing rather than leaking that it
  // exists.
  const { data: campaign } = await auth.supabase
    .from('campaigns')
    .select(
      'id, name, agent_id, ai_call_config, agents(id, name, company_name, purpose, instructions, business_context, active)'
    )
    .eq('workspace_id', auth.workspaceId)
    .eq('id', id)
    .maybeSingle()

  if (!campaign) return notFound()

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

  const config = readAiCallConfig(campaign.ai_call_config)
  const callContext = buildCallContext(agent, config)

  const testLead = await resolveTestLead(auth)
  if (testLead instanceof Response) return testLead

  const lead: LeadContext = { name: parsed.data.name, company: campaign.name }

  // Prior tests of this campaign decide the scenario, so running the test again
  // shows a different outcome instead of repeating the first.
  const { data: priorRows } = await auth.supabase
    .from('calls')
    .select('id, created_at')
    .eq('workspace_id', auth.workspaceId)
    .eq('lead_id', testLead)
    .is('campaign_id', null)
    .contains('metadata', { campaign_test: true, tested_campaign_id: id })
    .order('created_at', { ascending: false })

  const prior = priorRows ?? []
  const newest = prior[0]

  // Two requests for one intention: return the call just made rather than
  // writing a second the user never asked for.
  if (newest && Date.now() - Date.parse(newest.created_at as string) < REPEAT_WINDOW_MS) {
    const { data: recent } = await auth.supabase
      .from('calls')
      .select('*')
      .eq('workspace_id', auth.workspaceId)
      .eq('id', newest.id)
      .single()

    // A different language or scenario is a different intention, not a double
    // click, so it is run rather than answered with the call before it.
    const previous = recent?.metadata as Record<string, unknown> | null
    const sameRequest =
      (previous?.language ?? 'ENGLISH') === register &&
      (chosenScenario === null || previous?.scenario === chosenScenario)

    if (recent && sameRequest) {
      return Response.json({
        data: {
          call: recent,
          contact: parsed.data,
          nextAction: (recent.metadata as Record<string, unknown> | null)?.next_action ?? null,
        },
      })
    }
  }

  const attempt = prior.length + 1
  const voice = new DemoVoiceProvider()

  // Seeded on the campaign rather than the stand-in lead, so two campaigns
  // tested with the same name produce different conversations.
  // A chosen scenario replaces the rotation for this one call. Nothing about
  // the rotation itself moves, so a campaign run still deals exactly the mix it
  // dealt before.
  const simulated = voice.simulate(
    id,
    prior.length,
    1,
    agent,
    lead,
    callContext,
    register,
    chosenScenario ? scenarioByKey(chosenScenario) : scenarioFor(prior.length, 1)
  )

  const analysis = await new DemoAIProvider(simulated.scenario).analyzeCall({
    transcript: simulated.transcript,
    answered: simulated.scenario.answered,
    agent,
    lead,
    facts: simulated.facts,
  })

  const now = Date.now()

  const { data: call, error } = await auth.supabase
    .from('calls')
    .upsert(
      {
        workspace_id: auth.workspaceId,
        lead_id: testLead,
        agent_id: agentRow.id,
        // Never attached to the campaign: see the module comment.
        campaign_id: null,
        provider: DEMO_PROVIDER,
        provider_call_id: `demo_test_${id}_${attempt}`,
        phone_number: parsed.data.phone,
        status: simulated.status,
        outcome: analysis.outcome,
        started_at: new Date(now - simulated.durationSeconds * 1000).toISOString(),
        ended_at: new Date(now).toISOString(),
        duration_seconds: simulated.durationSeconds,
        transcript: simulated.transcript,
        summary: analysis.summary,
        metadata: {
          simulated: true,
          campaign_test: true,
          tested_campaign_id: id,
          tested_campaign_name: campaign.name,
          contact_name: parsed.data.name,
          next_action: analysis.nextAction,
          scenario: simulated.scenario.key,
          // True only when the user picked it, so a stored call still says
          // whether its conversation was dealt or chosen.
          scenario_chosen: chosenScenario !== null,
          // Which language the conversation above was written in. Read back by
          // the preview so it asks for the right voice; a Hindi transcript read
          // by an English voice would be nobody's idea of a demo.
          language: register,
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

  return Response.json({
    data: { call, contact: parsed.data, nextAction: analysis.nextAction },
  })
}

/**
 * The lead row a test call is recorded against.
 *
 * `calls.lead_id` is NOT NULL, so a test needs one. Rather than creating a
 * person for every name someone types into the test box — which would fill the
 * lead list with people who were never leads — every test in a workspace hangs
 * off a single hidden holder row. The name and number the user actually typed
 * are kept on the call itself.
 */
const TEST_HOLDER_PHONE = 'aibot:test-calls'

async function resolveTestLead(auth: AuthContext): Promise<string | Response> {
  const { data: existing } = await auth.supabase
    .from('leads')
    .select('id')
    .eq('workspace_id', auth.workspaceId)
    .eq('phone', TEST_HOLDER_PHONE)
    .order('created_at', { ascending: true })
    .limit(1)

  if (existing && existing.length > 0) return existing[0]!.id as string

  const { data: created, error } = await auth.supabase
    .from('leads')
    .insert({
      workspace_id: auth.workspaceId,
      name: 'Test calls',
      phone: TEST_HOLDER_PHONE,
      source: 'MANUAL',
      status: 'NEW',
      metadata: { test_call_holder: true },
    })
    .select('id')
    .single()

  if (error || !created) {
    return Response.json(
      {
        error: {
          code: 'TEST_CALL_SETUP_FAILED',
          message: error?.message ?? 'Could not prepare the test call.',
        },
      },
      { status: 500 }
    )
  }

  return created.id as string
}
