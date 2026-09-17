/**
 * The plans, as one fact.
 *
 * The pricing page renders these and Zemo answers from them. Two copies would
 * drift, and the first time Zemo quotes a price the page does not show is the
 * last time anyone believes either of them.
 *
 * `available` is what works today. `simulated` runs end to end but reaches
 * nothing outside the workspace. `soon` is not built. Nothing else may claim a
 * capability, and no plan may list a feature in more than one of the three.
 */

export interface Plan {
  id: 'starter' | 'growth' | 'scale';
  name: string;
  price: string;
  cadence: string;
  /** One line, in the voice of the person choosing. */
  tagline: string;
  /** Who this is genuinely for — Zemo uses this to recommend. */
  bestFor: string;
  featured?: boolean;
  cta: string;
  note?: string;
  limits: { label: string; value: string }[];
  available: string[];
  simulated: string[];
  soon: string[];
}

export const PLANS: readonly Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 'Free',
    cadence: 'while AIBOT is in demo',
    tagline: 'Build a workspace and run a campaign end to end.',
    bestFor: 'trying AIBOT out, or running one small list to see what it does',
    cta: 'Start free',
    limits: [
      { label: 'Leads', value: '500' },
      { label: 'AI agents', value: '1' },
      { label: 'Campaigns', value: '2' },
    ],
    available: [
      'CSV and Excel import with duplicate detection',
      'One AI agent with your script and questions',
      'Call transcripts, outcomes and summaries',
      'Follow-up queue',
      'Workspace analytics',
      'Email support',
    ],
    simulated: ['Outbound calls', 'WhatsApp follow-up delivery'],
    soon: ['Live telephony', 'WhatsApp Business delivery'],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: '₹12,000',
    cadence: 'per month',
    tagline: 'For a team that works inbound leads every day.',
    bestFor: 'a sales team running several campaigns a month',
    featured: true,
    cta: 'Start free',
    limits: [
      { label: 'Leads', value: '10,000' },
      { label: 'AI agents', value: '5' },
      { label: 'Campaigns', value: 'Unlimited' },
    ],
    available: [
      'Everything in Starter',
      'Call script upload and per-campaign training',
      'Campaign test calls before anyone is contacted',
      'Agent and campaign performance breakdowns',
      'Qualification questions per campaign',
      'Priority email support',
    ],
    simulated: ['Outbound calls', 'WhatsApp follow-up delivery'],
    soon: ['Live telephony', 'WhatsApp Business delivery', 'Call recordings'],
  },
  {
    id: 'scale',
    name: 'Scale',
    price: "Let's talk",
    cadence: 'annual',
    tagline: 'Several teams, several workspaces, one set of numbers.',
    bestFor: 'multiple teams or brands that each need their own workspace',
    cta: 'Start free',
    note: 'Start on Starter. We agree limits and price once your workspace is running.',
    limits: [
      { label: 'Leads', value: 'Unlimited' },
      { label: 'AI agents', value: 'Unlimited' },
      { label: 'Workspaces', value: 'Multiple' },
    ],
    available: [
      'Everything in Growth',
      'Multiple workspaces, isolated from each other',
      'Custom call objectives',
      'Onboarding and script review',
      'Named support contact',
    ],
    simulated: ['Outbound calls', 'WhatsApp follow-up delivery'],
    soon: ['Live telephony', 'WhatsApp Business delivery', 'Bring-your-own telephony account'],
  },
];

export function planById(id: string): Plan | undefined {
  return PLANS.find((plan) => plan.id === id);
}

/**
 * The one paragraph that has to be true wherever pricing is discussed.
 */
export const PRICING_HONESTY =
  'AIBOT does not place live phone calls or deliver WhatsApp messages yet. Both are simulated end to end and labelled everywhere they appear. Everything else — leads, agents, campaigns, transcripts, outcomes, follow-ups and analytics — is real and stored in your workspace.';

export const FAQ: readonly { q: string; a: string }[] = [
  {
    q: 'What does AIBOT actually do?',
    a: 'You configure an agent with your product, your script and the questions you want asked. AIBOT works through a lead list, has the conversation, records what was said, decides an outcome and queues the follow-up. Your team picks up qualified leads instead of chasing cold ones.',
  },
  {
    q: 'Does AIBOT make real phone calls?',
    a: 'Not in this build. Calls are simulated end to end: AIBOT generates the conversation your configuration would produce, stores the transcript and outcome, and labels the call as a demo everywhere it appears. No number is dialled. Live calling needs a telephony provider connected to your workspace.',
  },
  {
    q: 'What is the difference between an agent and a campaign?',
    a: 'An agent is who calls — a name, a company, a purpose and a manner. A campaign is what that call is about — the lead list, the product, the objective, the script and the questions. One agent can run many campaigns.',
  },
  {
    q: 'Can I upload my own script?',
    a: 'Paste it, or upload a .txt or .md file and AIBOT extracts the text for you to review before saving. PDF and Word are not supported yet — copy the text across instead.',
  },
  {
    q: 'Can I hear a call before my leads do?',
    a: 'Yes. Every agent has a demo call and every campaign has a test call, both of which run the full engine against a contact you choose. Test calls are kept out of campaign analytics so they never inflate your numbers.',
  },
  {
    q: 'How does WhatsApp follow-up work?',
    a: 'AIBOT writes the message, queues it against the lead and tracks its status. Delivery needs an official WhatsApp Business account. Until one is connected, sending is simulated and marked as such — the follow-up is recorded in your workspace, but nothing leaves it.',
  },
  {
    q: 'Can I import my existing leads?',
    a: 'Upload a CSV or Excel file and map the columns if AIBOT cannot work them out. It flags duplicates and invalid rows before anything is imported.',
  },
  {
    q: 'What happens to pricing when live calling arrives?',
    a: 'The plan covers the AIBOT software. Call costs are billed by whichever telephony provider you connect, at their rates, so you are never paying us a margin on minutes. We will confirm plan pricing before live calling is switched on for your workspace.',
  },
];
