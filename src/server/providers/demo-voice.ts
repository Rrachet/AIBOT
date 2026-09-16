import type { CallResult, CallStatus, InitiateCallInput, VoiceProvider } from '@/domain/types'
import { buildDuration, buildTranscript, type AgentContext, type CallFacts, type LeadContext } from '@/server/demo/transcript'
import type { CallContext } from '@/server/demo/call-context'
import { scenarioFor, type Scenario } from '@/server/demo/scenarios'

/**
 * A voice provider that never places a call.
 *
 * It satisfies the same `VoiceProvider` contract a real provider will, so the
 * campaign code above it is written once. What it does instead of dialling is
 * produce the conversation that call would plausibly have had, deterministically
 * from the lead id and the agent's configuration.
 *
 * Safety properties, in order of importance:
 *
 * - No network call is made and no phone number is contacted. There is no code
 *   path here that could reach a telephony API even by mistake.
 * - Every call it produces is stamped `provider: 'demo'`, which is what the UI
 *   keys its "Demo call" labelling off. A demo call is never presentable as a
 *   real one.
 * - Results are reproducible, so a demo can be rehearsed.
 */

export interface SimulatedCall {
  providerCallId: string
  scenario: Scenario
  status: CallStatus
  durationSeconds: number
  transcript: string | null
  /** What the conversation settled on, for whoever summarises it. */
  facts: CallFacts
}

export const DEMO_PROVIDER = 'demo'

/** Stable per attempt, so re-running a campaign cannot double-insert a call. */
export function demoCallId(leadId: string, attempt: number): string {
  return `${DEMO_PROVIDER}_${leadId}_${attempt}`
}

export class DemoVoiceProvider implements VoiceProvider {
  readonly name = DEMO_PROVIDER

  /**
   * Present so the demo satisfies the production contract. The campaign demo
   * runner uses `simulate` instead, because a real provider answers
   * asynchronously by webhook while this one can answer immediately — that
   * difference in control flow is real and is not worth hiding.
   */
  async initiateCall(input: InitiateCallInput): Promise<CallResult> {
    const scenario = scenarioFor(0)
    return {
      provider: DEMO_PROVIDER,
      providerCallId: demoCallId(input.leadId, 1),
      status: scenario.callStatus,
    }
  }

  async getCallStatus(): Promise<CallStatus> {
    // Demo calls reach a terminal state the moment they are simulated; there
    // is never an in-flight call to poll for.
    return 'COMPLETED'
  }

  async getTranscript(): Promise<string | null> {
    // Regenerating a transcript needs the agent and lead the call was for,
    // which this signature does not carry. The runner stores the transcript on
    // the call row when it simulates, so nothing needs to re-derive it.
    return null
  }

  /** Full simulated result, used by the campaign demo runner. */
  simulate(
    leadId: string,
    index: number,
    attempt: number,
    agent: AgentContext,
    lead: LeadContext,
    context: CallContext | null = null
  ): SimulatedCall {
    const scenario = scenarioFor(index, attempt)
    const transcript = buildTranscript(scenario, agent, lead, leadId, context)
    return {
      providerCallId: demoCallId(leadId, attempt),
      scenario,
      status: scenario.callStatus,
      durationSeconds: buildDuration(scenario, leadId),
      transcript: transcript.text,
      facts: transcript.facts,
    }
  }
}
