import type { CallObjective } from '@/domain/ai-config'
import type { SpeechRegister } from '@/lib/speech/speech-types'
import { isForbidden, type CallContext } from './call-context'
import {
  fill,
  GREETINGS,
  phrasebook,
  type Phrasebook,
  type ScenarioScripts,
} from './phrasebook'
import { pickInRange, seedFrom, type Scenario } from './scenarios'

/**
 * Builds the conversation a demo call would have had.
 *
 * The dialogue is assembled from the agent's own configuration — its name, the
 * company it represents, its stated purpose and its business context — so two
 * differently configured agents produce recognisably different calls. An agent
 * selling apartments talks about apartments; one booking service visits talks
 * about service visits. Nothing is invented about the business beyond what the
 * user typed into the agent.
 *
 * When the call belongs to a configured campaign, a `CallContext` carries the
 * campaign's product, script, questions and constraints, and those take
 * precedence over the agent's own — see `call-context.ts` for the ordering.
 * Without one, the agent's configuration alone drives the call exactly as
 * before.
 *
 * The language the call is held in is a parameter of this one generator rather
 * than something applied afterwards. A transcript shown in English and voiced
 * from a separate Hindi script would be two sources of truth; here the words
 * that are displayed are the words that are spoken, in whichever language was
 * asked for. The wording lives in `phrasebook.ts`; the structure, the seeding
 * and the facts a call settles on are identical in every language.
 *
 * Deterministic throughout: the same lead, agent, configuration and language
 * always produce the same transcript.
 */

export interface AgentContext {
  name: string
  companyName: string | null
  purpose: string | null
  instructions: string | null
  businessContext: string | null
}

export interface LeadContext {
  name: string | null
  company: string | null
}

/** First name only, which is how an agent would actually address someone. */
function firstName(lead: LeadContext, book: Phrasebook): string {
  const name = lead.name?.trim()
  if (!name) return book.someone
  return name.split(/\s+/)[0] ?? book.someone
}

function company(agent: AgentContext, book: Phrasebook): string {
  return agent.companyName?.trim() || book.ourTeam
}

/**
 * The business context as one clause the agent can say out loud. Users write
 * it as a note to the agent ("We sell 2BHK and 3BHK apartments in
 * Gachibowli"), which already reads as speech; it is only trimmed and
 * length-capped here.
 *
 * It is never translated. These are the user's own words about their own
 * business, and a machine rewriting a product description into another
 * language is how a demo ends up promising something the business does not
 * sell. In a Hindi or Hinglish call it stays as written — which is also how
 * these calls are really held, with the product named in English.
 */
function offer(agent: AgentContext): string | null {
  const context = agent.businessContext?.trim()
  if (!context) return null
  const firstSentence = context.split(/(?<=[.!?])\s/)[0] ?? context
  return firstSentence.length > 180 ? `${firstSentence.slice(0, 177)}…` : firstSentence
}

function line(speaker: 'Agent' | 'Lead', text: string): string {
  return `${speaker}: ${text}`
}

/**
 * Picks one of several phrasings, deterministically per lead.
 *
 * Without this every qualified call reads identically apart from the name,
 * which is obvious the moment two calls are opened side by side and undercuts
 * the thing the transcript is meant to show. The choice is still a pure
 * function of the lead, so a demo stays repeatable.
 *
 * The seed deliberately does not include the language. The same lead picks the
 * same phrasing slot in every language, so switching language shows the same
 * call in other words rather than a different call.
 */
function variant<T>(leadId: string, slot: string, options: readonly T[]): T {
  return options[seedFrom(`${leadId}:${slot}`) % options.length]!
}

/**
 * Picks a phrasing the campaign has not forbidden.
 *
 * Rotation starts at the same deterministic index as `variant`, so with no
 * constraints the wording is identical to before. When every option is
 * forbidden the first is still returned — the alternative is a call with a
 * hole in it, and the constraint is a preference about wording, not a reason
 * to break the conversation.
 */
function allowed(leadId: string, slot: string, options: readonly string[], forbidden: readonly string[]): string {
  const start = seedFrom(`${leadId}:${slot}`) % options.length
  for (let step = 0; step < options.length; step += 1) {
    const candidate = options[(start + step) % options.length]!
    if (!isForbidden(candidate, forbidden)) return candidate
  }
  return options[start]!
}

/**
 * The things the agent was told to ask about, as the user wrote them.
 *
 * Instructions arrive as an imperative — "Ask about location, budget and
 * configuration" — so the leading verb is dropped and the list is kept. Only
 * the user's own words are used: nothing is inferred about what "budget" might
 * mean, and no figure is invented to answer with, because a number that looks
 * like a real answer is the one thing a demo must not put into a lead's mouth.
 *
 * An instruction that is not an ask at all ("Be polite", "Keep it short")
 * yields nothing. Splicing that into a question produces "can I check a couple
 * of things — be polite?", which is worse than not asking.
 */
const ASK_VERB =
  /^(?:please\s+)?(?:ask|find out|check|confirm|enquire about|inquire about|qualify(?:\s+\w+)?\s+(?:on|about)|establish|determine)\b[\s:]*(?:them\s+)?(?:about|for|on|if|whether)?\s*/i

function topics(agent: AgentContext): string[] {
  const text = agent.instructions?.trim()
  if (!text) return []

  const firstSentence = text.split(/(?<=[.!?])\s/)[0] ?? text
  if (!ASK_VERB.test(firstSentence)) return []

  return firstSentence
    .replace(ASK_VERB, '')
    .split(/,|\band\b|\bthen\b|;/i)
    .map((part) =>
      part
        .replace(/[.!?]+$/, '')
        // "their fleet size" reads as third person once the agent says it out
        // loud; the agent is talking to the lead, not about them.
        .replace(/^(?:the|a|an|their|his|her|its|your|our)\s+/i, '')
        .trim()
        .toLowerCase()
    )
    .filter((part) => part.length > 2 && part.length <= 60)
    .slice(0, 3)
}

/** Reads a list the way a person would say it: "a, b and c". */
function spokenList(parts: readonly string[], join: string): string {
  if (parts.length <= 1) return parts[0] ?? ''
  return `${parts.slice(0, -1).join(', ')} ${join} ${parts[parts.length - 1]}`
}

/**
 * The turns where the agent does what it was told to do.
 *
 * Without this an agent's instructions never reach the conversation, so two
 * agents configured to ask completely different things hold an identical call
 * — which is the first thing anyone evaluating the product would try.
 *
 * Starts on the lead answering the pitch and ends on the agent, because the
 * scenario closings all open with a lead line. Getting that wrong stacks two
 * speakers' turns on top of each other and the transcript stops reading as a
 * conversation.
 */
function qualifying(
  agent: AgentContext,
  leadId: string,
  context: CallContext | null,
  book: Phrasebook
): string[] {
  // CAMPAIGN INSTRUCTIONS over AGENT INSTRUCTIONS: a campaign that lists what
  // to ask replaces the agent's general instruction to ask something else.
  const asked = context && context.topics.length > 0 ? context.topics : topics(agent)
  const forbidden = context?.mustNotSay ?? []

  // Anything the campaign requires be said, plus one fact from its knowledge
  // if it supplied any. Knowledge is offered, not recited: only the first fact
  // is used, so a long knowledge base does not become a monologue.
  const obligations = [
    ...(context?.mustSay ?? []),
    ...(context?.knowledge ? [context.knowledge] : []),
  ]

  if (asked.length === 0) {
    return obligations.length > 0
      ? [
          line('Lead', variant(leadId, 'pitch-yes', book.pitchYes)),
          line('Agent', obligations.join(' ')),
        ]
      : []
  }

  const topicList = spokenList(asked, book.listJoin)

  return [
    line('Lead', variant(leadId, 'pitch-yes', book.pitchYes)),
    line(
      'Agent',
      allowed(
        leadId,
        'qualify',
        book.qualify.map((template) => fill(template, { topics: topicList })),
        forbidden
      )
    ),
    line('Lead', variant(leadId, 'qualify-answer', book.qualifyAnswer)),
    line('Agent', [variant(leadId, 'qualify-ack', book.qualifyAck), ...obligations].join(' ')),
  ]
}

/**
 * Scenarios where the lead interrupts before any qualifying can happen.
 *
 * An objection lands on the pitch, not on the third qualifying question — and a
 * prospect who has just agreed that the questions are reasonable does not then
 * say "we already have an agency". The dealt scenarios are deliberately not in
 * this set: their shape is the one that shipped, and changing it would change
 * every campaign transcript already on screen.
 */
const INTERRUPTS: ReadonlySet<Scenario['key']> = new Set([
  'HAS_AGENCY',
  'SEND_DETAILS',
  'TOO_EXPENSIVE',
])

/** Opening turns, shared by every answered scenario. */
function opening(
  agent: AgentContext,
  lead: LeadContext,
  leadId: string,
  context: CallContext | null,
  book: Phrasebook,
  register: SpeechRegister,
  qualify: boolean
): string[] {
  const forbidden = context?.mustNotSay ?? []

  // The campaign's product description outranks the agent's business context;
  // with no campaign the agent's own context is still what it offers.
  const pitch = context ? context.pitch : offer(agent)

  const greetings = GREETINGS[register]
  const greetOptions = book.greet.map((template, index) =>
    fill(template, {
      greeting: greetings[index] ?? greetings[0] ?? '',
      name: firstName(lead, book),
      agent: agent.name,
      company: company(agent, book),
      reason: book.reason,
    })
  )

  // A script's own greeting is the user's words, so it wins over ours. It is
  // still introduced by the agent, because a script that forgets to say who is
  // calling would otherwise produce a call that never identifies itself.
  const greet = context?.scriptOpening
    ? `${context.scriptOpening}`
    : allowed(leadId, 'greet', greetOptions, forbidden)

  const ack = variant(leadId, 'ack', book.ack)
  const ask = allowed(leadId, 'ask', book.ask, forbidden)

  return [
    line('Agent', greet),
    line('Lead', ack),
    ...(pitch ? [line('Agent', `${pitch} ${ask}`)] : []),
    ...(qualify ? qualifying(agent, leadId, context, book) : []),
  ]
}

/**
 * The details a call settled on, for whoever has to summarise it.
 *
 * The transcript picks a different visit slot, callback day or reason for
 * declining per lead, so anything that describes the call afterwards has to
 * read those choices rather than assume them. Without this the summary says
 * "Saturday afternoon" under a transcript that agreed Wednesday evening —
 * a contradiction visible on the call detail page.
 *
 * Every value here is English whatever language the call was held in. These
 * are facts about the call rather than part of it, and they are read by the
 * summary, the next action and the follow-up message, which a business reads
 * in one language however many languages it calls in.
 */
export interface CallFacts {
  /** Visit slot agreed, e.g. "Wednesday evening". Interested calls only. */
  agreedSlot?: string
  /** Day the lead asked to be rung back. Follow-up calls only. */
  callbackDay?: string
  /** Why the lead declined, as a clause: "has gone with another provider". */
  declineReason?: string
  /**
   * What the campaign's objective implies should happen next, when the call
   * ended without agreeing a slot. Without it a qualification call would be
   * summarised as though a visit had been booked.
   */
  objectiveNextAction?: string
}

interface ClosingResult {
  lines: string[]
  facts: CallFacts
}

/**
 * What an interested call means when the objective is not to book a slot.
 *
 * The wording the agent uses lives in the phrasebook; only the next action is
 * here, because it is written for the business rather than said on the call.
 */
const NON_BOOKING_NEXT_ACTION: Record<
  Exclude<CallObjective, 'BOOK_APPOINTMENT' | 'BOOK_DEMO'>,
  string
> = {
  QUALIFY: 'Hand this lead to a salesperson with the answers captured on the call.',
  COLLECT_REQUIREMENTS: 'Send the written summary and prepare a quote from the requirements captured.',
  GENERATE_INTEREST: 'Send the information pack and check back once they have read it.',
  FOLLOW_UP: 'Follow up once they have had time to consider it.',
}

type Closing = (
  agent: AgentContext,
  lead: LeadContext,
  leadId: string,
  context: CallContext | null,
  book: Phrasebook
) => ClosingResult

const CLOSINGS: Record<Scenario['key'], Closing> = {
  INTERESTED: (_agent, lead, leadId, context, book) => {
    const keen = line('Lead', variant(leadId, 'keen', book.keen))
    const thanks = line('Lead', variant(leadId, 'thanks', book.thanks))

    // A campaign that is only qualifying should not book a visit, and one
    // collecting requirements should not either. Only the slot-booking
    // objectives produce an `agreedSlot`, so the summary can never claim a
    // time the call never agreed.
    const objective = context?.objective ?? 'BOOK_APPOINTMENT'
    const booking = objective === 'BOOK_APPOINTMENT' || objective === 'BOOK_DEMO'

    if (!booking) {
      const close = book.nonBooking[objective]
      return {
        facts: { objectiveNextAction: NON_BOOKING_NEXT_ACTION[objective] },
        lines: [
          keen,
          line('Agent', close.agent),
          line('Lead', close.lead),
          line(
            'Agent',
            `${fill(book.wrapUpPrefix, { name: firstName(lead, book) })} ${close.wrapUp}`
          ),
        ],
      }
    }

    const slot = variant(leadId, 'slot', book.slots)

    const what = objective === 'BOOK_DEMO' ? book.whatDemo : book.whatVisit
    const send = objective === 'BOOK_DEMO' ? book.sendDemo : book.sendVisit

    return {
      facts: { agreedSlot: slot[2] },
      lines: [
        keen,
        line('Agent', fill(book.bookingOffer, { what })),
        line('Lead', slot[0]),
        line(
          'Agent',
          fill(book.slotConfirm, { slot: slot[1], name: firstName(lead, book), send })
        ),
        thanks,
      ],
    }
  },
  FOLLOW_UP: (_agent, lead, leadId, _context, book) => {
    const day = variant(leadId, 'day', book.days)
    return {
      facts: { callbackDay: day[1] },
      lines: [
        line('Lead', variant(leadId, 'busy', book.busy)),
        line('Agent', book.followUpOffer),
        line('Lead', fill(book.followUpAsk, { day: day[0] })),
        line(
          'Agent',
          fill(book.followUpConfirm, { name: firstName(lead, book), day: day[0] })
        ),
      ],
    }
  },
  NOT_INTERESTED: (_agent, lead, leadId, _context, book) => {
    const declined = variant(leadId, 'no', book.declines)

    return {
      facts: { declineReason: declined[1] },
      lines: [
        line('Lead', declined[0]),
        line('Agent', book.declineAck),
        line('Lead', book.declineYes),
        line('Agent', fill(book.declineDone, { name: firstName(lead, book) })),
      ],
    }
  },
  NO_ANSWER: () => ({ lines: [], facts: {} }),

  // The hand-picked scenarios. Their turns are written out in the phrasebook
  // rather than assembled from variants, so a rehearsed demonstration says the
  // same thing every time it is shown.
  DISCOVERY: scripted('DISCOVERY'),
  HAS_AGENCY: scripted('HAS_AGENCY'),
  SEND_DETAILS: scripted('SEND_DETAILS'),
  TOO_EXPENSIVE: scripted('TOO_EXPENSIVE'),
}

/**
 * What a chosen scenario leaves the business to do.
 *
 * English in every language, like every other fact: it is written for whoever
 * reads the call afterwards, not said on the call.
 */
const SCRIPTED_NEXT_ACTION: Record<keyof ScenarioScripts, string> = {
  DISCOVERY: 'Send the short plan discussed on the call and follow up on it.',
  HAS_AGENCY:
    'Send a written comparison against their current agency, then follow up without pressing.',
  SEND_DETAILS: 'Send costs and timelines on WhatsApp, then check back once they have read it.',
  TOO_EXPENSIVE:
    'Build the value case from their own numbers and send it. Do not offer a discount.',
}

/** Renders one of the written-out scenarios. */
function scripted(key: keyof ScenarioScripts): Closing {
  return (_agent, lead, _leadId, _context, book) => ({
    facts: { objectiveNextAction: SCRIPTED_NEXT_ACTION[key] },
    lines: book.scenarios[key].map(([speaker, template]) =>
      line(speaker, fill(template, { name: firstName(lead, book) }))
    ),
  })
}

/**
 * Renders the transcript for a scenario, together with the details it settled
 * on. `text` is null when the call was never answered — an unanswered call has
 * no conversation, and inventing one would be the single most misleading thing
 * this module could do.
 */
export interface TranscriptResult {
  text: string | null
  facts: CallFacts
}

export function buildTranscript(
  scenario: Scenario,
  agent: AgentContext,
  lead: LeadContext,
  leadId: string,
  context: CallContext | null = null,
  register: SpeechRegister = 'ENGLISH'
): TranscriptResult {
  if (!scenario.answered) return { text: null, facts: {} }
  const book = phrasebook(register)
  const closing = CLOSINGS[scenario.key](agent, lead, leadId, context, book)
  const qualify = !INTERRUPTS.has(scenario.key)
  return {
    text: [
      ...opening(agent, lead, leadId, context, book, register, qualify),
      ...closing.lines,
    ].join('\n'),
    facts: closing.facts,
  }
}

/** Deterministic call length for a scenario. */
export function buildDuration(scenario: Scenario, leadId: string): number {
  if (!scenario.answered) return 0
  return pickInRange(seedFrom(`${leadId}:duration`), scenario.durationRange)
}
