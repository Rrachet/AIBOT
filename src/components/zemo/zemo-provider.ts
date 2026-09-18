import { PLANS, PRICING_HONESTY, FAQ } from '@/content/plans';
import { pageContextFor, type ZemoContext, type ZemoPageContext } from './zemo-context';
import {
  askAbout,
  goTo,
  takeTour,
  type ZemoAction,
  type ZemoInput,
  type ZemoIntent,
  type ZemoIntentKind,
} from './zemo-intent';
import {
  aboutVoicePreview,
  voiceAnswerFor,
  voiceRecallFor,
  voiceSuggestionsFor,
} from './zemo-voice';

/**
 * Zemo's brain, behind an interface.
 *
 * The shipped implementation is `DemoZemoProvider`: it matches intent against
 * the structured page context rather than calling a model, because this build
 * pays for no AI provider. Swapping in a real LLM later means writing one more
 * class against `ZemoProvider` and changing where it is constructed — nothing
 * in the widget, panel or context model has to move.
 *
 * The work happens in two halves, deliberately separable:
 *
 *   classify(input) -> ZemoIntent     what was meant
 *   answer(intent)  -> ZemoReply      what to say and offer about it
 *
 * A model would replace the first half and leave the second alone, which is
 * the point: the set of things Zemo can offer to do stays a closed, typed,
 * reviewable list no matter what decides which one to reach for.
 *
 * Three rules bind every implementation:
 *   - Zemo answers about AIBOT only from the structured context it is given.
 *     If the answer is not in there, it says so.
 *   - Zemo never reports an action as done that it has not done.
 *   - Zemo offers actions; the person takes them. Knowing a route exists is
 *     not permission to open it, and the server decides that either way.
 */

export interface ZemoMessage {
  id: string;
  role: 'zemo' | 'user';
  text: string;
  /** Rendered as chips under the message. Each is a question, not a command. */
  suggestions?: string[];
  /**
   * The one thing this message offers to do — a button the person presses.
   * Validated against the action allow-list before it is rendered.
   */
  action?: ZemoAction;
  /** Starts or advances the demo-request flow. */
  form?: 'demo-request';
}

export interface ZemoReply {
  messages: ZemoMessage[];
}

export interface ZemoProvider {
  /** The line Zemo opens with on a given page. */
  greeting(context: ZemoContext): ZemoMessage;
  /** What an input meant. Exposed so it can be tested without the answers. */
  classify(input: ZemoInput): ZemoIntent;
  respond(input: ZemoInput, history?: ZemoMessage[]): Promise<ZemoReply>;
}

let counter = 0;
function nextId(): string {
  counter += 1;
  return `z${counter}`;
}

export function zemoMessage(text: string, extra: Partial<ZemoMessage> = {}): ZemoMessage {
  return { id: nextId(), role: 'zemo', text, ...extra };
}

export function userMessage(text: string): ZemoMessage {
  return { id: nextId(), role: 'user', text };
}

/** Normalised haystack for matching. */
function norm(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Whole-word (or whole-phrase) match.
 *
 * Substring matching quietly ruins this: "Salesforce" contains "sales", so
 * asking whether AIBOT integrates with Salesforce was answered by offering to
 * book a demo. Both haystack and needle are already normalised to
 * space-separated lowercase words, so padding with spaces is enough.
 */
function hasAny(haystack: string, needles: string[]): boolean {
  const padded = ` ${haystack} `;
  return needles.some((needle) => padded.includes(` ${needle} `));
}

/** Routes Zemo will offer to open, by the words people use for them. */
const DESTINATIONS: { href: string; label: string; words: string[] }[] = [
  { href: '/dashboard', label: 'the dashboard', words: ['dashboard', 'overview', 'home'] },
  { href: '/leads', label: 'leads', words: ['lead', 'leads', 'contacts', 'list'] },
  { href: '/agents', label: 'agents', words: ['agent', 'agents'] },
  { href: '/campaigns', label: 'campaigns', words: ['campaign', 'campaigns'] },
  { href: '/calls', label: 'calls', words: ['call', 'calls', 'transcript', 'conversation'] },
  { href: '/follow-ups', label: 'follow-ups', words: ['follow up', 'follow ups', 'followup', 'queue'] },
  { href: '/whatsapp', label: 'WhatsApp', words: ['whatsapp', 'message', 'messages'] },
  { href: '/analytics', label: 'analytics', words: ['analytics', 'report', 'numbers', 'stats'] },
  { href: '/settings', label: 'settings', words: ['settings', 'workspace name'] },
  { href: '/pricing', label: 'pricing', words: ['pricing', 'plans', 'price'] },
];

/**
 * Answers from the page context, the plan data and the FAQ — nothing else.
 *
 * Deliberately not a chat model: it recognises a handful of intents and says
 * plainly when a question is outside them. A wrong-but-fluent answer about
 * what AIBOT can do is worse than "I do not know", because someone will buy
 * on it.
 */
export class DemoZemoProvider implements ZemoProvider {
  greeting(context: ZemoContext): ZemoMessage {
    const page = pageContextFor(context.route);

    // A conversation outranks the page behind it. Somebody who has just played
    // one to a prospect is not wondering what campaigns are for — and that
    // holds for a few seconds after they close it, too.
    const voice = context.voice ? voiceAnswerFor(context.voice) : null;
    if (voice) {
      return zemoMessage(voice, { suggestions: this.suggestionsFor(context) });
    }
    if (context.heard) {
      return zemoMessage(voiceRecallFor(context.heard), {
        suggestions: this.suggestionsFor(context),
      });
    }

    const opening =
      context.surface === 'public'
        ? `Hey. You're on ${page.page}.`
        : `You're on ${page.page}.`;

    return zemoMessage(`${opening} ${page.summary}`, {
      suggestions: this.suggestionsFor(context),
    });
  }

  private suggestionsFor(context: ZemoContext): string[] {
    const page = pageContextFor(context.route);

    const listening = voiceSuggestionsFor(context.voice);
    if (listening) return listening;
    if (context.heard) {
      return ['What was that testing?', 'Is this a real call?', 'What should I do next?'];
    }

    if (context.surface === 'public') {
      return ['Show me around', 'What does AIBOT actually do?', 'Which plan fits me?'];
    }

    const base = ['What is this page for?'];
    if (page.nextAction) base.push('What should I do next?');
    const concept = page.keyConcepts?.[0];
    if (concept) base.push(`What is ${concept}?`);
    else base.push('Show me around');
    return base;
  }

  /**
   * Words in, one intent out.
   *
   * Order is precedence, and every reordering here has a reason written
   * against it. This is the half a language model would replace.
   */
  classify({ text, source, context }: ZemoInput): ZemoIntent {
    const words = norm(text);
    const page = pageContextFor(context.route);
    const of = (kind: ZemoIntentKind, subject?: string, confidence: 'high' | 'low' = 'high') =>
      ({ kind, source, confidence, ...(subject ? { subject } : {}) }) satisfies ZemoIntent;

    // The tour. Checked before navigation, because "show me around" would
    // otherwise be read as a request to open a page.
    if (
      hasAny(words, ['tour', 'show me around', 'walk me through', 'guide me', 'show me the tour']) ||
      /\b(show|walk|take) me (around|through)\b/.test(words)
    ) {
      return of('run-tour');
    }

    // Demo request. Checked early so "I want a demo" never falls through to a
    // glossary match on the word "call".
    if (hasAny(words, ['demo', 'talk to someone', 'contact me', 'sales', 'call me', 'get in touch'])) {
      return of('request-demo');
    }

    // The voice preview, but only while one is actually open. The same words
    // on the analytics page mean something else entirely.
    if (context.voice?.open && aboutVoicePreview(words)) {
      return of('voice-preview', context.voice.scenario ?? undefined);
    }
    // After the dialog is closed the words change: nobody says "the preview",
    // they say "what was that". Both point at the same conversation.
    if (
      context.heard &&
      (aboutVoicePreview(words) ||
        hasAny(words, ['what was that', 'that call', 'that conversation', 'just heard', 'just played']))
    ) {
      return of('voice-preview', context.heard.scenario);
    }

    if (hasAny(words, ['take me', 'go to', 'open', 'show me', 'navigate', 'where is', 'where do i'])) {
      const target = DESTINATIONS.find((destination) => hasAny(words, destination.words));
      if (target) return of('navigate', target.href);
    }

    if (hasAny(words, ['price', 'pricing', 'cost', 'plan', 'how much', 'expensive', 'free'])) {
      const named = PLANS.find((plan) => words.includes(plan.id));
      return of('pricing', named?.id);
    }

    if (hasAny(words, ['real call', 'really call', 'actually call', 'simulated', 'fake', 'dial'])) {
      return of('simulation-honesty');
    }

    if (page.glossary) {
      const term = Object.keys(page.glossary).find((entry) => words.includes(norm(entry)));
      if (term) return of('define-term', term);
    }

    // "What now?" before "what is this?", because somebody asking what to do
    // next has already worked out where they are.
    if (
      hasAny(words, ['next', 'what now', 'now what', 'what do i do', 'what should i do', 'start']) &&
      page.nextAction
    ) {
      return of('next-step');
    }

    if (hasAny(words, ['this page', 'what is this', 'where am i', 'what does this do', 'explain'])) {
      return of('explain-page');
    }

    if (page.commonQuestions?.some((entry) => overlaps(words, norm(entry.q)))) {
      return of('explain-page', 'common-question');
    }

    if (FAQ.some((item) => overlaps(words, norm(item.q)))) {
      return of('explain-page', 'faq');
    }

    if (hasAny(words, ['how do i', 'how to', 'get started', 'first', 'set up', 'setup'])) {
      return of('how-to');
    }

    if (hasAny(words, ['who are you', 'what are you', 'your name', 'zemo'])) {
      return of('about-zemo');
    }

    if (hasAny(words, ['thanks', 'thank you', 'cheers', 'nice', 'cool'])) {
      return of('courtesy');
    }

    return of('unknown', undefined, 'low');
  }

  async respond(input: ZemoInput): Promise<ZemoReply> {
    const intent = this.classify(input);
    return { messages: this.answer(intent, input) };
  }

  /**
   * One intent in, the messages for it out.
   *
   * Every branch ends in something Zemo can support: a sentence from the page
   * model, a plan from the pricing data, or an admission that it does not
   * know. None of them compose an answer out of general knowledge.
   */
  private answer(intent: ZemoIntent, input: ZemoInput): ZemoMessage[] {
    const { context } = input;
    const words = norm(input.text);
    const page = pageContextFor(context.route);

    switch (intent.kind) {
      case 'run-tour':
        return [
          zemoMessage("Come on then. I'll keep it to about a minute.", {
            action: takeTour('Start the tour'),
          }),
        ];

      case 'request-demo':
        return [
          zemoMessage(
            "Happy to set that up. I'll take three things and pass them on — no calendar dance.",
            { form: 'demo-request' }
          ),
        ];

      case 'voice-preview': {
        const answer = context.voice
          ? voiceAnswerFor(context.voice)
          : context.heard
            ? voiceRecallFor(context.heard)
            : null;
        if (answer) return [zemoMessage(answer, { suggestions: this.suggestionsFor(context) })];
        break;
      }

      case 'navigate': {
        const target = DESTINATIONS.find((destination) => destination.href === intent.subject);
        if (!target) break;
        if (target.href === context.route) {
          return [
            zemoMessage(`You're already here. ${page.summary}`, {
              suggestions: this.suggestionsFor(context),
            }),
          ];
        }
        return [
          zemoMessage(`${capitalise(target.label)} it is.`, {
            action: goTo(`Open ${target.label}`, target.href),
          }),
        ];
      }

      case 'pricing':
        return [this.pricingAnswer(words, intent.subject)];

      case 'simulation-honesty': {
        const listening = context.voice?.open
          ? ' The voice you can hear right now is your own browser reading the agent’s side of a generated conversation — a preview, not a call.'
          : context.heard
            ? ' What you just played was your own browser reading the agent’s side of a generated conversation — a preview, not a call.'
            : '';
        return [
          zemoMessage(
            'Straight answer: not yet. Calls and WhatsApp messages are simulated end to end and labelled everywhere they appear — the transcript, outcome and follow-up are real rows in your workspace, but no number is dialled. Live calling needs a telephony provider connected.' +
              listening,
            { suggestions: this.suggestionsFor(context) }
          ),
        ];
      }

      case 'define-term': {
        const definition = intent.subject ? page.glossary?.[intent.subject] : undefined;
        if (definition) {
          return [zemoMessage(definition, { suggestions: this.suggestionsFor(context) })];
        }
        break;
      }

      case 'next-step':
        return [this.nextStep(page, context)];

      case 'explain-page': {
        if (intent.subject === 'common-question') {
          const hit = page.commonQuestions?.find((entry) => overlaps(words, norm(entry.q)));
          if (hit) return [zemoMessage(hit.a, { suggestions: this.suggestionsFor(context) })];
        }
        if (intent.subject === 'faq') {
          const faq = FAQ.find((item) => overlaps(words, norm(item.q)));
          if (faq) return [zemoMessage(faq.a, { suggestions: this.suggestionsFor(context) })];
        }
        return [this.explainPage(page, context)];
      }

      case 'how-to': {
        const answer = this.howTo(words);
        if (answer) return [answer];
        break;
      }

      case 'about-zemo':
        return [
          zemoMessage(
            "I'm Zemo. I know AIBOT well and I'll tell you when I don't know something, which is more than most chat bubbles will offer.",
            { suggestions: this.suggestionsFor(context) }
          ),
        ];

      case 'courtesy':
        return [zemoMessage('Any time.')];

      default:
        break;
    }

    return [
      zemoMessage(
        "That one's outside what I know. I can explain any page you're on, walk you through agents, campaigns, calls, follow-ups or analytics, break down the plans, or get you a demo.",
        { suggestions: this.suggestionsFor(context) }
      ),
    ];
  }

  /**
   * Why, then what, then where it sits, then one thing worth knowing.
   *
   * The order is the whole point. "This page lists your calls" is a caption
   * that teaches nobody anything; leading with the problem the page solves is
   * what makes the rest of it stick.
   */
  private explainPage(page: ZemoPageContext, context: ZemoContext): ZemoMessage {
    const parts: string[] = [];
    if (page.analogy) parts.push(page.analogy);
    parts.push(page.why ?? page.summary);
    if (page.why) parts.push(page.summary);
    if (page.connects?.to) parts.push(page.connects.to);

    return zemoMessage(parts.join(' '), {
      suggestions: this.suggestionsFor(context),
      ...(page.nextAction ? { action: askAbout('What should I do next?') } : {}),
    });
  }

  /**
   * "Right — what now?"
   *
   * One thing to do, one thing worth knowing while doing it, and a way to the
   * page it happens on. Not a checklist: a person who wanted a checklist is
   * reading the page, not asking.
   */
  private nextStep(page: ZemoPageContext, context: ZemoContext): ZemoMessage {
    const tip = page.tips?.[0];
    const text = tip ? `${page.nextAction} ${tip}` : (page.nextAction ?? page.summary);
    const onward = page.suggestedRoutes?.find((route) => route !== context.route);
    const destination = onward
      ? DESTINATIONS.find((entry) => entry.href === onward)
      : undefined;

    return zemoMessage(text, {
      suggestions: this.suggestionsFor(context),
      ...(destination ? { action: goTo(`Open ${destination.label}`, destination.href) } : {}),
    });
  }

  private pricingAnswer(text: string, planId?: string): ZemoMessage {
    const named = PLANS.find((plan) => plan.id === planId);
    if (named) {
      return zemoMessage(
        `${named.name} is ${named.price} ${named.cadence}. ${named.limits
          .map((limit) => `${limit.value.toLowerCase()} ${limit.label.toLowerCase()}`)
          .join(', ')}. Best for ${named.bestFor}. ${PRICING_HONESTY}`,
        { action: goTo('Open pricing', '/pricing') }
      );
    }

    if (hasAny(text, ['which', 'should i', 'fits', 'right for', 'recommend'])) {
      return zemoMessage(
        `Depends on volume, not features — every plan has the whole product. ${PLANS.map(
          (plan) => `${plan.name} (${plan.price}) suits ${plan.bestFor}`
        ).join('. ')}. Start on Starter; it costs nothing while AIBOT is in demo.`,
        { action: goTo('Compare the plans', '/pricing') }
      );
    }

    return zemoMessage(
      `${PLANS.map((plan) => `${plan.name} — ${plan.price} ${plan.cadence}`).join('. ')}. ${PRICING_HONESTY}`,
      { action: goTo('Open pricing', '/pricing') }
    );
  }

  private howTo(text: string): ZemoMessage | null {
    if (hasAny(text, ['agent'])) {
      return zemoMessage(
        'Agents → Create agent. Give it a name, the company it speaks for, a purpose and a manner. Then run a demo call on it and listen — an agent is only as good as its brief, and you will hear the difference immediately.',
        { action: goTo('Open agents', '/agents') }
      );
    }
    if (hasAny(text, ['import', 'csv', 'excel', 'upload lead'])) {
      return zemoMessage(
        'Leads → Import CSV or Excel. Map the columns if AIBOT cannot work them out; it flags duplicates and invalid rows before anything is saved.',
        { action: goTo('Open leads', '/leads') }
      );
    }
    if (hasAny(text, ['campaign', 'call'])) {
      return zemoMessage(
        'Four steps: attach leads, pick the agent, fill in the product, objective, script and questions, then run a test call. The readiness panel tells you what is still missing before anyone is contacted.',
        { action: goTo('Open campaigns', '/campaigns') }
      );
    }
    return null;
  }
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** True when the question shares enough distinctive words with an FAQ entry. */
function overlaps(question: string, candidate: string): boolean {
  const stop = new Set([
    'what', 'is', 'the', 'a', 'an', 'do', 'does', 'i', 'my', 'can', 'how', 'to', 'of', 'and',
    'it', 'you', 'in', 'on', 'for', 'with', 'are', 'me', 'this',
  ]);
  const words = new Set(question.split(' ').filter((word) => word.length > 2 && !stop.has(word)));
  if (words.size === 0) return false;
  const target = candidate.split(' ').filter((word) => word.length > 2 && !stop.has(word));
  const hits = target.filter((word) => words.has(word)).length;
  return hits >= 2;
}
