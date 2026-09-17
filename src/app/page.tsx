import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/icons';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { LeadJourney } from '@/components/marketing/lead-journey';
import { ZemoAvatar } from '@/components/zemo/zemo-avatar';
import { ZemoWidget } from '@/components/zemo/zemo-widget';
import { PLANS } from '@/content/plans';

export const metadata: Metadata = {
  title: 'AIBOT — Every lead gets worked',
  description:
    'AI-powered conversations that qualify leads, follow up on prospects and keep your pipeline moving. Calls, transcripts, outcomes, follow-ups and analytics in one workspace.',
  keywords: [
    'AI lead qualification',
    'AI sales calls',
    'lead follow-up automation',
    'WhatsApp follow-up',
    'sales workspace',
  ],
  openGraph: {
    title: 'AIBOT — Every lead gets worked',
    description:
      'AI-powered conversations that qualify leads, follow up on prospects and keep your pipeline moving.',
    type: 'website',
    siteName: 'AIBOT',
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AIBOT — Every lead gets worked',
    description: 'AI conversations that qualify your leads and keep the pipeline moving.',
  },
  alternates: { canonical: '/' },
};

/**
 * The homepage.
 *
 * Built out of the product rather than around it: every panel below is made
 * from the application's own components, so a visitor is looking at AIBOT and
 * not at an illustration of a robot. The one thing this page must achieve is
 * that somebody who has never heard of it understands, within one screen, that
 * a lead arrives and gets worked.
 */
export default function HomePage() {
  return (
    <div className="site">
      <SiteHeader />

      <main id="main-content">
        <Hero />
        <Problem />
        <Workflow />
        <Showcase />
        <ZemoSection />
        <PricingTeaser />
        <FinalCta />
      </main>

      <SiteFooter />
      <ZemoWidget userState="anonymous" />
    </div>
  );
}

function Hero() {
  return (
    <section className="hero">
      <div className="site-shell hero-inner">
        <div className="hero-copy">
          <span className="hero-badge">
            <ZemoAvatar size={20} />
            <b>Zemo</b> can walk you through it
          </span>

          <h1>Every lead gets worked.</h1>

          <p className="hero-sub">
            AI-powered conversations that qualify leads, follow up on prospects and keep your
            pipeline moving — without anyone having to remember.
          </p>

          <div className="hero-actions">
            <Link className="primary-button lg" href="/signup">
              Start free
            </Link>
            <Link className="secondary-button lg" href="#how-it-works">
              See how it works
            </Link>
          </div>

          <p className="hero-note">
            Calls and WhatsApp messages are simulated until you connect a provider. Everything else
            — your leads, agents, campaigns, transcripts and analytics — is real from the first
            minute.
          </p>
        </div>

        <div data-tour="hero-journey">
          <LeadJourney />
        </div>
      </div>
    </section>
  );
}

function Problem() {
  return (
    <section className="section is-alt" data-tour="problem">
      <div className="site-shell">
        <div className="section-head">
          <span className="section-eyebrow">The problem</span>
          <h2>Leads don&rsquo;t usually disappear. They get forgotten.</h2>
          <p>
            Almost nobody loses a deal to a competitor at 9pm on a Tuesday. They lose it to a busy
            week.
          </p>
        </div>

        <div className="decay">
          <div className="decay-step">
            <span className="decay-time">Tuesday, 9:14 pm</span>
            <h3>The enquiry lands</h3>
            <p>Someone fills in your form. It joins forty others in an inbox nobody is watching.</p>
          </div>
          <div className="decay-step">
            <span className="decay-time">Wednesday</span>
            <h3>Nobody calls</h3>
            <p>
              The team is working yesterday&rsquo;s list. Today&rsquo;s enquiry is at the bottom of
              it.
            </p>
          </div>
          <div className="decay-step">
            <span className="decay-time">Friday</span>
            <h3>Someone calls once</h3>
            <p>No answer. It is marked as tried, and nothing schedules the second attempt.</p>
          </div>
          <div className="decay-step is-cold">
            <span className="decay-time">Next week</span>
            <h3>They buy elsewhere</h3>
            <p>
              Not because the other quote was better. Because somebody else picked up the phone
              first.
            </p>
          </div>
        </div>

        <div className="decay-answer">
          <p>
            AIBOT calls the lead while it is still warm, asks your qualification questions, records
            what was said and queues the follow-up before anyone has a chance to forget.
          </p>
          <Link className="primary-button" href="/signup">
            Start working your leads
          </Link>
        </div>
      </div>
    </section>
  );
}

function Workflow() {
  const nodes = [
    { step: '01', title: 'Lead', body: 'Imported from a CSV, added by hand, or sitting in your list already.' },
    { step: '02', title: 'AI agent', body: 'Your agent — its name, its company, its manner, its brief.' },
    { step: '03', title: 'Call', body: 'It opens with your script and works through your questions.' },
    { step: '04', title: 'Qualification', body: 'An outcome decided from the conversation, with the reason attached.' },
    { step: '05', title: 'Follow-up', body: 'Scheduled at the end of the call, not remembered afterwards.' },
    { step: '06', title: 'WhatsApp', body: 'The message written from what was actually said.' },
    { step: '07', title: 'Human', body: 'A salesperson picks up a lead that is already warm.', human: true },
  ];

  return (
    <section className="section" id="how-it-works">
      <div className="site-shell">
        <div className="section-head is-center">
          <span className="section-eyebrow">How it works</span>
          <h2>From a name on a list to a conversation worth having.</h2>
          <p>
            Seven steps, and your team only has to be present for the last one.
          </p>
        </div>

        <div className="flow" data-tour="workflow">
          {nodes.map((node) => (
            <div key={node.step} className={`flow-node${node.human ? ' is-human' : ''}`}>
              <b>{node.step}</b>
              <strong>{node.title}</strong>
              <p>{node.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Showcase() {
  return (
    <section className="section is-alt">
      <div className="site-shell">
        <div className="section-head">
          <span className="section-eyebrow">The product</span>
          <h2>Give every campaign a brain.</h2>
          <p>
            Not a black box with a volume knob. You write what the agent says, what it asks and what
            it must never say — and you hear the difference before a single lead does.
          </p>
        </div>

        <div className="showcase" data-tour="showcase-config">
          <div className="showcase-copy">
            <h3>Tell AIBOT who to call, what to ask and what to do next.</h3>
            <p>
              A campaign holds the lead list, the agent, the product, the objective, the script and
              the qualification questions. The readiness panel says what is still missing before
              anybody is contacted.
            </p>
            <ul className="showcase-list">
              <li>
                <Icon name="check" size={15} />
                Paste a script, or upload a .txt or .md file
              </li>
              <li>
                <Icon name="check" size={15} />
                List what the agent must say — and must never say
              </li>
              <li>
                <Icon name="check" size={15} />
                Run a test call against a contact you choose, kept out of your analytics
              </li>
            </ul>
          </div>

          <div className="showcase-art">
            <div className="art-head">
              <span>AI call configuration</span>
              <span className="badge green">Ready</span>
            </div>
            <div className="mini">
              <div className="mini-row">
                <span className="mini-main">
                  <strong>Call objective</strong>
                  <span>Book a visit or appointment</span>
                </span>
              </div>
              <div className="mini-row">
                <span className="mini-main">
                  <strong>Product knowledge</strong>
                  <span>2BHK and 3BHK apartments in Gachibowli, 65L to 1.2Cr</span>
                </span>
              </div>
              <div className="mini-row">
                <span className="mini-main">
                  <strong>Qualification questions</strong>
                  <span>Budget range · Preferred location · Possession timeline</span>
                </span>
              </div>
              <div className="mini-row">
                <span className="mini-main">
                  <strong>Must never say</strong>
                  <span>guaranteed returns · cheapest in the market</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="showcase is-flipped">
          <div className="showcase-copy">
            <h3>Because the second conversation matters too.</h3>
            <p>
              A no-answer is not a dead lead, and &ldquo;call me later&rdquo; is not a note in
              somebody&rsquo;s head. Both become a queued follow-up with the message already
              written.
            </p>
            <ul className="showcase-list">
              <li>
                <Icon name="check" size={15} />
                Overdue first, so the queue is in the order the work is due
              </li>
              <li>
                <Icon name="check" size={15} />
                Send from the row — clearing the queue never means leaving the page
              </li>
              <li>
                <Icon name="check" size={15} />
                Every message recorded on the lead&rsquo;s timeline
              </li>
            </ul>
          </div>

          <div className="showcase-art">
            <div className="art-head">
              <span>Follow-up queue</span>
              <span className="badge amber">2 due</span>
            </div>
            <div className="mini">
              <div className="mini-row is-head">
                <span className="mini-main">Lead</span>
                <span className="mini-meta">Scheduled</span>
              </div>
              <div className="mini-row">
                <span className="mini-avatar">MI</span>
                <span className="mini-main">
                  <strong>Meera Iyer</strong>
                  <span>WhatsApp · site visit details</span>
                </span>
                <span className="mini-meta">Due</span>
              </div>
              <div className="mini-row">
                <span className="mini-avatar">RS</span>
                <span className="mini-main">
                  <strong>Rahul Sharma</strong>
                  <span>WhatsApp · tried calling, no answer</span>
                </span>
                <span className="mini-meta">Due</span>
              </div>
              <div className="mini-row">
                <span className="mini-avatar">AD</span>
                <span className="mini-main">
                  <strong>Anita Desai</strong>
                  <span>WhatsApp · asked to be called back</span>
                </span>
                <span className="mini-meta">Tomorrow</span>
              </div>
            </div>
          </div>
        </div>

        <div className="showcase" data-tour="showcase-analytics">
          <div className="showcase-copy">
            <h3>Know what happened without listening to every call.</h3>
            <p>
              Every figure is a count of rows in your workspace. A rate with nothing to divide by
              shows a dash rather than a zero, and test calls never inflate a campaign&rsquo;s
              numbers.
            </p>
            <ul className="showcase-list">
              <li>
                <Icon name="check" size={15} />
                Which campaigns convert, and which agents qualify
              </li>
              <li>
                <Icon name="check" size={15} />
                Where prospects drop out of the conversation
              </li>
              <li>
                <Icon name="check" size={15} />
                A plain-language summary on every call, not a log
              </li>
            </ul>
          </div>

          <div className="showcase-art">
            <div className="art-head">
              <span>Campaign performance</span>
            </div>
            <div className="mini">
              <div className="mini-row is-head">
                <span className="mini-main">Campaign</span>
                <span className="mini-meta">Qualified</span>
              </div>
              <div className="mini-row">
                <span className="mini-main">
                  <strong>Gachibowli &amp; Kondapur enquiries</strong>
                  <span>8 leads · 8 called</span>
                </span>
                <span className="badge green">3</span>
              </div>
              <div className="mini-row">
                <span className="mini-main">
                  <strong>Answer rate</strong>
                  <span>7 of 9 answered</span>
                </span>
                <span className="mini-meta">77.8%</span>
              </div>
              <div className="mini-row">
                <span className="mini-main">
                  <strong>Average call length</strong>
                  <span>Across answered calls</span>
                </span>
                <span className="mini-meta">1:59</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ZemoSection() {
  return (
    <section className="section">
      <div className="site-shell zemo-intro">
        <div className="showcase-copy">
          <span className="section-eyebrow">Meet Zemo</span>
          <h3>The bit of AIBOT that answers back.</h3>
          <p>
            Zemo knows this product — every page, every term, every plan. Ask it what a campaign is,
            which plan fits you, or where something lives, and it will tell you. Ask it something it
            does not know and it will tell you that too, which is the part most chat bubbles skip.
          </p>
          <ul className="showcase-list">
            <li>
              <Icon name="check" size={15} />
              Knows which page you are on and what it is for
            </li>
            <li>
              <Icon name="check" size={15} />
              Explains agents, campaigns, outcomes and follow-ups in plain words
            </li>
            <li>
              <Icon name="check" size={15} />
              Can set up a demo without a form or a calendar dance
            </li>
          </ul>
        </div>

        <div className="zemo-sample">
          <div className="zemo-sample-turn">
            <ZemoAvatar size={22} />
            <p>Trying to figure out which plan fits?</p>
          </div>
          <div className="zemo-sample-turn is-user">
            <p>What&rsquo;s the difference between an agent and a campaign?</p>
          </div>
          <div className="zemo-sample-turn">
            <ZemoAvatar size={22} mood="talking" />
            <p>
              An agent is <em>who</em> calls — a name, a company, a manner. A campaign is{' '}
              <em>why</em> — the list, the product, the objective, the questions. One agent, many
              campaigns.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingTeaser() {
  return (
    <section className="section is-alt">
      <div className="site-shell">
        <div className="section-head is-center">
          <span className="section-eyebrow">Pricing</span>
          <h2>Start free. Pay when AIBOT is doing the work.</h2>
          <p>
            Every plan includes the whole product. What changes is how many leads, agents and
            campaigns you can run.
          </p>
        </div>

        <div className="plan-grid">
          {PLANS.map((plan) => (
            <div key={plan.id} className={`plan${plan.featured ? ' is-featured' : ''}`}>
              {plan.featured ? <span className="plan-flag">Most chosen</span> : null}
              <h3 className="plan-name">{plan.name}</h3>
              <p className="plan-tagline">{plan.tagline}</p>
              <div className="plan-price">
                <strong>{plan.price}</strong>
                <span>{plan.cadence}</span>
              </div>
              <ul className="plan-limits">
                {plan.limits.map((limit) => (
                  <li key={limit.label}>
                    <span className="limit-label">{limit.label}</span>
                    <span className="limit-value">{limit.value}</span>
                  </li>
                ))}
              </ul>
              <div className="plan-group">
                <Link
                  className={
                    plan.featured ? 'primary-button plan-cta' : 'secondary-button plan-cta'
                  }
                  href="/signup"
                >
                  {plan.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', marginTop: 28 }}>
          <Link className="site-link" href="/pricing">
            See everything in each plan →
          </Link>
        </p>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="section">
      <div className="site-shell">
        <div className="cta-panel">
          <h2>Your next lead shouldn&rsquo;t have to wait.</h2>
          <p>
            Create a workspace, build an agent and run a campaign this afternoon. No card, no
            telephony contract, nothing to install.
          </p>
          <div className="hero-actions">
            <Link className="primary-button lg" href="/signup">
              Start working your leads
            </Link>
            <Link className="secondary-button lg" href="/pricing">
              View pricing
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
