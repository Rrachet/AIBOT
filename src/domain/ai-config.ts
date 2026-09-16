import { z } from 'zod';

/**
 * A campaign's AI call configuration.
 *
 * This is what the business owner tells AIBOT about the thing being sold and
 * how they want it talked about. It is stored as one `jsonb` column on
 * `campaigns`, so Postgres does not know these field names — this schema is the
 * only definition of the shape, and every write goes through it.
 *
 * Nothing here trains a model. It is the context a calling model will be given
 * when one is connected; today it steers the simulated conversation.
 */

/** What the call is trying to achieve. Drives how the agent closes. */
export const CALL_OBJECTIVES = [
  'QUALIFY',
  'BOOK_APPOINTMENT',
  'BOOK_DEMO',
  'COLLECT_REQUIREMENTS',
  'GENERATE_INTEREST',
  'FOLLOW_UP',
] as const;

export type CallObjective = (typeof CALL_OBJECTIVES)[number];

export const CALL_OBJECTIVE_LABEL: Record<CallObjective, string> = {
  QUALIFY: 'Qualify the lead',
  BOOK_APPOINTMENT: 'Book a visit or appointment',
  BOOK_DEMO: 'Book a demo',
  COLLECT_REQUIREMENTS: 'Collect requirements',
  GENERATE_INTEREST: 'Generate interest',
  FOLLOW_UP: 'Follow up on an enquiry',
};

export const CALL_OBJECTIVE_HINT: Record<CallObjective, string> = {
  QUALIFY: 'Find out whether this lead is worth a salesperson’s time.',
  BOOK_APPOINTMENT: 'Agree a day and time for a site visit or meeting.',
  BOOK_DEMO: 'Agree a slot to walk them through the product.',
  COLLECT_REQUIREMENTS: 'Capture what they need so someone can prepare a quote.',
  GENERATE_INTEREST: 'Introduce the offer and get permission to send details.',
  FOLLOW_UP: 'Pick up an earlier conversation and move it forward.',
};

/**
 * Field limits.
 *
 * Generous enough for a real sales script, bounded so one campaign cannot
 * store an unreasonable amount of text in a row every call has to read.
 */
export const LIMITS = {
  productName: 120,
  productDescription: 2000,
  callScript: 20_000,
  qualificationQuestions: 4000,
  knowledge: 8000,
  mustSay: 2000,
  mustNotSay: 2000,
} as const;

/**
 * Empty strings are stored as absent rather than as "".
 *
 * A cleared textarea and a field that was never filled in mean the same thing,
 * and keeping both shapes would mean every reader has to check for both.
 */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value.length === 0 ? undefined : value))
    .optional();

export const aiCallConfigSchema = z
  .object({
    productName: optionalText(LIMITS.productName),
    productDescription: optionalText(LIMITS.productDescription),
    callObjective: z.enum(CALL_OBJECTIVES).optional(),
    callScript: optionalText(LIMITS.callScript),
    qualificationQuestions: optionalText(LIMITS.qualificationQuestions),
    knowledge: optionalText(LIMITS.knowledge),
    mustSay: optionalText(LIMITS.mustSay),
    mustNotSay: optionalText(LIMITS.mustNotSay),
  })
  // Unknown keys are dropped rather than rejected, so a config written by an
  // older or newer build cannot fail a save or smuggle extra fields into the
  // column.
  .strip();

export type AiCallConfig = z.infer<typeof aiCallConfigSchema>;

export const EMPTY_AI_CONFIG: AiCallConfig = {};

/** Parses a stored value, falling back to empty rather than throwing on a bad row. */
export function readAiCallConfig(value: unknown): AiCallConfig {
  const parsed = aiCallConfigSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : EMPTY_AI_CONFIG;
}

/* -------------------------------------------------------------------------- */
/* Readiness                                                                  */
/* -------------------------------------------------------------------------- */

export interface ReadinessItem {
  id: string;
  label: string;
  done: boolean;
  /** True when a campaign cannot sensibly run without it. */
  required: boolean;
  /** What to do about it, shown only when it is not done. */
  hint: string;
}

/**
 * What is configured and what is still missing.
 *
 * Only two things are genuinely required: an agent to do the talking and an
 * objective to aim at. Everything else improves the call without being
 * necessary for one, and blocking on them would stop someone trying the
 * product before they have written a script.
 */
export function readiness(input: {
  hasAgent: boolean;
  agentActive: boolean;
  config: AiCallConfig;
  leadCount: number;
}): ReadinessItem[] {
  const { config } = input;

  return [
    {
      id: 'agent',
      label: 'Agent selected',
      done: input.hasAgent && input.agentActive,
      required: true,
      hint: input.hasAgent
        ? 'This campaign’s agent is paused. Activate it before calling.'
        : 'Choose the agent that will make these calls.',
    },
    {
      id: 'objective',
      label: 'Call objective set',
      done: Boolean(config.callObjective),
      required: true,
      hint: 'Pick what the call should achieve — it decides how the agent closes.',
    },
    {
      id: 'product',
      label: 'Product configured',
      done: Boolean(config.productName || config.productDescription),
      required: false,
      hint: 'Add what you are selling so the agent has something concrete to offer.',
    },
    {
      id: 'script',
      label: 'Call script added',
      done: Boolean(config.callScript),
      required: false,
      hint: 'Paste your script and the agent will open the way you would.',
    },
    {
      id: 'qualification',
      label: 'Qualification questions added',
      done: Boolean(config.qualificationQuestions),
      required: false,
      hint: 'List what the agent should find out on the call.',
    },
    {
      id: 'leads',
      label: 'Leads attached',
      done: input.leadCount > 0,
      required: true,
      hint: 'Attach the people this campaign should call.',
    },
  ];
}

/** True when the campaign has everything it genuinely needs to run. */
export function isReady(items: readonly ReadinessItem[]): boolean {
  return items.every((item) => item.done || !item.required);
}

/** What is still missing and required, for a one-line explanation. */
export function blockingReasons(items: readonly ReadinessItem[]): string[] {
  return items.filter((item) => item.required && !item.done).map((item) => item.hint);
}
