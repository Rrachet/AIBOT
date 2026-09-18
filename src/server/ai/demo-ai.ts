import type { CallOutcome } from '@/domain/types'
import type { Scenario, ScenarioKey } from '@/server/demo/scenarios'
import type { AIProvider, AnalyzeCallInput, CallAnalysis } from './types'

/**
 * Outcome extraction without an AI provider.
 *
 * No model is called and no API key is required. The summary and next action
 * are composed from the agent's configuration and the scenario that produced
 * the transcript, which is the one thing a real model would have to infer.
 *
 * This is deliberately not a fake model: it does not pretend to read the
 * transcript. It reads the scenario, which is the ground truth the transcript
 * was generated from. Swapping in `RealAIProvider` moves that inference to a
 * model without changing anything that consumes `CallAnalysis`.
 */

function firstName(name: string | null): string {
  const trimmed = name?.trim()
  if (!trimmed) return 'The lead'
  return trimmed.split(/\s+/)[0] ?? 'The lead'
}

const SUMMARY: Record<ScenarioKey, (input: AnalyzeCallInput) => CallAnalysis> = {
  INTERESTED: (input) => {
    const slot = input.facts.agreedSlot
    // A campaign that was only qualifying never agreed a time, so the next
    // action comes from its objective rather than assuming a visit.
    const objectiveAction = input.facts.objectiveNextAction
    return {
      outcome: 'QUALIFIED',
      summary: slot
        ? `${firstName(input.lead.name)} is interested and asked about next steps. A visit was agreed for ${slot}.`
        : `${firstName(input.lead.name)} is interested and asked about next steps.`,
      nextAction: slot
        ? `Send the address and confirm the ${slot} slot.`
        : objectiveAction ?? 'Agree a time with them and send the details across.',
    }
  },
  FOLLOW_UP: (input) => {
    const day = input.facts.callbackDay
    return {
      outcome: 'FOLLOW_UP',
      summary: day
        ? `${firstName(input.lead.name)} is interested but was busy. Asked for details in writing and a call back on ${day}.`
        : `${firstName(input.lead.name)} is interested but was busy. Asked for details in writing and a call back later in the week.`,
      nextAction: day
        ? `Send the details now and call back ${day}.`
        : 'Send the details now and call back later in the week.',
    }
  },
  NOT_INTERESTED: (input) => ({
    outcome: 'NOT_INTERESTED',
    summary: `${firstName(input.lead.name)} ${input.facts.declineReason ?? 'is not interested'} and asked to be removed from the list.`,
    nextAction: 'Do not contact again. Suppress from future campaigns.',
  }),
  NO_ANSWER: (input) => ({
    outcome: 'NO_ANSWER',
    summary: `${firstName(input.lead.name)} did not answer. No conversation took place.`,
    nextAction: 'Retry later, or send a WhatsApp message instead.',
  }),

  // The hand-picked scenarios. Their next action is decided by the transcript
  // that produced them and arrives on `facts`, so what is summarised here can
  // never contradict what was agreed on the call.
  DISCOVERY: (input) => ({
    outcome: 'QUALIFIED',
    summary: `${firstName(input.lead.name)} talked through how they run this today and agreed a short plan would be useful.`,
    nextAction: input.facts.objectiveNextAction ?? 'Send the plan discussed and follow up.',
  }),
  HAS_AGENCY: (input) => ({
    outcome: 'FOLLOW_UP',
    summary: `${firstName(input.lead.name)} already works with an agency and is mostly happy, but said the work is inconsistent.`,
    nextAction:
      input.facts.objectiveNextAction ?? 'Send a comparison against their current agency.',
  }),
  SEND_DETAILS: (input) => ({
    outcome: 'FOLLOW_UP',
    summary: `${firstName(input.lead.name)} asked for costs and timelines in writing, on WhatsApp.`,
    nextAction: input.facts.objectiveNextAction ?? 'Send costs and timelines, then check back.',
  }),
  TOO_EXPENSIVE: (input) => ({
    outcome: 'FOLLOW_UP',
    summary: `${firstName(input.lead.name)} thinks it is expensive and is unsure of the return. No discount was offered.`,
    nextAction:
      input.facts.objectiveNextAction ?? 'Send the value case built from their own numbers.',
  }),
}

export class DemoAIProvider implements AIProvider {
  readonly name = 'demo'

  /** The scenario is supplied rather than inferred; see the module comment. */
  constructor(private readonly scenario: Scenario) {}

  async analyzeCall(input: AnalyzeCallInput): Promise<CallAnalysis> {
    return SUMMARY[this.scenario.key](input)
  }
}

/** Lead status implied by a call outcome. */
export function leadStatusFor(outcome: CallOutcome) {
  switch (outcome) {
    case 'QUALIFIED':
      return 'QUALIFIED' as const
    case 'NOT_INTERESTED':
      return 'NOT_INTERESTED' as const
    case 'FOLLOW_UP':
      return 'FOLLOW_UP' as const
    case 'NO_ANSWER':
    case 'BUSY':
      return 'NO_ANSWER' as const
    case 'FAILED':
      return 'FAILED' as const
    case 'CONNECTED':
      return 'CONTACTED' as const
  }
}
