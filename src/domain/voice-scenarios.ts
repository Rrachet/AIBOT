/**
 * The conversations a salesperson can choose to demonstrate.
 *
 * Not every scenario the engine knows — the campaign engine also deals an
 * unanswered call, which is a real outcome and a terrible demonstration. These
 * are the six worth sitting in front of a prospect with: one straightforward
 * enquiry, one keen buyer, and the four objections an agent actually meets.
 *
 * Kept in `domain` because both ends need them: the browser renders the chips
 * and the server validates the request against the same list, so a label and a
 * key can never drift apart.
 */

export const PREVIEW_SCENARIOS = [
  'DISCOVERY',
  'INTERESTED',
  'HAS_AGENCY',
  'NOT_INTERESTED',
  'SEND_DETAILS',
  'TOO_EXPENSIVE',
] as const;

export type PreviewScenario = (typeof PREVIEW_SCENARIOS)[number];

export const PREVIEW_SCENARIO_LABEL: Record<PreviewScenario, string> = {
  DISCOVERY: 'Normal enquiry',
  INTERESTED: 'Interested',
  HAS_AGENCY: 'Already have an agency',
  NOT_INTERESTED: 'Not interested',
  SEND_DETAILS: 'Send me details',
  TOO_EXPENSIVE: 'Too expensive',
};

/** One line on what the agent is being asked to demonstrate. */
export const PREVIEW_SCENARIO_HINT: Record<PreviewScenario, string> = {
  DISCOVERY: 'Finds out how they work today and proposes a next step.',
  INTERESTED: 'Qualifies a keen buyer and agrees a time.',
  HAS_AGENCY: 'Asks whether they are happy rather than attacking the incumbent.',
  NOT_INTERESTED: 'Takes no for an answer, first time.',
  SEND_DETAILS: 'Finds out what to send before sending anything.',
  TOO_EXPENSIVE: 'Works out what the objection actually is. Offers no discount.',
};

export const DEFAULT_PREVIEW_SCENARIO: PreviewScenario = 'DISCOVERY';

export function isPreviewScenario(value: unknown): value is PreviewScenario {
  return typeof value === 'string' && (PREVIEW_SCENARIOS as readonly string[]).includes(value);
}
