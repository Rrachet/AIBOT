import { PLANS, PRICING_HONESTY, FAQ } from '@/content/plans';
import { pageContextFor, type ZemoContext } from './zemo-context';

/**
 * Zemo's brain, behind an interface.
 *
 * The shipped implementation is `DemoZemoProvider`: it matches intent against
 * the structured page context rather than calling a model, because this build
 * pays for no AI provider. Swapping in a real LLM later means writing one more
 * class against `ZemoProvider` and changing where it is constructed — nothing
 * in the widget, panel or context model has to move.
 *
 * Two rules bind every implementation:
 *   - Zemo answers about AIBOT only from the structured context it is given.
 *     If the answer is not in there, it says so.
 *   - Zemo never reports an action as done that it has not done.
 */

export interface ZemoMessage {
  id: string;
  role: 'zemo' | 'user';
  text: string;
  /** Rendered as chips under the message. */
  suggestions?: string[];
  /** A route Zemo is offering to open. Confirmed by the user, never automatic. */
  navigate?: { label: string; href: string };
  /** Starts or advances the demo-request flow. */
  form?: 'demo-request';
}

export interface ZemoReply {
  messages: ZemoMessage[];
}

export interface ZemoProvider {
  /** The line Zemo opens with on a given page. */
  greeting(context: ZemoContext): ZemoMessage;
  respond(input: {
    message: string;
    context: ZemoContext;
    history: ZemoMessage[];
  }): Promise<ZemoReply>;
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
    if (context.surface === 'public') {
      return ['What does AIBOT actually do?', 'Which plan fits me?', 'Book me a demo'];
    }
    const base = [`What is this page for?`];
    if (page.glossary?.qualified) base.push('What does qualified mean?');
    base.push('How do I run a campaign?');
    return base;
  }

  async respond({ message, context }: {
    message: string;
    context: ZemoContext;
    history: ZemoMessage[];
  }): Promise<ZemoReply> {
    const text = norm(message);
    const page = pageContextFor(context.route);

    // 1. Demo request. Checked first so "I want a demo" never falls through to
    //    a glossary match on the word "call".
    if (hasAny(text, ['demo', 'talk to someone', 'contact me', 'sales', 'call me', 'get in touch'])) {
      return {
        messages: [
          zemoMessage(
            "Happy to set that up. I'll take three things and pass them on — no calendar dance.",
            { form: 'demo-request' }
          ),
        ],
      };
    }

    // 2. Navigation. Only offered, never performed.
    if (hasAny(text, ['take me', 'go to', 'open', 'show me', 'navigate', 'where is', 'where do i'])) {
      const target = DESTINATIONS.find((destination) => hasAny(text, destination.words));
      if (target) {
        if (target.href === context.route) {
          return {
            messages: [
              zemoMessage(`You're already here. ${page.summary}`, {
                suggestions: this.suggestionsFor(context),
              }),
            ],
          };
        }
        return {
          messages: [
            zemoMessage(`${capitalise(target.label)} it is.`, {
              navigate: { label: `Open ${target.label}`, href: target.href },
            }),
          ],
        };
      }
    }

    // 3. Pricing.
    if (hasAny(text, ['price', 'pricing', 'cost', 'plan', 'how much', 'expensive', 'free'])) {
      return { messages: [this.pricingAnswer(text)] };
    }

    // 4. Simulation honesty — asked directly, answered directly.
    if (hasAny(text, ['real call', 'really call', 'actually call', 'simulated', 'fake', 'dial'])) {
      return {
        messages: [
          zemoMessage(
            "Straight answer: not yet. Calls and WhatsApp messages are simulated end to end and labelled everywhere they appear — the transcript, outcome and follow-up are real rows in your workspace, but no number is dialled. Live calling needs a telephony provider connected.",
            { suggestions: ['Which plan fits me?', 'Book me a demo'] }
          ),
        ],
      };
    }

    // 5. Vocabulary from this page's glossary.
    if (page.glossary) {
      const entry = Object.entries(page.glossary).find(([term]) => text.includes(norm(term)));
      if (entry) {
        return {
          messages: [zemoMessage(entry[1], { suggestions: this.suggestionsFor(context) })],
        };
      }
    }

    // 6. "What is this page?"
    if (hasAny(text, ['this page', 'what is this', 'where am i', 'what does this do', 'explain'])) {
      return {
        messages: [
          zemoMessage(page.summary, { suggestions: this.suggestionsFor(context) }),
        ],
      };
    }

    // 7. The FAQ, which is the same text the pricing page publishes.
    const faq = FAQ.find((item) => overlaps(text, norm(item.q)));
    if (faq) {
      return { messages: [zemoMessage(faq.a, { suggestions: this.suggestionsFor(context) })] };
    }

    // 8. Onboarding walkthroughs.
    if (hasAny(text, ['how do i', 'how to', 'get started', 'first', 'set up', 'setup'])) {
      const answer = this.howTo(text);
      if (answer) return { messages: [answer] };
    }

    // 9. Small talk, briefly, then back to work.
    if (hasAny(text, ['who are you', 'what are you', 'your name', 'zemo'])) {
      return {
        messages: [
          zemoMessage(
            "I'm Zemo. I know AIBOT well and I'll tell you when I don't know something, which is more than most chat bubbles will offer.",
            { suggestions: this.suggestionsFor(context) }
          ),
        ],
      };
    }

    if (hasAny(text, ['thanks', 'thank you', 'cheers', 'nice', 'cool'])) {
      return { messages: [zemoMessage('Any time.')] };
    }

    // 10. Out of scope. Said plainly rather than guessed at.
    return {
      messages: [
        zemoMessage(
          "That one's outside what I know. I can explain any page you're on, walk you through agents, campaigns, calls, follow-ups or analytics, break down the plans, or get you a demo.",
          { suggestions: this.suggestionsFor(context) }
        ),
      ],
    };
  }

  private pricingAnswer(text: string): ZemoMessage {
    const named = PLANS.find((plan) => text.includes(plan.id));
    if (named) {
      return zemoMessage(
        `${named.name} is ${named.price} ${named.cadence}. ${named.limits
          .map((limit) => `${limit.value.toLowerCase()} ${limit.label.toLowerCase()}`)
          .join(', ')}. Best for ${named.bestFor}. ${PRICING_HONESTY}`,
        { navigate: { label: 'Open pricing', href: '/pricing' } }
      );
    }

    if (hasAny(text, ['which', 'should i', 'fits', 'right for', 'recommend'])) {
      return zemoMessage(
        `Depends on volume, not features — every plan has the whole product. ${PLANS.map(
          (plan) => `${plan.name} (${plan.price}) suits ${plan.bestFor}`
        ).join('. ')}. Start on Starter; it costs nothing while AIBOT is in demo.`,
        { navigate: { label: 'Compare the plans', href: '/pricing' } }
      );
    }

    return zemoMessage(
      `${PLANS.map((plan) => `${plan.name} — ${plan.price} ${plan.cadence}`).join('. ')}. ${PRICING_HONESTY}`,
      { navigate: { label: 'Open pricing', href: '/pricing' } }
    );
  }

  private howTo(text: string): ZemoMessage | null {
    if (hasAny(text, ['agent'])) {
      return zemoMessage(
        'Agents → Create agent. Give it a name, the company it speaks for, a purpose and a manner. Then run a demo call on it and listen — an agent is only as good as its brief, and you will hear the difference immediately.',
        { navigate: { label: 'Open agents', href: '/agents' } }
      );
    }
    if (hasAny(text, ['import', 'csv', 'excel', 'upload lead'])) {
      return zemoMessage(
        'Leads → Import CSV or Excel. Map the columns if AIBOT cannot work them out; it flags duplicates and invalid rows before anything is saved.',
        { navigate: { label: 'Open leads', href: '/leads' } }
      );
    }
    if (hasAny(text, ['campaign', 'call'])) {
      return zemoMessage(
        'Four steps: attach leads, pick the agent, fill in the product, objective, script and questions, then run a test call. The readiness panel tells you what is still missing before anyone is contacted.',
        { navigate: { label: 'Open campaigns', href: '/campaigns' } }
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
