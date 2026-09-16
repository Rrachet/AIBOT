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
 * Deterministic throughout: the same lead and agent always produce the same
 * transcript.
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

/** Opening turns, shared by every answered scenario. */
function opening(agent: AgentContext, lead: LeadContext, leadId: string): string[] {
  const pitch = offer(agent)
  const greet = variant(leadId, 'greet', [
    `Hi ${firstName(lead)}, this is ${agent.name} from ${company(agent)}. ${reason()} — is now an alright time?`,
    `Hello ${firstName(lead)}, ${agent.name} calling from ${company(agent)}. ${reason()} — have you got a minute?`,
    `Hi ${firstName(lead)}, it's ${agent.name} at ${company(agent)}. ${reason()} — is this a good moment?`,
  ])
  const ack = variant(leadId, 'ack', ['Yes, go ahead.', 'Sure, now is fine.', 'Yes, I have a couple of minutes.'])
  const ask = variant(leadId, 'ask', [
    'Does that sound like what you were looking for?',
    'Is that the sort of thing you had in mind?',
    'Does that line up with what you are after?',
  ])

  return [
    line('Agent', greet),
    line('Lead', ack),
    ...(pitch ? [line('Agent', `${pitch} ${ask}`)] : []),
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
}

interface ClosingResult {
  lines: string[]
  facts: CallFacts
}

type Closing = (agent: AgentContext, lead: LeadContext, leadId: string) => ClosingResult

const CLOSINGS: Record<Scenario['key'], Closing> = {
  INTERESTED: (_agent, lead, leadId) => {
    const slot = variant(leadId, 'slot', [
      ['Weekend works. Saturday afternoon if possible.', 'Saturday afternoon'],
      ['Weekday evening is easier for me — Wednesday after six?', 'Wednesday evening'],
      ['Sunday morning would suit me best.', 'Sunday morning'],
    ] as const)

    return {
      facts: { agreedSlot: slot[1] },
      lines: [
        line('Lead', variant(leadId, 'keen', [
          "Yes, that's close to what I had in mind. What would the next step be?",
          'That does sound right. How do we take it forward?',
          "Yes, I'd like to see it. What happens next?",
        ])),
        line('Agent', 'I can set up a visit this week. Would a weekday evening or the weekend suit you better?'),
        line('Lead', slot[0]),
        line('Agent', `${slot[1]} it is, ${firstName(lead)}. I'll send the details across on WhatsApp so you have the address and my number.`),
        line('Lead', variant(leadId, 'thanks', ['Perfect, thank you.', 'Great, thanks.', 'That works, thanks.'])),
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
  leadId: string
): TranscriptResult {
  if (!scenario.answered) return { text: null, facts: {} }
  const closing = CLOSINGS[scenario.key](agent, lead, leadId)
  return {
    text: [...opening(agent, lead, leadId), ...closing.lines].join('\n'),
    facts: closing.facts,
  }
}

/** Deterministic call length for a scenario. */
export function buildDuration(scenario: Scenario, leadId: string): number {
  if (!scenario.answered) return 0
  return pickInRange(seedFrom(`${leadId}:duration`), scenario.durationRange)
}
