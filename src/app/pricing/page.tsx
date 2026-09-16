import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/icons';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';

export const metadata: Metadata = {
  title: 'Pricing — AIBOT',
  description:
    'AIBOT pricing for AI lead calling, qualification, follow-up and WhatsApp handoff. Start free, and connect a telephony or messaging provider when you are ready for live calls.',
  openGraph: {
    title: 'Pricing — AIBOT',
    description: 'Plans for teams putting every inbound lead to work.',
    type: 'website',
    siteName: 'AIBOT',
  },
  alternates: { canonical: '/pricing' },
};

/**
 * Pricing.
 *
 * Every plan separates what runs today from what needs a provider connected.
 * Selling a live-calling plan while calls are simulated would be the fastest
 * possible way to lose a customer in their second week.
 */

interface Plan {
  id: string;
  name: string;
  price: string;
  cadence: string;
  tagline: string;
  featured?: boolean;
  cta: string;
  /** Shown under the CTA where the plan needs a word of explanation. */
  note?: string;
  included: string[];
  requiresProvider: string[];
}

const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 'Free',
    cadence: 'while in demo',
    tagline: 'For small teams testing AI lead engagement.',
    cta: 'Start free',
    included: [
      '1 workspace',
      'Up to 500 leads',
      '1 AI agent',
      '2 campaigns',
      'CSV and Excel import',
      'Call transcripts and outcomes',
      'Follow-up queue',
      'Workspace analytics',
      'Email support',
    ],
    requiresProvider: ['Live outbound calling', 'WhatsApp delivery'],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: '₹12,000',
    cadence: 'per month',
    tagline: 'For businesses actively converting inbound leads.',
    featured: true,
    cta: 'Start free',
    included: [
      'Everything in Starter',
      'Up to 10,000 leads',
      '5 AI agents',
      'Unlimited campaigns',
      'Call script upload',
      'Campaign test calls',
      'Agent and campaign performance',
      'Priority email support',
    ],
    requiresProvider: ['Live outbound calling', 'WhatsApp Business delivery', 'Call recordings'],
  },
  {
    id: 'scale',
    name: 'Scale',
    price: "Let's talk",
    cadence: 'annual',
    tagline: 'For teams running larger campaigns.',
    cta: 'Start free',
    note: 'Start on Starter. We agree limits and price with you once your workspace is running.',
    included: [
      'Everything in Growth',
      'Unlimited leads',
      'Unlimited AI agents',
      'Multiple workspaces',
      'Custom call objectives',
      'Onboarding and script review',
      'Named support contact',
    ],
    requiresProvider: [
      'Live outbound calling',
      'WhatsApp Business delivery',
      'Bring-your-own telephony account',
    ],
  },
];

const FAQ = [
  {
    q: 'What is AIBOT?',
    a: 'AIBOT works your inbound leads for you. You configure an AI agent with your product, your script and the questions you want asked; it calls each lead, records what was said, decides an outcome, and queues a follow-up. Your team picks up qualified leads instead of chasing cold ones.',
  },
  {
    q: 'Does AIBOT make real phone calls?',
    a: 'Not in this build. Calls are simulated end to end: AIBOT generates the conversation your configuration would produce, stores the transcript and outcome, and labels the call as a demo everywhere it appears. No phone number is dialled. Live calling needs a telephony provider connected to your workspace, which is on the roadmap and is not included in the prices above.',
  },
  {
    q: 'Can I configure what the AI says?',
    a: 'Yes, and it is the main thing you do. Each agent has a name, a company, a purpose and instructions. Each campaign adds the product, the call objective, the script, the qualification questions, the knowledge the agent may rely on, and phrases it must or must not say.',
  },
  {
    q: 'Can I upload a script?',
    a: 'You can paste a script or upload it as a .txt or .md file, and AIBOT extracts the text for you to review before saving. PDF and Word uploads are not supported yet — copy the text across instead.',
  },
  {
    q: 'Does AIBOT support WhatsApp?',
    a: 'AIBOT writes the follow-up message, queues it and tracks its status. Actual delivery needs an official WhatsApp Business account connected. Until then, sending is simulated and clearly marked as such — the message is recorded as sent in your workspace, but nothing leaves it.',
  },
  {
    q: 'Can I import my leads from a CSV?',
    a: 'Yes. Upload a CSV or Excel file, map the columns if AIBOT cannot work them out, and it will flag duplicates and invalid rows before importing.',
  },
  {
    q: 'Is there a free trial?',
    a: 'Starter is free while AIBOT is in demo. Create a workspace, build an agent and run a full campaign without entering a card.',
  },
  {
    q: 'How does pricing work once live calling is available?',
    a: 'The plan covers the AIBOT software. Call costs are billed by whichever telephony provider you connect, at their rates, so you are never paying us a margin on minutes. We will confirm plan pricing before live calling is switched on for your workspace.',
  },
];

export default function PricingPage() {
  return (
    <div className="site">
      <SiteHeader />

      <main id="main-content">
        <section className="section pricing-hero">
          <div className="site-shell">
            <div className="section-head">
              <span className="section-eyebrow">Pricing</span>
              <h1>Start free. Pay when AIBOT is doing the work.</h1>
              <p>
                Every plan includes the full product. What changes is how many leads, agents and
                campaigns you can run.
              </p>
            </div>

            <p className="pricing-honesty">
              <strong>Read this before you buy.</strong> AIBOT does not place live phone calls or
              deliver WhatsApp messages yet. Those need a provider connected to your workspace and
              are marked below as such on every plan. Everything else on this page works today.
            </p>

            <div className="plan-grid">
              {PLANS.map((plan) => (
                <PlanCard key={plan.id} plan={plan} />
              ))}
            </div>
          </div>
        </section>

        <section className="section is-alt">
          <div className="site-shell">
            <div className="section-head">
              <span className="section-eyebrow">Questions</span>
              <h2>Straight answers</h2>
              <p>Including the ones that are awkward for us.</p>
            </div>

            <div className="faq-list">
              {FAQ.map((item) => (
                <details key={item.q} className="card faq-item">
                  <summary>
                    {item.q}
                    <Icon name="chevron" size={16} />
                  </summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="section final-cta">
          <div className="site-shell">
            <div className="cta-panel">
              <h2>Put every lead to work.</h2>
              <p>Create your workspace and run a campaign today.</p>
              <div className="hero-actions">
                <Link className="primary-button lg" href="/signup">
                  Start free
                </Link>
                <Link className="secondary-button lg" href="/">
                  Back to product
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <div className={`card plan-card${plan.featured ? ' is-featured' : ''}`}>
      {plan.featured ? <span className="plan-flag">Most chosen</span> : null}

      <div className="plan-head">
        <h2>{plan.name}</h2>
        <p>{plan.tagline}</p>
        <div className="plan-price">
          <strong>{plan.price}</strong>
          <span>{plan.cadence}</span>
        </div>
        <Link
          className={plan.featured ? 'primary-button plan-cta' : 'secondary-button plan-cta'}
          href="/signup"
        >
          {plan.cta}
        </Link>
        {plan.note ? <p className="plan-note">{plan.note}</p> : null}
      </div>

      <div className="plan-section">
        <h3>Included</h3>
        <ul className="plan-list">
          {plan.included.map((item) => (
            <li key={item}>
              <Icon name="check" size={14} />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="plan-section is-pending">
        <h3>Needs a connected provider</h3>
        <ul className="plan-list is-pending">
          {plan.requiresProvider.map((item) => (
            <li key={item}>
              <Icon name="clock" size={14} />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
