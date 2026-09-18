import { z } from 'zod'
import { requireAuth } from '@/lib/api/auth'
import { readAiCallConfig } from '@/domain/ai-config'
import { DEMO_CONTACT } from '@/domain/demo-contact'
import { PREVIEW_SCENARIOS } from '@/domain/voice-scenarios'
import { capabilitiesFor } from '@/server/capabilities'
import { DemoAIProvider } from '@/server/ai/demo-ai'
import { buildCallContext } from '@/server/demo/call-context'
import { scenarioByKey } from '@/server/demo/scenarios'
import { buildDuration, buildTranscript, type AgentContext, type LeadContext } from '@/server/demo/transcript'
import { SPEECH_REGISTERS } from '@/lib/speech/speech-types'

/**
 * A conversation to listen to, and nothing else.
 *
 * This is the "let's try the objection you keep hearing" endpoint. It runs the
 * campaign's real configuration through the same generator a test call uses and
 * hands back what the agent would say — for a chosen scenario, in a chosen
 * language.
 *
 * It writes nothing. Not a call, not a lead, not a campaign membership, not a
 * follow-up, not an activity. That is the whole point: a salesperson flicking
 * between six scenarios in front of a client must not leave six calls in the
 * customer's records, and must not move a single number on the dashboard.
 * Hence GET — there is no resource to create, only one to read.
 *
 * Deterministic, so the same choice always produces the same conversation. A
 * demonstration that changed its wording between the rehearsal and the meeting
 * would be worse than no demonstration.
 *
 * Gated on the live voice preview capability, resolved from the workspace the
 * session belongs to. The browser can ask; only the server decides.
 */

const querySchema = z.object({
  scenario: z.enum(PREVIEW_SCENARIOS),
  language: z.enum(SPEECH_REGISTERS).default('ENGLISH'),
})

const idSchema = z.string().uuid()

function notFound() {
  return Response.json(
    { error: { code: 'CAMPAIGN_NOT_FOUND', message: 'Campaign not found' } },
    { status: 404 }
  )
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request)
  if (auth instanceof Response) return auth

  if (!capabilitiesFor(auth.workspaceId).liveVoicePreview) {
    return Response.json(
      {
        error: {
          code: 'CAPABILITY_REQUIRED',
          message: 'This workspace does not have the live voice preview.',
        },
      },
      { status: 403 }
    )
  }

  const { id } = await context.params
  if (!idSchema.safeParse(id).success) return notFound()

  const url = new URL(request.url)
  const parsed = querySchema.safeParse({
    scenario: url.searchParams.get('scenario') ?? undefined,
    language: url.searchParams.get('language') ?? undefined,
  })

  if (!parsed.success) {
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() } },
      { status: 400 }
    )
  }

  // Read under this workspace, so a campaign belonging to someone else reads as
  // missing rather than leaking that it exists.
  const { data: campaign } = await auth.supabase
    .from('campaigns')
    .select(
      'id, name, ai_call_config, agents(name, company_name, purpose, instructions, business_context)'
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

  const { scenario: key, language } = parsed.data
  const scenario = scenarioByKey(key)
  const lead: LeadContext = { name: DEMO_CONTACT.name, company: campaign.name }

  // The seed, and so the whole conversation, is a pure function of what was
  // asked for. Nothing about when it was asked, or how often, can change it.
  const seed = `voice-preview:${id}:${key}:${language}`

  const transcript = buildTranscript(
    scenario,
    agent,
    lead,
    seed,
    buildCallContext(agent, readAiCallConfig(campaign.ai_call_config)),
    language
  )

  const analysis = await new DemoAIProvider(scenario).analyzeCall({
    transcript: transcript.text,
    answered: scenario.answered,
    agent,
    lead,
    facts: transcript.facts,
  })

  return Response.json({
    data: {
      scenario: key,
      language,
      contact: { name: DEMO_CONTACT.name },
      transcript: transcript.text,
      outcome: analysis.outcome,
      summary: analysis.summary,
      nextAction: analysis.nextAction,
      durationSeconds: buildDuration(scenario, seed),
      /**
       * Said here as well as on the screen. Anything consuming this endpoint is
       * describing a conversation that never happened, and the response should
       * not be quotable as though it had.
       */
      simulated: true,
    },
  })
}
