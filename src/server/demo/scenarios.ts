import type { CallOutcome, CallStatus, LeadStatus } from '@/domain/types'

/**
 * Deterministic conversation scenarios for the demo call engine.
 *
 * AIBOT has no telephony provider connected. Rather than leave the product
 * unusable until one is, the demo engine simulates a call locally so the rest
 * of the loop — transcript, outcome, lead status, follow-up, analytics — runs
 * on real data and can be shown end to end.
 *
 * Two rules keep this honest and useful:
 *
 * 1. Nothing here dials anyone. No number is contacted and no audio exists.
 *    Every call produced this way is stored with provider 'demo' and is
 *    labelled as a simulation wherever it is shown.
 *
 * 2. The result is deterministic, not random. Scenarios are dealt from a fixed
 *    pattern by the lead's position in the campaign, so the same campaign
 *    always produces the same conversations in the same order. A demo can be
 *    rehearsed, re-run and explained, which random output would make
 *    impossible.
 *
 * 3. The mix is chosen, not uniform. Hashing lead ids gave a flat distribution
 *    that regularly produced a run of refusals and no qualified leads at all —
 *    accurate to nothing in particular, and useless for showing what the
 *    product does. The pattern below is weighted towards a plausible good day
 *    while still including every outcome the pipeline has to handle.
 */

export type ScenarioKey = 'INTERESTED' | 'NO_ANSWER' | 'FOLLOW_UP' | 'NOT_INTERESTED'

export interface Scenario {
  key: ScenarioKey
  /** Whether the lead picked up at all. */
  answered: boolean
  callStatus: CallStatus
  outcome: CallOutcome
  leadStatus: LeadStatus
  /** Roughly how long the call ran, in seconds; 0 when unanswered. */
  durationRange: readonly [number, number]
}

export const SCENARIOS: readonly Scenario[] = [
  {
    key: 'INTERESTED',
    answered: true,
    callStatus: 'COMPLETED',
    outcome: 'QUALIFIED',
    leadStatus: 'QUALIFIED',
    durationRange: [95, 190],
  },
  {
    key: 'NO_ANSWER',
    answered: false,
    callStatus: 'NO_ANSWER',
    outcome: 'NO_ANSWER',
    leadStatus: 'NO_ANSWER',
    durationRange: [0, 0],
  },
  {
    key: 'FOLLOW_UP',
    answered: true,
    callStatus: 'COMPLETED',
    outcome: 'FOLLOW_UP',
    leadStatus: 'FOLLOW_UP',
    durationRange: [55, 110],
  },
  {
    key: 'NOT_INTERESTED',
    answered: true,
    callStatus: 'COMPLETED',
    outcome: 'NOT_INTERESTED',
    leadStatus: 'NOT_INTERESTED',
    durationRange: [25, 60],
  },
]

/**
 * Stable 32-bit hash (FNV-1a). Used instead of Math.random so a lead's
 * scenario, duration and dialogue never change between runs.
 */
export function seedFrom(value: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

const BY_KEY = new Map(SCENARIOS.map((scenario) => [scenario.key, scenario]))

/**
 * The order scenarios are dealt in, repeating every eight leads:
 * three qualified, two follow-ups, two unanswered, one refusal.
 *
 * Front-loaded so that even a five-lead demo shows a qualified lead first and
 * still covers all four outcomes.
 */
const PATTERN: readonly ScenarioKey[] = [
  'INTERESTED',
  'NO_ANSWER',
  'INTERESTED',
  'FOLLOW_UP',
  'NOT_INTERESTED',
  'INTERESTED',
  'FOLLOW_UP',
  'NO_ANSWER',
]

/**
 * Picks the scenario for the lead at `index` within its campaign.
 *
 * Later attempts are shifted along the pattern, so a lead that did not answer
 * the first time can connect on a retry rather than being permanently
 * unreachable — which is what makes the retry setting worth demonstrating.
 */
export function scenarioFor(index: number, attempt = 1): Scenario {
  const position = (Math.max(0, index) + Math.max(0, attempt - 1)) % PATTERN.length
  return BY_KEY.get(PATTERN[position]!)!
}

/** Deterministic value inside a range, derived from the same seed. */
export function pickInRange(seed: number, [min, max]: readonly [number, number]): number {
  if (max <= min) return min
  return min + (seed % (max - min + 1))
}
