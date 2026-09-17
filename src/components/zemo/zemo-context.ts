/**
 * What Zemo knows about where you are.
 *
 * Zemo never answers about the product from general knowledge. Every page it
 * can appear on has an entry here, and an entry is the whole of what Zemo may
 * say about that page: the sentence it opens with, what the page is for, the
 * vocabulary it can explain, and the nudge it may offer once. A page with no
 * entry gets the fallback, and Zemo says it does not know rather than
 * inventing something plausible.
 *
 * This is the "structured page context" half of the assistant. The other half
 * — turning a question into one of these answers — lives in the provider.
 */

export type ZemoSurface = 'public' | 'app';

export interface ZemoPageContext {
  /** Route this describes. Matched longest-prefix-first. */
  route: string;
  /** Short name Zemo uses when referring to the page. */
  page: string;
  surface: ZemoSurface;
  /** One line: what this page is for, in Zemo's voice. */
  summary: string;
  /** Terms Zemo can define while you are here. */
  glossary?: Record<string, string>;
  /** The single proactive line Zemo may offer on this page. */
  nudge?: string;
  /** Routes Zemo may offer to take you to from here. */
  suggestedRoutes?: string[];
}

export interface ZemoContext {
  route: string;
  page: string;
  surface: ZemoSurface;
  /** Present only inside the application; never sent anywhere. */
  workspaceId?: string;
  /** Coarse state — "empty" vs "working" — never the data itself. */
  userState?: 'anonymous' | 'empty-workspace' | 'active-workspace';
  availableActions?: string[];
}

const GLOSSARY_SHARED: Record<string, string> = {
  agent:
    'An agent is who calls. It has a name, the company it speaks for, a purpose and a manner. One agent can run as many campaigns as you like.',
  campaign:
    'A campaign is what a call is about: the lead list, the product, the objective, the script and the questions to ask. The agent is who calls; the campaign is why.',
  qualified:
    'Qualified means the lead answered, stayed in the conversation and matched what the campaign was looking for. It is the outcome worth a salesperson’s time.',
  'follow-up':
    'A follow-up is what AIBOT owes a lead after a call — usually a WhatsApp message, scheduled for a specific time. It is written at the end of the call, not invented later.',
  'no answer':
    'No answer means the call was placed and nobody picked up. AIBOT queues a follow-up instead of quietly dropping the lead.',
  outcome:
    'The outcome is what a call came to: qualified, not interested, follow-up, or no answer. It is decided from the conversation, not guessed from its length.',
  'demo call':
    'A demo call runs the whole engine — script, questions, transcript, outcome — without dialling anything. It is how you hear an agent before your leads do.',
};

export const ZEMO_PAGES: readonly ZemoPageContext[] = [
  {
    route: '/',
    page: 'the overview',
    surface: 'public',
    summary:
      'This page is the short version of AIBOT: a lead arrives, an agent calls it, the conversation is recorded and scored, and the follow-up is queued before anyone forgets.',
    glossary: GLOSSARY_SHARED,
    nudge: 'Want the twenty-second version?',
    suggestedRoutes: ['/pricing', '/signup'],
  },
  {
    route: '/pricing',
    page: 'pricing',
    surface: 'public',
    summary:
      'Three plans. What changes between them is how many leads, agents and campaigns you can run — not which parts of the product you get.',
    glossary: GLOSSARY_SHARED,
    nudge: 'Want the plans without the marketing fluff?',
    suggestedRoutes: ['/', '/signup'],
  },
  {
    route: '/login',
    page: 'sign-in',
    surface: 'public',
    summary: 'Signing in to a workspace you already have.',
    suggestedRoutes: ['/signup'],
  },
  {
    route: '/signup',
    page: 'signup',
    surface: 'public',
    summary:
      'Creating a workspace. Name, workspace, email, password — then a confirmation link, and you are in.',
    suggestedRoutes: ['/login', '/pricing'],
  },
  {
    route: '/dashboard',
    page: 'the dashboard',
    surface: 'app',
    summary:
      'What happened, what needs you, and what to do next. The numbers are counts of real rows in your workspace, not estimates.',
    glossary: GLOSSARY_SHARED,
    nudge: 'Want me to point at the thing that actually needs you?',
    suggestedRoutes: ['/leads', '/campaigns', '/follow-ups'],
  },
  {
    route: '/leads',
    page: 'leads',
    surface: 'app',
    summary:
      'Everyone AIBOT could call, and where each of them got to. Import a CSV or add one by hand; the status column is the short history of each person.',
    glossary: GLOSSARY_SHARED,
    nudge: 'Want me to explain what these statuses mean?',
    suggestedRoutes: ['/campaigns', '/calls'],
  },
  {
    route: '/agents',
    page: 'agents',
    surface: 'app',
    summary:
      'Your AI callers. An agent is not a black box — you write what it says, what it asks and what it must never say, and you can hear the difference on a demo call.',
    glossary: GLOSSARY_SHARED,
    nudge: 'An agent is only as good as its brief. Want a hand writing one?',
    suggestedRoutes: ['/campaigns'],
  },
  {
    route: '/campaigns',
    page: 'campaigns',
    surface: 'app',
    summary:
      'Where a list of names becomes a worked pipeline. A campaign holds the leads, the agent, the product, the objective, the script and the questions.',
    glossary: GLOSSARY_SHARED,
    nudge: 'This is where the interesting part starts.',
    suggestedRoutes: ['/leads', '/agents', '/calls'],
  },
  {
    route: '/calls',
    page: 'calls',
    surface: 'app',
    summary:
      'Every conversation this workspace has had, with its transcript, its outcome and the next action. Simulated calls are labelled on every row.',
    glossary: GLOSSARY_SHARED,
    nudge: 'Open any call — the transcript is the whole conversation, not a log.',
    suggestedRoutes: ['/follow-ups', '/analytics'],
  },
  {
    route: '/follow-ups',
    page: 'follow-ups',
    surface: 'app',
    summary:
      'What AIBOT owes a lead, in the order it is due. Overdue first, with the send control on the row so clearing the queue never means leaving the page.',
    glossary: GLOSSARY_SHARED,
    nudge: 'Anything marked Due has been waiting longer than it should.',
    suggestedRoutes: ['/whatsapp', '/leads'],
  },
  {
    route: '/whatsapp',
    page: 'WhatsApp',
    surface: 'app',
    summary:
      'The message itself, exactly as it would arrive. Delivery needs a WhatsApp Business account; until then sending is simulated and recorded, and nothing leaves the workspace.',
    glossary: GLOSSARY_SHARED,
    nudge: 'These are real stored messages — read one before you send it.',
    suggestedRoutes: ['/follow-ups'],
  },
  {
    route: '/analytics',
    page: 'analytics',
    surface: 'app',
    summary:
      'Whether the campaigns are working, which agents qualify the most, and where prospects drop. Every figure is a count of rows; a rate with nothing to divide by shows a dash, never a zero.',
    glossary: GLOSSARY_SHARED,
    nudge: 'Numbers are cute. Knowing which one to act on is better.',
    suggestedRoutes: ['/campaigns', '/calls'],
  },
  {
    route: '/settings',
    page: 'settings',
    surface: 'app',
    summary:
      'Your workspace name, and what AIBOT still needs connected before calls and messages leave it.',
    suggestedRoutes: ['/dashboard'],
  },
];

const FALLBACK: ZemoPageContext = {
  route: '',
  page: 'this page',
  surface: 'app',
  summary: 'I know my way around AIBOT, but I do not have notes on this particular page.',
  glossary: GLOSSARY_SHARED,
};

/**
 * Longest matching route wins, so `/campaigns/<id>` resolves to the campaigns
 * entry rather than to `/`.
 */
export function pageContextFor(route: string): ZemoPageContext {
  const matches = ZEMO_PAGES.filter(
    (entry) => route === entry.route || (entry.route !== '/' && route.startsWith(`${entry.route}/`))
  );
  if (matches.length === 0) {
    return route === '/' ? (ZEMO_PAGES[0] as ZemoPageContext) : FALLBACK;
  }
  return matches.reduce((best, entry) => (entry.route.length > best.route.length ? entry : best));
}

export function buildContext(route: string, extra: Partial<ZemoContext> = {}): ZemoContext {
  const page = pageContextFor(route);
  return {
    route,
    page: page.page,
    surface: page.surface,
    availableActions: page.suggestedRoutes,
    ...extra,
  };
}
