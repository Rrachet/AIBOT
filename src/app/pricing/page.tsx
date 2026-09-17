import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/icons';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { ZemoWidget } from '@/components/zemo/zemo-widget';
import { FAQ, PLANS, PRICING_HONESTY, type Plan } from '@/content/plans';

export const metadata: Metadata = {
  title: 'Pricing — AIBOT',
  description:
    'AIBOT pricing for AI lead calling, qualification and follow-up. Start free; every plan includes the whole product. What changes is how many leads, agents and campaigns you can run.',
  openGraph: {
    title: 'Pricing — AIBOT',
    description: 'Plans for teams putting every inbound lead to work.',
    type: 'website',
    siteName: 'AIBOT',
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pricing — AIBOT',
    description: 'Start free. Pay when AIBOT is doing the work.',
  },
  alternates: { canonical: '/pricing' },
};

/**
 * Every limit any plan states, in the order they first appear.
 *
 * Matched by label rather than by position: the plans do not all quote the
 * same three limits, and reading the third column of each would have labelled
 * Scale's workspace count as a campaign count.
 */
const COMPARE_ROWS: string[] = [
  ...new Set(PLANS.flatMap((plan) => plan.limits.map((limit) => limit.label))),
];

/**
 * Pricing.
 *
 * Every plan separates three things that a pricing page usually blurs: what
 * works today, what runs but is simulated, and what is not built yet. Selling
 * a live-calling plan while calls are simulated would be the fastest possible
 * way to lose a customer in their second week, so the distinction is a design
 * element here rather than a footnote.
 *
 * The plans themselves come from `content/plans`, which Zemo also answers
 * from — so the two can never quote different numbers.
 */
export default function PricingPage() {
  return (
    <div className="site">
      <SiteHeader />

      <main id="main-content">
        <section className="section is-tight">
          <div className="site-shell">
            <div className="section-head is-center">
              <span className="section-eyebrow">Pricing</span>
              <h1
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--display-2)',
                  fontWeight: 800,
                  lineHeight: 1.04,
                  letterSpacing: 'var(--track-display)',
                  textWrap: 'balance',
                }}
              >
                Start free. Pay when AIBOT is doing the work.
              </h1>
              <p>
                Every plan includes the whole product. What changes is how many leads, agents and
                campaigns you can run.
              </p>
            </div>

            <p className="pricing-honesty">
              <Icon name="alert" size={17} />
              <span>
                <strong>Read this before you buy.</strong> {PRICING_HONESTY}
              </span>
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
              <span className="section-eyebrow">Side by side</span>
              <h2>What actually differs</h2>
              <p>The limits, side by side. Everything else is identical on every plan.</p>
            </div>

            <div className="card" style={{ overflow: 'hidden' }}>
              <div className="table-scroll">
                <table className="compare-table">
                  <thead>
                    <tr>
                      <th scope="col">&nbsp;</th>
                      {PLANS.map((plan) => (
                        <th key={plan.id} scope="col">
                          {plan.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARE_ROWS.map((label) => (
                      <tr key={label}>
                        <th scope="row">{label}</th>
                        {PLANS.map((plan) => (
                          <td key={plan.id}>
                            {plan.limits.find((limit) => limit.label === label)?.value ?? '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr>
                      <th scope="row">Price</th>
                      {PLANS.map((plan) => (
                        <td key={plan.id}>
                          {plan.price}
                          <span style={{ color: 'var(--muted-2)', fontWeight: 500 }}>
                            {' '}
                            {plan.cadence}
                          </span>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="site-shell">
            <div className="section-head is-center">
              <span className="section-eyebrow">Questions</span>
              <h2>Straight answers</h2>
              <p>Including the ones that are awkward for us.</p>
            </div>

            <div className="faq-list">
              {FAQ.map((item) => (
                <details key={item.q} className="faq-item">
                  <summary>
                    {item.q}
                    <Icon name="chevron" size={17} />
                  </summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="section is-alt">
          <div className="site-shell">
            <div className="cta-panel">
              <h2>Your next lead shouldn&rsquo;t have to wait.</h2>
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
      <ZemoWidget userState="anonymous" />
    </div>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <div className={`plan${plan.featured ? ' is-featured' : ''}`}>
      {plan.featured ? <span className="plan-flag">Most chosen</span> : null}

      <h2 className="plan-name">{plan.name}</h2>
      <p className="plan-tagline">{plan.tagline}</p>

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

      <ul className="plan-limits">
        {plan.limits.map((limit) => (
          <li key={limit.label}>
            <span className="limit-label">{limit.label}</span>
            <span className="limit-value">{limit.value}</span>
          </li>
        ))}
      </ul>

      <div className="plan-group">
        <h3>
          <Icon name="check" size={13} />
          Available now
        </h3>
        <ul className="plan-list">
          {plan.available.map((item) => (
            <li key={item}>
              <Icon name="check" size={14} />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="plan-group is-simulated">
        <h3>
          <Icon name="play" size={13} />
          Simulated in this build
        </h3>
        <ul className="plan-list is-muted">
          {plan.simulated.map((item) => (
            <li key={item}>
              <Icon name="play" size={13} />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="plan-group is-soon">
        <h3>
          <Icon name="clock" size={13} />
          Needs a connected provider
        </h3>
        <ul className="plan-list is-muted">
          {plan.soon.map((item) => (
            <li key={item}>
              <Icon name="clock" size={13} />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
