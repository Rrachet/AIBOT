import type { CallOutcome } from '@/domain/types'
import type { AgentContext, CallFacts, LeadContext } from '@/server/demo/transcript'

/**
 * The boundary between "a call happened" and "we know what it meant".
 *
 * Today this is satisfied by `DemoAIProvider`, which derives the outcome from
 * the scenario that produced the transcript. A real implementation will send
 * the transcript to a model and ask for the same three fields. Because both
 * sides of that swap speak this interface, nothing downstream — lead status,
 * follow-ups, analytics — changes when it happens.
 */

export interface CallAnalysis {
  outcome: CallOutcome
  /** One or two sentences a salesperson could read at a glance. */
  summary: string
  /** What should happen next, in plain language. */
  nextAction: string
}

export interface AnalyzeCallInput {
  transcript: string | null
  answered: boolean
  agent: AgentContext
  lead: LeadContext
  /**
   * What the call actually settled on. A real provider will read these out of
   * the transcript; the demo provider is handed them, so its summary can never
   * contradict the conversation above it.
   */
  facts: CallFacts
}

export interface AIProvider {
  readonly name: string
  analyzeCall(input: AnalyzeCallInput): Promise<CallAnalysis>
}
