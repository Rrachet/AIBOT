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
  /**
   * Why the page exists — the problem it solves, not the data it renders.
   *
   * This is the field that decides whether Zemo teaches anything. "This page
   * lists your calls" is a caption; "this is where you find out what happened
   * without listening to every call" is the reason somebody would open it.
   */
  why?: string;
  /** An everyday comparison, offered before the explanation. */
  analogy?: string;
  /** The handful of ideas that have to land for the page to make sense. */
  keyConcepts?: string[];
  /**
   * Where this sits in the chain. Zemo teaches AIBOT as one system rather
   * than a menu, so every page knows what feeds it and what it feeds.
   */
  connects?: { from?: string; to?: string };
  /** Questions people actually ask here, with answers in Zemo's voice. */
  commonQuestions?: { q: string; a: string }[];
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
    why: 'Most businesses do not lose leads to a better competitor. They lose them to a busy week — the enquiry arrives, nobody calls it for three days, and by then the person has bought elsewhere.',
    analogy: 'Think of AIBOT as the colleague who always makes the call you meant to make.',
    keyConcepts: ['lead', 'agent', 'campaign', 'outcome', 'follow-up'],
    connects: { to: 'Leads become campaign members, campaigns give them to an agent, and the conversation produces the follow-up.' },
    commonQuestions: [
      {
        q: 'what does aibot do',
        a: 'It works your inbound leads. You brief an agent once — your product, your script, your questions — and it calls each lead, records what was said, decides an outcome, and queues the follow-up. Your team picks up the ones worth their time.',
      },
      {
        q: 'who is it for',
        a: 'Teams that live on inbound enquiries and lose them to response time rather than to price. Property, education, services, anywhere a list of names arrives faster than anyone can call it.',
      },
    ],
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
    why: 'Every plan has the whole product. Charging for features would mean crippling the thing you are trying to evaluate, so what changes is volume: leads, agents, campaigns.',
    analogy: 'Same car, bigger tank.',
    keyConcepts: ['plan limits', 'simulated calling', 'connected provider'],
    connects: { from: 'You can run a full campaign on Starter before deciding anything.' },
    commonQuestions: [
      {
        q: 'which plan should i pick',
        a: 'Start on Starter — it is free while AIBOT is in demo and has the entire product. Move to Growth when you outgrow 500 leads or one agent, not before.',
      },
    ],
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
    why: 'Because the four questions that matter on a Monday morning — what happened, what needs me, what is stuck, what next — should not require opening five screens.',
    analogy: 'It is the view from the doorway of the room, not a report.',
    keyConcepts: ['pipeline', 'needs attention', 'campaign progress', 'activity'],
    connects: {
      from: 'Everything here is counted from your leads, calls and follow-ups.',
      to: 'The attention list links straight to the page where you can act on it.',
    },
    commonQuestions: [
      {
        q: 'what is the pipeline strip',
        a: 'The same people counted further along: how many leads you have, how many were called, how many answered, how many qualified, and how many follow-ups came out of it. Where it narrows is where you are losing them.',
      },
      {
        q: 'where do these numbers come from',
        a: 'Counts of rows in your workspace. Nothing is estimated, and a rate with nothing to divide by shows a dash rather than a zero.',
      },
    ],
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
    why: 'A lead list in a spreadsheet is a list of names. Here it is a list of people with a state — who has been called, who answered, who is owed something — so nobody falls through by being forgotten.',
    analogy: 'A working list, not a database.',
    keyConcepts: ['import', 'status', 'source', 'activity timeline'],
    connects: {
      from: 'Leads arrive by CSV or Excel import, or one at a time by hand.',
      to: 'Attach them to a campaign and an agent starts calling them.',
    },
    commonQuestions: [
      {
        q: 'how do i import leads',
        a: 'Import CSV or Excel, then map the columns if AIBOT cannot work them out. It flags duplicates and invalid rows before saving anything, so a messy export does not become a messy workspace.',
      },
      {
        q: 'what do the statuses mean',
        a: 'New means nobody has called yet. Calling is in progress. Qualified, Not interested, No answer and Follow-up are what the conversation came to. The status is the short history of that person.',
      },
    ],
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
    why: 'Because "an AI called your lead" is worth nothing if you cannot say what it was going to say. An agent is a brief you write and can read back.',
    analogy: 'You are briefing a new hire, not configuring a robot.',
    keyConcepts: ['purpose', 'instructions', 'business context', 'active state'],
    connects: {
      to: 'A campaign picks an agent and gives it a job — the list, the product and the questions.',
    },
    commonQuestions: [
      {
        q: 'how do i create an agent',
        a: 'Create agent, then four things: its name, the company it speaks for, the job it is doing and how it should sound. Then run a demo call and listen — you will hear immediately whether the brief was specific enough.',
      },
      {
        q: 'how many agents do i need',
        a: 'One per job, not one per campaign. A property business might have one agent qualifying buyers and another chasing site-visit no-shows; both can run as many campaigns as you like.',
      },
    ],
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
    why: 'An agent knows how to talk. A campaign is what it talks about, to whom, and what happens afterwards — which is what turns a good conversation into a repeatable process.',
    analogy: 'Think of a campaign as a playbook.',
    keyConcepts: ['leads', 'agent', 'objective', 'script', 'questions', 'product knowledge'],
    connects: {
      from: 'Leads come in from your list; the agent comes from Agents.',
      to: 'Running it produces calls, outcomes and follow-ups.',
    },
    commonQuestions: [
      {
        q: 'how do i run a campaign',
        a: 'Attach the leads, pick the agent, fill in the product, objective, script and questions, then run a test call. The readiness panel tells you exactly what is still missing before anyone is contacted.',
      },
      {
        q: 'what is a test call',
        a: 'The whole engine run against one contact you choose, so you hear what the agent actually says before your list does. Test calls are excluded from campaign analytics, so they never flatter your numbers.',
      },
    ],
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
    why: 'So nobody has to listen to an hour of recordings to find out what happened. Every call arrives already read: transcript, outcome, a plain summary and the next action.',
    analogy: 'Minutes of the meeting, not a tape of it.',
    keyConcepts: ['transcript', 'outcome', 'summary', 'next action'],
    connects: {
      from: 'Calls come from running a campaign, or from a single demo or test call.',
      to: 'The outcome decides the follow-up, and feeds the analytics.',
    },
    commonQuestions: [
      {
        q: 'what is in a call record',
        a: 'Who was called, by which agent, on which campaign, how long it ran, the full conversation, the outcome and why, and what happens next. Simulated calls are labelled on every row.',
      },
    ],
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
    why: 'Because a lead rarely converts on the first conversation, and the second one is the one people forget. A no-answer is not a dead lead, and "call me next week" is not a note in somebody head.',
    analogy: 'It is the queue of promises the product made on your behalf.',
    keyConcepts: ['scheduled time', 'channel', 'status', 'due'],
    connects: {
      from: 'Every follow-up is written at the end of a call, from what was said.',
      to: 'Sending it records the message on the lead timeline.',
    },
    commonQuestions: [
      {
        q: 'what does due mean',
        a: 'Pending, and its scheduled time has passed. Due items sort to the top, because that is the order the work is actually owed in.',
      },
    ],
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
    why: 'Because people reply to WhatsApp and ignore voicemail — and the reply should stay attached to the lead rather than disappearing into somebody personal phone.',
    analogy: 'The same conversation, continued where they will actually answer.',
    keyConcepts: ['message template', 'status', 'simulated sending'],
    connects: {
      from: 'The message is written from what was said on the call.',
      to: 'Sending records it on the follow-up and the lead timeline.',
    },
    commonQuestions: [
      {
        q: 'does it really send',
        a: 'Not in this build. Delivery needs an official WhatsApp Business account. Until one is connected, sending is simulated and labelled — the follow-up is recorded in your workspace, but nothing leaves it.',
      },
    ],
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
    why: 'To answer four questions and no others: are the campaigns working, which agents qualify, where do people drop, and how fast do follow-ups go out. A wall of charts answers none of them.',
    analogy: 'A scoreboard, not a telescope.',
    keyConcepts: ['answer rate', 'qualification rate', 'funnel', 'campaign performance'],
    connects: {
      from: 'Every figure is counted from your calls, leads and follow-ups.',
      to: 'What you learn here changes the script, the questions or the list.',
    },
    commonQuestions: [
      {
        q: 'why is a rate showing a dash',
        a: 'Because there is nothing to divide by yet. A dash means no data; a zero would mean you tried and got none, and those are very different things.',
      },
    ],
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
    why: 'Deliberately short. What an agent says lives on the agent and the campaign, where it is read — putting it here would mean two places to look and one of them wrong.',
    keyConcepts: ['workspace name', 'providers', 'product tour'],
    connects: { to: 'Provider connections are what turn simulated calls and messages into real ones.' },
    commonQuestions: [
      {
        q: 'how do i take the tour again',
        a: 'Settings, then Take the product tour again. Or just ask me to show you around.',
      },
    ],
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
