import Link from 'next/link';
import { AuthFacts } from './auth-facts';
import { ZemoWidget } from '@/components/zemo/zemo-widget';

/**
 * The frame both auth screens sit in.
 *
 * Signing in is the seam between the website and the product, so the screen
 * borrows from both: the site's headline and measure on the left, the
 * application's own form controls on the right. Asymmetric on purpose — a
 * centred card on an empty page is the one thing every SaaS sign-in looks
 * like, and this is the last screen before someone decides whether the product
 * was worth the signup.
 *
 * The left panel is decoration and disappears below 900px, where the form is
 * the whole job.
 */
export function AuthLayout({
  headline,
  title,
  subtitle,
  children,
  footer,
}: {
  /** The panel headline. Differs between signing in and starting out. */
  headline: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <>
      <main className="auth-page">
        <div className="auth-panel">
          <Link className="site-brand auth-panel-brand" href="/">
            <span className="brand-mark" aria-hidden="true">
              AI
            </span>
            <span className="site-brand-name">AIBOT</span>
          </Link>

          <h1>{headline}</h1>

          <p className="auth-panel-lead">
            AIBOT calls, qualifies and follows up automatically — using your script, your questions
            and your product.
          </p>

          <AuthFacts />

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

      <ZemoWidget userState="anonymous" />
    </>
  );
}
