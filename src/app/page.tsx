import Link from 'next/link';

const features = [
  ['01', 'Speak like your customer', 'Indian English, Hindi, Hinglish and market-specific voices. Expand into more languages as you grow.'],
  ['02', 'Teach it your business', 'Give AIBOT your product, knowledge, script and qualification rules. No prompt engineering required.'],
  ['03', 'Work the whole lead', 'Call, qualify, retry, follow up on WhatsApp and hand genuinely interested leads to your team.'],
];

export default function LandingPage() {
  return (
    <main className="marketing-shell">
      <nav className="marketing-nav">
        <Link className="marketing-logo" href="/">AIBOT<span style={{ color: '#f7f4ee' }}>.</span></Link>
        <div className="marketing-navlinks">
          <Link href="#how-it-works">How it works</Link>
          <Link href="#why-aibot">Why AIBOT</Link>
          <Link href="/pricing">Pricing</Link>
        </div>
        <div className="marketing-actions">
          <Link className="mk-btn mk-btn-ghost" href="/login">Log in</Link>
          <Link className="mk-btn mk-btn-orange" href="/signup">Start free</Link>
        </div>
        <span className="mobile-menu">MENU</span>
      </nav>

      <section className="hero-wrap">
        <div className="hero-grid">
          <div>
            <span className="eyebrow"><span className="eyebrow-dot" /> AI lead conversion engine</span>
            <h1 className="hero-title">Every lead gets <span>worked.</span></h1>
            <p className="hero-copy">AIBOT calls your leads, understands what they need, qualifies them and follows up — with AI that speaks like your customer.</p>
            <div className="hero-ctas">
              <Link className="mk-btn mk-btn-orange" href="/signup">Start working your leads →</Link>
              <Link className="mk-btn mk-btn-ghost" href="#how-it-works">See how it works</Link>
            </div>
            <p className="hero-note">No credit card · Set up your first campaign in minutes</p>
          </div>
          <div className="hero-panel" aria-label="AIBOT lead conversion preview">
            <div className="window-top"><i className="window-dot"/><i className="window-dot"/><i className="window-dot"/></div>
            <div className="bot-card">
              <div className="bot-label">Live campaign</div>
              <h3>Gachibowli enquiries</h3>
              <div className="lead-row"><strong>Rahul Sharma</strong><span className="lead-status">QUALIFIED</span><span>₹1.5 Cr · 3 BHK · 1–3 months</span></div>
              <div className="lead-row"><strong>Priya Nair</strong><span className="lead-status">FOLLOW-UP</span><span>Callback tomorrow · WhatsApp ready</span></div>
              <div className="lead-row"><strong>Arjun Mehta</strong><span>NO ANSWER</span><span>Retry scheduled</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-dark" id="why-aibot">
        <span className="section-kicker">Not another voice bot</span>
        <h2 className="section-title">Calls are the action.<br/>Leads are the product.</h2>
        <p className="section-sub">AIBOT is built around the lead — not the phone call. Every conversation creates a clear next action for your sales team.</p>
        <div className="feature-grid">
          {features.map(([number, title, copy]) => <article className="feature-card" key={number}><span className="feature-number">{number}</span><h3>{title}</h3><p>{copy}</p></article>)}
        </div>
      </section>

      <section className="accent-section" id="how-it-works">
        <div className="section-dark">
          <span className="section-kicker">One workflow</span>
          <h2 className="section-title">From enquiry to opportunity.</h2>
          <p className="section-sub">Set the rules once. AIBOT handles the repetitive work and gives your people the conversations worth having.</p>
          <div className="workflow">
            {['Lead arrives', 'AI calls', 'Qualifies', 'Follows up', 'Sales handoff'].map((item, i) => <div className="workflow-step" key={item}><b>0{i + 1}</b><strong style={{ display: 'block', marginTop: 20 }}>{item}</strong><span>{['Import or connect your leads.', 'Native voice conversation.', 'Intent, budget, need & timeline.', 'Retry or WhatsApp automatically.', 'Your team gets the hot lead.'][i]}</span></div>)}
          </div>
          <p className="quote">“We don’t sell you minutes. We help you work the leads you already paid for.”</p>
        </div>
      </section>

      <section className="section-dark">
        <span className="section-kicker">Built for real conversations</span>
        <h2 className="section-title">India first. Global by design.</h2>
        <p className="section-sub">Use Hindi, Hinglish or Indian English for your Indian campaigns. Switch to natural American English for US leads. The business brain stays yours.</p>
        <div className="feature-grid">
          <article className="feature-card"><span className="feature-number">🇮🇳 INDIA</span><h3>Hindi · Hinglish · English</h3><p>Designed around the way customers actually speak, with localized conversation configuration.</p></article>
          <article className="feature-card"><span className="feature-number">🇺🇸 USA</span><h3>American English</h3><p>Market-specific voice configuration so the conversation fits the person on the other side.</p></article>
          <article className="feature-card"><span className="feature-number">∞ CONTROL</span><h3>Your business rules</h3><p>Product knowledge, qualification questions, scripts, must-say and must-not-say guardrails.</p></article>
        </div>
      </section>

      <footer className="marketing-footer"><div>© 2026 AIBOT. Built for businesses that follow up.</div><div><Link href="/pricing">Pricing</Link><Link href="/login">Log in</Link><Link href="/signup">Get started</Link></div></footer>
    </main>
  );
}
