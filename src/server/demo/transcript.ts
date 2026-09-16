import type { CallObjective } from '@/domain/ai-config'
import { isForbidden, type CallContext } from './call-context'
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
 * Deterministic throughout: the same lead, agent and configuration always
 * produce the same transcript.
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
function firstName(lead: LeadContext): string {
  const name = lead.name?.trim()
  if (!name) return 'there'
  return name.split(/\s+/)[0] ?? 'there'
}

function company(agent: AgentContext): string {
  return agent.companyName?.trim() || 'our team'
}

/**
 * The business context as one clause the agent can say out loud. Users write
 * it as a note to the agent ("We sell 2BHK and 3BHK apartments in
 * Gachibowli"), which already reads as speech; it is only trimmed and
 * length-capped here.
 */
function offer(agent: AgentContext): string | null {
  const context = agent.businessContext?.trim()
  if (!context) return null
  const firstSentence = context.split(/(?<=[.!?])\s/)[0] ?? context
  return firstSentence.length > 180 ? `${firstSentence.slice(0, 177)}…` : firstSentence
}

/**
 * The agent's opening reason for calling.
 *
 * Deliberately does not quote `purpose`. Users write it as a goal in the
 * imperative — "Qualify buyers for site visits" — which cannot be spliced into
 * speech without producing "I'm calling about qualify buyers for site visits".
 * The purpose drives the agent's behaviour and shows up in the call summary;
 * what the agent says out loud is the business context, one line below.
 */
function reason(): string {
  return 'I am following up on your enquiry'
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
function spokenList(parts: readonly string[]): string {
  if (parts.length <= 1) return parts[0] ?? ''
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
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
function qualifying(agent: AgentContext, leadId: string, context: CallContext | null): string[] {
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
          line('Lead', variant(leadId, 'pitch-yes', [
            'Yes, that is the sort of thing.',
            'It could be, yes.',
            'Broadly, yes.',
          ])),
          line('Agent', obligations.join(' ')),
        ]
      : []
  }

  return [
    line('Lead', variant(leadId, 'pitch-yes', [
      'Yes, that is the sort of thing.',
      'It could be, yes.',
      'Broadly, yes.',
    ])),
    line('Agent', allowed(leadId, 'qualify', [
      `Before we go further, can I check a couple of things — ${spokenList(asked)}?`,
      `So I point you at the right thing, could you tell me about ${spokenList(asked)}?`,
      `It would help to know about ${spokenList(asked)} — can we run through those?`,
    ], forbidden)),
    line('Lead', variant(leadId, 'qualify-answer', [
      'Yes, of course. I have a fair idea of what I am after on all of that.',
      'Sure. I know roughly what I want there.',
      'Happy to — I have thought about most of that already.',
    ])),
    line('Agent', [
      variant(leadId, 'qualify-ack', [
        'That is helpful, thank you.',
        'Understood — that gives me what I need.',
        'Good, that narrows it down.',
      ]),
      ...obligations,
    ].join(' ')),
  ]
}

/** Opening turns, shared by every answered scenario. */
function opening(
  agent: AgentContext,
  lead: LeadContext,
  leadId: string,
  context: CallContext | null
): string[] {
  const forbidden = context?.mustNotSay ?? []

  // The campaign's product description outranks the agent's business context;
  // with no campaign the agent's own context is still what it offers.
  const pitch = context ? context.pitch : offer(agent)

  // A script's own greeting is the user's words, so it wins over ours. It is
  // still introduced by the agent, because a script that forgets to say who is
  // calling would otherwise produce a call that never identifies itself.
  const greet = context?.scriptOpening
    ? `${context.scriptOpening}`
    : allowed(leadId, 'greet', [
        `Hi ${firstName(lead)}, this is ${agent.name} from ${company(agent)}. ${reason()} — is now an alright time?`,
        `Hello ${firstName(lead)}, ${agent.name} calling from ${company(agent)}. ${reason()} — have you got a minute?`,
        `Hi ${firstName(lead)}, it's ${agent.name} at ${company(agent)}. ${reason()} — is this a good moment?`,
      ], forbidden)

  const ack = variant(leadId, 'ack', ['Yes, go ahead.', 'Sure, now is fine.', 'Yes, I have a couple of minutes.'])
  const ask = allowed(leadId, 'ask', [
    'Does that sound like what you were looking for?',
    'Is that the sort of thing you had in mind?',
    'Does that line up with what you are after?',
  ], forbidden)

  return [
    line('Agent', greet),
    line('Lead', ack),
    ...(pitch ? [line('Agent', `${pitch} ${ask}`)] : []),
    ...qualifying(agent, leadId, context),
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
 * How an interested call ends when the objective is not to book a slot.
 *
 * Each ends on the agent so the turn-taking still alternates, and each carries
 * the next action its objective implies, so nothing downstream has to guess
 * what "interested" meant for this campaign.
 */
const NON_BOOKING_CLOSE: Record<
  Exclude<CallObjective, 'BOOK_APPOINTMENT' | 'BOOK_DEMO'>,
  { agent: string; lead: string; wrapUp: string; nextAction: string }
> = {
  QUALIFY: {
    agent: 'I have what I need for now. Would it help if one of our team called you with the specifics?',
    lead: 'Yes, that would be useful.',
    wrapUp: 'I will pass this to the team and they will be in touch.',
    nextAction: 'Hand this lead to a salesperson with the answers captured on the call.',
  },
  COLLECT_REQUIREMENTS: {
    agent: 'Let me make sure I have your requirements down correctly before I pass this on.',
    lead: 'Yes, that is all of it.',
    wrapUp: 'I have noted that down and will send a written summary across.',
    nextAction: 'Send the written summary and prepare a quote from the requirements captured.',
  },
  GENERATE_INTEREST: {
    agent: 'I will not take more of your time — may I send you the details to look over?',
    lead: 'Yes, send them across.',
    wrapUp: 'I will send those over now.',
    nextAction: 'Send the information pack and check back once they have read it.',
  },
  FOLLOW_UP: {
    agent: 'Good — shall I pick this back up with you once you have had a think?',
    lead: 'Yes, that works.',
    wrapUp: 'I will follow up with you shortly.',
    nextAction: 'Follow up once they have had time to consider it.',
  },
}

type Closing = (
  agent: AgentContext,
  lead: LeadContext,
  leadId: string,
  context: CallContext | null
) => ClosingResult

const CLOSINGS: Record<Scenario['key'], Closing> = {
  INTERESTED: (_agent, lead, leadId, context) => {
    const keen = line('Lead', variant(leadId, 'keen', [
      "Yes, that's close to what I had in mind. What would the next step be?",
      'That does sound right. How do we take it forward?',
      "Yes, I'd like to see it. What happens next?",
    ]))
    const thanks = line('Lead', variant(leadId, 'thanks', [
      'Perfect, thank you.',
      'Great, thanks.',
      'That works, thanks.',
    ]))

    // A campaign that is only qualifying should not book a visit, and one
    // collecting requirements should not either. Only the slot-booking
    // objectives produce an `agreedSlot`, so the summary can never claim a
    // time the call never agreed.
    const objective = context?.objective ?? 'BOOK_APPOINTMENT'
    const booking = objective === 'BOOK_APPOINTMENT' || objective === 'BOOK_DEMO'

    if (!booking) {
      const close = NON_BOOKING_CLOSE[objective]
      return {
        facts: { objectiveNextAction: close.nextAction },
        lines: [
          keen,
          line('Agent', close.agent),
          line('Lead', close.lead),
          line('Agent', `Thanks ${firstName(lead)}, ${close.wrapUp}`),
        ],
      }
    }

    const slot = variant(leadId, 'slot', [
      ['Weekend works. Saturday afternoon if possible.', 'Saturday afternoon'],
      ['Weekday evening is easier for me — Wednesday after six?', 'Wednesday evening'],
      ['Sunday morning would suit me best.', 'Sunday morning'],
    ] as const)

    const what = objective === 'BOOK_DEMO' ? 'a demo' : 'a visit'
    const send =
      objective === 'BOOK_DEMO'
        ? "I'll send the joining link across on WhatsApp."
        : "I'll send the details across on WhatsApp so you have the address and my number."

    return {
      facts: { agreedSlot: slot[1] },
      lines: [
        keen,
        line('Agent', `I can set up ${what} this week. Would a weekday evening or the weekend suit you better?`),
        line('Lead', slot[0]),
        line('Agent', `${slot[1]} it is, ${firstName(lead)}. ${send}`),
        thanks,
      ],
    }
  },
  FOLLOW_UP: (_agent, lead, leadId) => {
    const day = variant(leadId, 'day', ['Thursday', 'Monday', 'Friday'])
    return {
      facts: { callbackDay: day },
      lines: [
        line('Lead', variant(leadId, 'busy', [
          "It's interesting, but I'm in the middle of something right now.",
          'Sounds useful, but I am driving at the moment.',
          'I am interested, just not free to talk right now.',
        ])),
        line('Agent', 'Of course — I will not keep you. Would it help if I sent the details across and called back later in the week?'),
        line('Lead', `Yes, send them over and call me ${day}.`),
        line('Agent', `Will do, ${firstName(lead)}. I'll message you the details and ring you on ${day}.`),
      ],
    }
  },
  NOT_INTERESTED: (_agent, lead, leadId) => {
    const declined = variant(leadId, 'no', [
      ["Thanks, but I've already sorted this out elsewhere.", 'has already arranged this elsewhere'],
      ['Not for me, I am afraid — I decided against it.', 'has decided against it'],
      ['No thank you, we went with someone else.', 'has gone with another provider'],
    ] as const)

    return {
      facts: { declineReason: declined[1] },
      lines: [
        line('Lead', declined[0]),
        line('Agent', 'Understood, and thank you for telling me. Would you like me to take you off this list?'),
        line('Lead', 'Yes please.'),
        line('Agent', `Done — you won't hear from us again. Have a good day, ${firstName(lead)}.`),
      ],
    }
  },
  NO_ANSWER: () => ({ lines: [], facts: {} }),
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
  context: CallContext | null = null
): TranscriptResult {
  if (!scenario.answered) return { text: null, facts: {} }
  const closing = CLOSINGS[scenario.key](agent, lead, leadId, context)
  return {
    text: [...opening(agent, lead, leadId, context), ...closing.lines].join('\n'),
    facts: closing.facts,
  }
}

/** Deterministic call length for a scenario. */
export function buildDuration(scenario: Scenario, leadId: string): number {
  if (!scenario.answered) return 0
  return pickInRange(seedFrom(`${leadId}:duration`), scenario.durationRange)
}
