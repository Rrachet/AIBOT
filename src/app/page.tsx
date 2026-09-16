import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/icons';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';

export const metadata: Metadata = {
  title: 'AIBOT — Put Every Lead to Work',
  description:
    'AIBOT calls, qualifies and follows up with your inbound leads automatically. Configure an AI agent, run a campaign, read every transcript, and hand qualified leads to your sales team over WhatsApp.',
  openGraph: {
    title: 'AIBOT — Put Every Lead to Work',
    description:
      'AI calling, lead qualification, follow-up and WhatsApp handoff for teams that live on inbound leads.',
    type: 'website',
    siteName: 'AIBOT',
  },
  alternates: { canonical: '/' },
};

/**
 * The homepage.
 *
 * The product proof is built from the application's own components — the same
 * badges, stat cards, transcript bubbles and message previews the product
 * renders — rather than from pictures of a product that does not exist. If a
 * section here looks a certain way, that is because the software does.
 */
export default function HomePage() {
  return (
    <div className="site">
      <SiteHeader />

      <main id="main-content">
        <Hero />
        <Problem />
        <Agents />
        <Campaign />
        <CallSection />
        <FollowUp />
        <Analytics />
        <FinalCta />
      </main>

      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="hero">
      <div className="site-shell hero-inner">
        <span className="eyebrow-chip">
          <span className="pulse-dot" aria-hidden="true" />
          AI lead engagement
        </span>

        <h1 className="hero-title">Every lead gets worked.</h1>

        <p className="hero-sub">
          AIBOT calls, qualifies and follows up with your leads — automatically. No enquiry sits in
          a spreadsheet waiting for someone to notice it.
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
          Calls and WhatsApp messages are simulated until you connect a provider. Everything else —
          your leads, agents, campaigns, transcripts and analytics — is real from the first minute.
        </p>

        <div className="hero-proof">
          <div className="card hero-stat">
            <span className="hero-stat-label">Lead arrives</span>
            <strong>0s</strong>
            <span className="hero-stat-meta">Queued the moment it lands</span>
          </div>
          <span className="hero-arrow" aria-hidden="true">
            <Icon name="arrow" size={18} />
          </span>
          <div className="card hero-stat is-active">
            <span className="hero-stat-label">AI calls</span>
            <strong>
              Calling<span className="ellipsis" aria-hidden="true" />
            </strong>
            <span className="hero-stat-meta">Your script, your questions</span>
          </div>
          <span className="hero-arrow" aria-hidden="true">
            <Icon name="arrow" size={18} />
          </span>
          <div className="card hero-stat">
            <span className="hero-stat-label">Outcome</span>
            <strong>
              <span className="badge green">Qualified</span>
            </strong>
            <span className="hero-stat-meta">With a transcript and next action</span>
          </div>
        </div>
      </div>
    </section>
  );
}

const COLD = [
  'A lead fills in your form at 9pm.',
  'Nobody sees it until the morning.',
  'Someone calls once. No answer.',
  'It drops off the list.',
  'The lead buys from whoever called back.',
];

const WORKED = [
  'A lead fills in your form at 9pm.',
  'AIBOT calls, using your script.',
  'It asks your qualifying questions.',
  'The outcome, transcript and next action are recorded.',
  'A WhatsApp follow-up goes out, and your team sees a qualified lead.',
];

function Problem() {
  return (
    <section className="section" id="how-it-works">
      <div className="site-shell">
        <SectionHead
          eyebrow="The problem"
          title="Most leads are lost to silence, not to competitors."
          sub="The gap between an enquiry arriving and someone actually speaking to it is where revenue leaks."
        />

        <div className="compare">
          <div className="card compare-col">
            <h3 className="compare-title">
              <span className="compare-dot is-cold" aria-hidden="true" />
              Without AIBOT
            </h3>
            <ol className="compare-list">
              {COLD.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className="compare-foot is-cold">The lead goes cold.</p>
          </div>

          <div className="card compare-col is-aibot">
            <h3 className="compare-title">
              <span className="compare-dot is-hot" aria-hidden="true" />
              With AIBOT
            </h3>
            <ol className="compare-list">
              {WORKED.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className="compare-foot is-hot">The lead gets worked.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

const AGENT_FIELDS = [
  { label: 'Agent instructions', value: 'Be warm and brief. Ask before launching into detail.' },
  { label: 'Call objective', value: 'Book a visit or appointment' },
  { label: 'Product knowledge', value: '2BHK and 3BHK apartments in Gachibowli, 65L to 1.2Cr.' },
  { label: 'Qualification questions', value: 'Budget range · Preferred location · Possession timeline' },
  { label: 'Must say', value: 'This call may be recorded for quality.' },
  { label: 'Must not say', value: 'guaranteed returns' },
];

function Agents() {
  return (
    <section className="section is-alt">
      <div className="site-shell split">
        <div className="split-copy">
          <SectionHead
            eyebrow="AI agents"
            title="Configure an agent the way you would brief a new hire."
            sub="An agent is not a black box. You write what it sells, what it asks, what it must say and what it must never say — and the call follows it."
            align="left"
          />
          <ul className="tick-list">
            <li>
              <Icon name="check" size={14} /> Paste the script your team already uses
            </li>
            <li>
              <Icon name="check" size={14} /> Upload it as a .txt or .md file
            </li>
            <li>
              <Icon name="check" size={14} /> Change it and hear the difference on a test call
            </li>
          </ul>
          <Link className="site-link is-cta" href="/signup">
            Build your first agent <Icon name="arrow" size={14} />
          </Link>
        </div>

        <div className="card config-proof">
          <div className="card-head">
            <div>
              <div className="card-title">AI call configuration</div>
              <div className="card-subtitle">What the agent is given on every call</div>
            </div>
            <span className="badge green">Ready</span>
          </div>
          <dl className="config-list">
            {AGENT_FIELDS.map((field) => (
              <div key={field.label}>
                <dt>{field.label}</dt>
                <dd>{field.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  { n: '01', title: 'Import leads', body: 'Upload a CSV or Excel file. Duplicates are caught for you.' },
  { n: '02', title: 'Configure the AI', body: 'Product, objective, script and qualifying questions.' },
  { n: '03', title: 'Test call', body: 'Hear exactly what the agent will say before anyone is called.' },
  { n: '04', title: 'Start the campaign', body: 'AIBOT works the list and records every outcome.' },
  { n: '05', title: 'Track outcomes', body: 'Qualified, follow-up, not interested — with the reason.' },
];

function Campaign() {
  return (
    <section className="section">
      <div className="site-shell">
        <SectionHead
          eyebrow="Campaigns"
          title="From a list of names to a worked pipeline."
          sub="A campaign is a guided setup, not a switch you flip and hope."
        />
        <ol className="steps-grid">
          {STEPS.map((step) => (
            <li key={step.n} className="card step-card">
              <span className="step-number">{step.n}</span>
              <strong>{step.title}</strong>
              <span>{step.body}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const TRANSCRIPT: readonly [string, string][] = [
  ['Agent', 'Hi Kavya, this is Priya from Skyline Homes. I am following up on your enquiry — have you got a minute?'],
  ['Lead', 'Yes, go ahead.'],
  ['Agent', 'We sell 2BHK and 3BHK apartments in Gachibowli and Kondapur, ready to move in. Does that line up with what you are after?'],
  ['Lead', 'Broadly, yes.'],
  ['Agent', 'It would help to know about preferred location, budget and possession timeline — can we run through those?'],
  ['Lead', 'Yes, of course. I have a fair idea of what I am after on all of that.'],
  ['Agent', 'Wednesday evening it is, Kavya. I will send the details across on WhatsApp.'],
];

function CallSection() {
  return (
    <section className="section is-alt">
      <div className="site-shell split is-reverse">
        <div className="card call-proof">
          <div className="card-head">
            <div>
              <div className="card-title">Kavya Reddy</div>
              <div className="card-subtitle">Gachibowli &amp; Kondapur enquiries · 2:25</div>
            </div>
            <span className="cell-stack">
              <span className="badge green">Qualified</span>
              <span className="demo-tag">Demo call</span>
            </span>
          </div>
          <div className="transcript in-dialog">
            {TRANSCRIPT.map(([speaker, text], index) => (
              <div
                key={index}
                className={`transcript-line ${speaker === 'Agent' ? 'is-agent' : 'is-lead'}`}
              >
                <span className="transcript-speaker">{speaker}</span>
                <span className="transcript-text">{text}</span>
              </div>
            ))}
          </div>
          <div className="card-body">
            <p className="next-action">
              <span className="next-action-label">Next action</span>
              Send the address and confirm the Wednesday evening slot.
            </p>
          </div>
        </div>

        <div className="split-copy">
          <SectionHead
            eyebrow="Calls"
            title="Read the conversation, not a status code."
            sub="Every call keeps its transcript, its outcome, a plain-language summary and the next action — so a salesperson can pick it up without listening to anything."
            align="left"
          />
          <ul className="tick-list">
            <li>
              <Icon name="check" size={14} /> Outcome, duration, agent and campaign on one screen
            </li>
            <li>
              <Icon name="check" size={14} /> Unanswered calls show nothing was said, never a
              made-up conversation
            </li>
            <li>
              <Icon name="check" size={14} /> Simulated calls are labelled everywhere they appear
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function FollowUp() {
  return (
    <section className="section">
      <div className="site-shell">
        <SectionHead
          eyebrow="Follow-ups &amp; WhatsApp"
          title="The second touch happens whether anyone remembers or not."
          sub="A no-answer or a “call me later” becomes a queued follow-up with the message already written."
        />

        <div className="flow-row">
          {['Qualified', 'Follow-up queued', 'WhatsApp', 'Sales handoff'].map((label, index) => (
            <div key={label} className="flow-step">
              <div className="card flow-card">
                <span className="flow-index">{index + 1}</span>
                <strong>{label}</strong>
              </div>
              {index < 3 ? (
                <span className="flow-arrow" aria-hidden="true">
                  <Icon name="arrow" size={16} />
                </span>
              ) : null}
            </div>
          ))}
        </div>

        <div className="card wa-proof">
          <div className="card-head">
            <div>
              <div className="card-title">Message preview</div>
              <div className="card-subtitle">Exactly what would be sent, as it is stored</div>
            </div>
            <span className="demo-tag">Demo / Simulated WhatsApp</span>
          </div>
          <div className="wa-window">
            <div className="wa-bubble">
              <span className="wa-bubble-text">
                {'Hi Divya \u{1F44B}\n\nWe tried calling from Skyline Homes but could not reach you.\n\nWe sell 2BHK and 3BHK apartments in Gachibowli and Kondapur, ready to move in.\n\nReply here and we will pick it up whenever suits you.'}
              </span>
              <span className="wa-bubble-time">Not sent</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const METRICS = [
  { label: 'Leads', meta: 'Everyone in the pipeline' },
  { label: 'Calls placed', meta: 'Answered and unanswered' },
  { label: 'Answer rate', meta: 'Of every call made' },
  { label: 'Qualification rate', meta: 'Of answered calls' },
];

function Analytics() {
  return (
    <section className="section is-alt">
      <div className="site-shell">
        <SectionHead
          eyebrow="Analytics"
          title="Counted from your own records. Nothing estimated."
          sub="Every figure is a count of rows in your workspace. A rate with nothing to divide by shows a dash rather than a zero, and test calls never inflate a campaign's numbers."
        />
        <div className="metric-grid">
          {METRICS.map((metric) => (
            <div key={metric.label} className="card metric-card">
              <span className="metric-label">{metric.label}</span>
              <span className="metric-bar" aria-hidden="true">
                <span />
              </span>
              <span className="metric-meta">{metric.meta}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="section final-cta">
      <div className="site-shell">
        <div className="cta-panel">
          <h2>Put every lead to work.</h2>
          <p>
            Create a workspace, build an agent and run a campaign in an afternoon. No card, no
            telephony contract, nothing to install.
          </p>
          <div className="hero-actions">
            <Link className="primary-button lg" href="/signup">
              Start free
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

function SectionHead({
  eyebrow,
  title,
  sub,
  align = 'center',
}: {
  eyebrow: string;
  title: string;
  sub: string;
  align?: 'center' | 'left';
}) {
  return (
    <div className={`section-head${align === 'left' ? ' is-left' : ''}`}>
      <span className="section-eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{sub}</p>
    </div>
  );
}
