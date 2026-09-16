import Link from 'next/link';

/**
 * Public site footer.
 *
 * Carries the one thing a visitor most needs to know before signing up: which
 * parts of AIBOT run today and which need a provider connected. Saying it here
 * rather than only in the small print is the point.
 */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-shell">
        <div className="site-footer-top">
          <div className="site-footer-brand">
            <Link className="site-brand" href="/">
              <span className="brand-mark" aria-hidden="true">
                AI
              </span>
              <span className="site-brand-name">AIBOT</span>
            </Link>
            <p>
              AI calling, qualification and follow-up for inbound leads. Built so every enquiry gets
              worked, not just the ones someone remembers.
            </p>
          </div>

          <div className="site-footer-links">
            <div>
              <h3>Product</h3>
              <Link href="/">Overview</Link>
              <Link href="/pricing">Pricing</Link>
            </div>
            <div>
              <h3>Get started</h3>
              <Link href="/signup">Create workspace</Link>
              <Link href="/login">Sign in</Link>
            </div>
          </div>
        </div>

        <p className="site-footer-note">
          <strong>Where AIBOT is today.</strong> Leads, agents, campaigns, transcripts, outcomes,
          follow-ups and analytics are real and stored in your workspace. Voice calls and WhatsApp
          delivery are simulated until you connect a telephony or messaging provider — AIBOT labels
          every simulated call and message so nothing is ever presented as a conversation that
          happened.
        </p>

        <div className="site-footer-bottom">
          <span>© {new Date().getFullYear()} AIBOT</span>
          <span>Built for teams that live on inbound leads.</span>
        </div>
      </div>
    </footer>
  );
}
