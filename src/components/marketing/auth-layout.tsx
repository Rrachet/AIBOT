import Link from 'next/link';

/**
 * The frame both auth screens sit in.
 *
 * Sign-in is the seam between the website and the product, so it borrows from
 * both: the site's brand mark and measure on the left, the application's form
 * controls on the right.
 */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <main className="auth-page">
      <div className="auth-panel">
        <Link className="site-brand auth-panel-brand" href="/">
          <span className="brand-mark" aria-hidden="true">
            AI
          </span>
          <span className="site-brand-name">AIBOT</span>
        </Link>

        <div className="auth-panel-copy">
          <h1>Put every lead to work.</h1>
          <p>
            AIBOT calls, qualifies and follows up with your leads automatically — using your script,
            your questions and your product.
          </p>
        </div>

        <ul className="auth-panel-list">
          <li>Configure an AI agent in minutes</li>
          <li>Hear a test call before anyone is contacted</li>
          <li>Every transcript, outcome and follow-up stored in your workspace</li>
        </ul>

        <p className="auth-panel-note">
          Calls and WhatsApp messages are simulated until you connect a provider, and AIBOT labels
          every one of them.
        </p>
      </div>

      <div className="auth-main">
        <div className="auth-card">
          <Link className="site-brand auth-card-brand" href="/">
            <span className="brand-mark" aria-hidden="true">
              AI
            </span>
            <span className="site-brand-name">AIBOT</span>
          </Link>

          <div className="auth-heading">
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>

          {children}

          <div className="auth-switch">{footer}</div>
        </div>
      </div>
    </main>
  );
}
