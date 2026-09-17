import type { ZemoGaze, ZemoMood } from '../zemo-avatar';

/**
 * The tour, as data.
 *
 * Every step names a real element by `data-tour` attribute. Nothing here is a
 * slideshow of screenshots: the tour moves the person through the actual
 * product and points at the actual controls, which is the only way somebody
 * learns where things are.
 *
 * The story the steps tell, in order, is the mental model of AIBOT:
 *
 *   lead → agent → campaign → conversation → outcome → follow-up →
 *   WhatsApp → analytics
 *
 * Each step explains *why* the thing exists before *what* it does. "This page
 * lists your calls" teaches nothing; "this is where you see what happened, so
 * nobody has to listen to every call" teaches the product.
 */

export interface ZemoTourStep {
  id: string;
  /** Route this step lives on. The controller navigates if needed. */
  route: string;
  /** `[data-tour="…"]` value. Null means "no highlight, just talk". */
  target: string | null;
  title: string;
  explanation: string;
  /** A second line, delivered after a beat, for the point worth landing. */
  aside?: string;
  /**
   * 'click' waits for the person to click the target before advancing —
   * they learn the control by using it. 'none' advances on Space or Next.
   */
  action?: 'click' | 'none';
  /** What Zemo asks them to do, shown in place of "Press Space". */
  prompt?: string;
  mood?: ZemoMood;
  gaze?: ZemoGaze;
}

/**
 * The authenticated tour. Nine stops, roughly a minute at a reading pace.
 */
export const APP_TOUR: readonly ZemoTourStep[] = [
  {
    id: 'dashboard',
    route: '/dashboard',
    target: 'pipeline',
    title: 'This is your command center.',
    explanation:
      'AIBOT takes a lead through the whole journey — first contact, conversation, outcome, follow-up. This strip is that journey, counted.',
    aside: 'You should not need five screens to know how the week is going.',
    mood: 'talking',
  },
  {
    id: 'leads',
    route: '/dashboard',
    target: 'nav-leads',
    title: 'Start where the people are.',
    explanation: 'Click Leads in the sidebar and I will follow you over.',
    action: 'click',
    prompt: 'Click Leads',
    mood: 'curious',
    gaze: 'left',
  },
  {
    id: 'leads-table',
    route: '/leads',
    target: 'leads-table',
    title: 'These are the people AIBOT works for you.',
    explanation:
      'Import a CSV, or add someone by hand. The status column is the short history of each person — where they got to, and what is owed them next.',
    aside: 'Think of it as a working list, not a database.',
    mood: 'talking',
  },
  {
    id: 'agents',
    route: '/agents',
    target: 'agent-card',
    title: 'Meet the one doing the talking.',
    explanation:
      'An agent has a name, a company it speaks for, a job and a manner. You write all four — it is a brief, not a black box.',
    aside: 'One business can run different agents for different jobs.',
    mood: 'talking',
  },
  {
    id: 'campaigns',
    route: '/campaigns',
    target: 'campaigns-new',
    title: 'Now we give the agent a job.',
    explanation:
      'A campaign says who to contact, which agent to use, what to ask, and what should happen after the conversation.',
    aside: 'This is where your sales process turns into something repeatable.',
    mood: 'talking',
  },
  {
    id: 'test-call',
    route: '/campaigns',
    target: 'campaign-row',
    title: 'Test it before anyone else hears it.',
    explanation:
      'Open a campaign and you can run a test call against a contact you choose. You see exactly what the agent says and whether your instructions actually shaped the conversation.',
    aside: 'Test calls are kept out of your analytics, so they never flatter your numbers.',
    mood: 'talking',
  },
  {
    id: 'calls',
    route: '/calls',
    target: 'calls-table',
    title: 'After a conversation, you get more than a recording.',
    explanation:
      'The transcript, the outcome, a plain-language summary and the next action — all on one screen.',
    aside: 'So your team can understand a call without sitting through it.',
    mood: 'talking',
  },
  {
    id: 'follow-ups',
    route: '/follow-ups',
    target: 'follow-ups-queue',
    title: 'And this part is the one people skip.',
    explanation:
      'A lead rarely converts on one conversation. AIBOT tracks who is owed a follow-up, when it is due and on which channel — written at the end of the call, not remembered afterwards.',
    aside: 'Overdue first, because that is the order the work is actually due in.',
    mood: 'talking',
  },
  {
    id: 'whatsapp',
    route: '/whatsapp',
    target: 'whatsapp-messages',
    title: 'The conversation carries on where people actually reply.',
    explanation:
      'The message is written from what was said on the call, and stays attached to the lead instead of disappearing into someone’s phone.',
    aside:
      'In this build, sending is simulated and labelled — the follow-up is recorded, but nothing leaves your workspace.',
    mood: 'talking',
  },
  {
    id: 'analytics',
    route: '/analytics',
    target: 'analytics-funnel',
    title: 'Finally, the part everyone asks about.',
    explanation:
      'What actually happened. Which campaigns convert, which agents qualify, and where people drop out of the conversation.',
    aside: 'Every figure is a count of your own rows. Nothing here is estimated.',
    mood: 'talking',
  },
];

/**
 * The public tour. No workspace to walk through, so this one explains the
 * shape of the product against the homepage's own sections.
 */
export const PUBLIC_TOUR: readonly ZemoTourStep[] = [
  {
    id: 'what',
    route: '/',
    target: 'hero-journey',
    title: 'Here is the whole product in one picture.',
    explanation:
      'A lead arrives. An agent calls it. The conversation is recorded and scored. The follow-up is queued before anyone forgets.',
    mood: 'talking',
  },
  {
    id: 'why',
    route: '/',
    target: 'problem',
    title: 'Leads do not usually disappear.',
    explanation:
      'They get forgotten. Nobody loses a deal at 9pm on a Tuesday — they lose it to a busy week.',
    aside: 'AIBOT calls while the lead is still warm, which is most of the trick.',
    mood: 'helpful',
  },
  {
    id: 'how',
    route: '/',
    target: 'workflow',
    title: 'Seven steps, and you only turn up for the last one.',
    explanation:
      'Lead, agent, call, qualification, follow-up, WhatsApp, and then a person — with the whole conversation already in front of them.',
    mood: 'talking',
  },
  {
    id: 'agents-public',
    route: '/',
    target: 'showcase-config',
    title: 'You write what the agent says.',
    explanation:
      'The product, the objective, the script, the questions to ask, and the phrases it must never use. Then you hear it on a test call.',
    mood: 'talking',
  },
  {
    id: 'analytics-public',
    route: '/',
    target: 'showcase-analytics',
    title: 'And you find out whether it worked.',
    explanation:
      'Counts of real rows — which campaigns convert, which agents qualify, how fast follow-ups go out.',
    mood: 'talking',
  },
  {
    id: 'pricing-public',
    route: '/pricing',
    target: 'plan-grid',
    title: 'Every plan has the whole product.',
    explanation:
      'What changes is how many leads, agents and campaigns you can run. And the page is explicit about what is simulated in this build.',
    aside: 'Starter is free while AIBOT is in demo.',
    mood: 'pleased',
  },
];

export function tourFor(surface: 'public' | 'app'): readonly ZemoTourStep[] {
  return surface === 'public' ? PUBLIC_TOUR : APP_TOUR;
}
