import type { AiCallConfig, CallObjective } from '@/domain/ai-config'
import type { AgentContext } from './transcript'

/**
 * Resolves what the agent actually says on a call, from layers that override
 * each other in a fixed order.
 *
 * The order is deliberate and is the whole point of this module:
 *
 *   SAFETY  →  AGENT INSTRUCTIONS  →  CAMPAIGN INSTRUCTIONS
 *           →  PRODUCT KNOWLEDGE   →  CALL SCRIPT  →  LEAD CONTEXT
 *
 * Later layers refine earlier ones — a campaign's qualification questions
 * replace the agent's generic instructions, its product description replaces
 * the agent's business context — but nothing a user types can reach past the
 * safety layer. `mustNotSay` filters the agent's own lines; it cannot suppress
 * a safety rule, and no configuration field can add one.
 *
 * This is the shape a real calling model will be handed as its system context.
 * Nothing here is sent anywhere today: it steers the simulated conversation, so
 * what the demo shows is what the configuration actually says.
 */

/**
 * Rules the configuration can never override.
 *
 * Held as data rather than prose so the boundary is checkable: a caller can
 * assert that these survive whatever a campaign was configured with.
 */
export const SAFETY_RULES: readonly string[] = [
  'Never claim to be a human being.',
  'Never promise a price, discount or delivery date that is not in the provided knowledge.',
  'Stop the call and record it if the person asks not to be contacted again.',
  'Never ask for payment details, passwords or identity documents.',
]

export interface CallContext {
  agent: AgentContext
  /** Null when this call is not attached to a configured campaign. */
  config: AiCallConfig | null
  /** The one thing the agent offers out loud. */
  pitch: string | null
  /** What the agent should find out, in the user's own words. */
  topics: readonly string[]
  /** The agent's own opening, taken from the script when one was supplied. */
  scriptOpening: string | null
  /** A fact the agent may offer if the conversation calls for it. */
  knowledge: string | null
  objective: CallObjective | null
  mustSay: readonly string[]
  mustNotSay: readonly string[]
}

/** First sentence of a block, length-capped, or null when there is nothing. */
function firstSentence(value: string | null | undefined, max: number): string | null {
  const text = value?.trim()
  if (!text) return null
  const sentence = text.split(/(?<=[.!?])\s/)[0] ?? text
  return sentence.length > max ? `${sentence.slice(0, max - 1)}…` : sentence
}

/**
 * Lowercases a leading capital that is only there because the user started a
 * list item, while leaving names and acronyms alone.
 *
 * "Budget range" is spliced mid-sentence and should read "budget range";
 * "LinkedIn usage" and "HR headcount" must not be mangled. A word is treated
 * as sentence-case — and so safe to lower — only when the rest of it is
 * lowercase.
 */
function uncapitalise(value: string): string {
  const [first = ''] = value.split(/\s+/)
  const isSentenceCase = /^[A-Z][a-z]+$/.test(first)
  return isSentenceCase ? value.charAt(0).toLowerCase() + value.slice(1) : value
}

/** Splits a block the user wrote as a list into its items. */
function listItems(value: string | null | undefined, max: number): string[] {
  const text = value?.trim()
  if (!text) return []

  return text
    .split(/\r?\n|;|,(?=\s*[a-z])/i)
    .map((line) =>
      line
        // Strip the bullet or number a user naturally types.
        .replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '')
        .replace(/[?.!]+$/, '')
        .trim()
    )
    .filter((line) => line.length > 2 && line.length <= 120)
    .slice(0, max)
}

/** A list item said out loud mid-sentence. */
function spokenItems(value: string | null | undefined, max: number): string[] {
  return listItems(value, max).map(uncapitalise)
}

/** A line the agent says whole, so it keeps its own punctuation. */
function sentence(value: string): string {
  return /[.!?]$/.test(value) ? value : `${value}.`
}

/**
 * The agent's greeting, when the script starts with one.
 *
 * Only the first line is used, and only if it reads like something said out
 * loud rather than a stage direction ("Opening:", "Step 1"). Splicing a heading
 * into the conversation would be worse than the agent's own greeting.
 */
function openingFromScript(script: string | null | undefined): string | null {
  const text = script?.trim()
  if (!text) return null

  const line = text
    .split(/\r?\n/)
    .map((item) => item.trim())
    .find((item) => item.length > 0)

  if (!line) return null
  if (line.length < 8 || line.length > 220) return null
  // A label, a heading, or a bullet is structure, not speech.
  if (/^(?:#|\*|-|\d+[.)])/.test(line)) return null
  if (/^[A-Za-z ]{1,20}:$/.test(line)) return null

  // "Agent: Hi there" — keep what is spoken, drop the speaker label.
  const spoken = line.replace(/^(?:agent|caller|rep|you)\s*:\s*/i, '')
  return spoken.length >= 8 ? spoken : null
}

/**
 * Builds the context for one call.
 *
 * Campaign fields win over agent fields where both say the same kind of thing,
 * because the campaign is the more specific instruction. Where a campaign says
 * nothing, the agent's own configuration still applies.
 */
export function buildCallContext(agent: AgentContext, config: AiCallConfig | null): CallContext {
  // PRODUCT KNOWLEDGE over the agent's general business context.
  const campaignPitch = firstSentence(config?.productDescription, 180)
  const agentPitch = firstSentence(agent.businessContext, 180)

  // CAMPAIGN INSTRUCTIONS over AGENT INSTRUCTIONS.
  const campaignTopics = spokenItems(config?.qualificationQuestions, 3)

  return {
    agent,
    config,
    pitch: campaignPitch ?? agentPitch,
    topics: campaignTopics,
    scriptOpening: openingFromScript(config?.callScript),
    knowledge: config?.knowledge ? sentence(firstSentence(config.knowledge, 160) ?? '') : null,
    objective: config?.callObjective ?? null,
    // Said as whole sentences, so each keeps a full stop of its own.
    mustSay: listItems(config?.mustSay, 2).map(sentence),
    mustNotSay: listItems(config?.mustNotSay, 6),
  }
}

/**
 * True when a line contains something the campaign said not to say.
 *
 * Substring matching, case-insensitive: the user writes a phrase to avoid, not
 * a pattern. Deliberately conservative — a false positive drops one phrasing
 * and another is used, while a false negative puts a forbidden phrase on a
 * call.
 */
export function isForbidden(line: string, mustNotSay: readonly string[]): boolean {
  if (mustNotSay.length === 0) return false
  const haystack = line.toLowerCase()
  return mustNotSay.some((phrase) => haystack.includes(phrase.toLowerCase()))
}

/**
 * The context a calling model would be given, in precedence order.
 *
 * Rendered for the campaign preview so the user can read exactly what their
 * configuration amounts to — and so "what will the AI do?" has an answer that
 * is not a promise.
 */
export function describeCallContext(context: CallContext): { layer: string; lines: string[] }[] {
  const { agent, config } = context

  const sections: { layer: string; lines: string[] }[] = [
    { layer: 'Safety', lines: [...SAFETY_RULES] },
    {
      layer: 'Agent',
      lines: [
        `Speaks as ${agent.name}${agent.companyName ? ` from ${agent.companyName}` : ''}.`,
        ...(agent.purpose ? [agent.purpose] : []),
        ...(agent.instructions ? [agent.instructions] : []),
      ],
    },
  ]

  if (config?.callObjective) {
    sections.push({ layer: 'Campaign objective', lines: [config.callObjective] })
  }

  if (context.topics.length > 0) {
    sections.push({ layer: 'Qualification', lines: [...context.topics] })
  }

  const knowledge = [config?.productName, config?.productDescription, config?.knowledge].filter(
    (value): value is string => Boolean(value)
  )
  if (knowledge.length > 0) sections.push({ layer: 'Product knowledge', lines: knowledge })

  if (context.scriptOpening) {
    sections.push({ layer: 'Call script', lines: [context.scriptOpening] })
  }

  if (context.mustSay.length > 0) sections.push({ layer: 'Must say', lines: [...context.mustSay] })
  if (context.mustNotSay.length > 0) {
    sections.push({ layer: 'Must not say', lines: [...context.mustNotSay] })
  }

  return sections
}
