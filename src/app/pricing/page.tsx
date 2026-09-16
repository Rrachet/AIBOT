import Link from 'next/link';

const plans = [
  { name: 'Starter', price: '₹2,999', desc: 'For small teams proving AI lead follow-up.', features: ['1 AI agent', '1 campaign', 'Lead import & qualification', 'Demo calling workflow', 'Lead activity timeline'], featured: false },
  { name: 'Growth', price: '₹7,999', desc: 'For teams turning a steady stream of enquiries into opportunities.', features: ['5 AI agents', 'Unlimited campaigns', 'Native-language configuration', 'Call + WhatsApp workflow', 'Advanced analytics'], featured: true },
  { name: 'Scale', price: 'Custom', desc: 'For high-volume sales teams and custom workflows.', features: ['Unlimited agents & campaigns', 'Custom voice & language setup', 'CRM integrations', 'Priority onboarding', 'Volume pricing'], featured: false },
];

export default function PricingPage() {
  return <main className="marketing-shell">
    <nav className="marketing-nav"><Link className="marketing-logo" href="/">AIBOT<span style={{ color: '#f7f4ee' }}>.</span></Link><div className="marketing-navlinks"><Link href="/">Product</Link><Link href="/pricing">Pricing</Link></div><div className="marketing-actions"><Link className="mk-btn mk-btn-ghost" href="/login">Log in</Link><Link className="mk-btn mk-btn-orange" href="/signup">Start free</Link></div></nav>
    <section className="pricing-page">
      <div className="pricing-head"><span className="section-kicker">Simple pricing</span><h1 className="section-title">Pay for the system.<br/><span style={{ color: '#ff6a00' }}>Not the complexity.</span></h1><p className="section-sub" style={{ margin: 'auto' }}>Start with the AIBOT workflow, validate it with your leads, then scale when the numbers make sense. No credit card to create your workspace.</p></div>
      <div className="pricing-grid">{plans.map(plan => <article className={`price-card${plan.featured ? ' featured' : ''}`} key={plan.name}>{plan.featured && <span className="price-tag">MOST POPULAR</span>}<div className="price-name">{plan.name}</div><div className="price-value">{plan.price}{plan.price !== 'Custom' && <small> / month</small>}</div><p className="price-desc">{plan.desc}</p><ul className="price-list">{plan.features.map(f => <li key={f}>{f}</li>)}</ul><Link className={`mk-btn ${plan.featured ? 'mk-btn-orange' : 'mk-btn-ghost'} price-cta`} href={plan.name === 'Scale' ? '/signup' : '/signup'}>{plan.name === 'Scale' ? 'Talk to us →' : 'Start free →'}</Link></article>)}</div>
      <p className="pricing-foot">Published prices are the planned AIBOT platform tiers. Live telephony/provider usage will be priced separately when real calling is enabled.</p>
    </section>
    <footer className="marketing-footer"><div>© 2026 AIBOT</div><div><Link href="/">Home</Link><Link href="/login">Log in</Link><Link href="/signup">Sign up</Link></div></footer>
  </main>;
}
