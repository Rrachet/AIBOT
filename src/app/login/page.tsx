import { login, signup } from './actions'
import { safeNextPath } from '@/lib/auth/redirect'

const messages: Record<string, string> = {
  invalid_credentials: 'The email or password is incorrect.',
  invalid_email: 'Enter a valid email address.',
  invalid_signup: 'Fill in every field to create your account.',
  password_too_short: 'Use a password of at least 8 characters (72 maximum).',
  password_mismatch: 'Those passwords do not match.',
  email_taken: 'That email is already registered. Sign in instead, or use another address.',
  signup_failed: 'We could not create your account. Try again in a moment.',
  confirmation_failed: 'That confirmation link is invalid or has expired. Request a new code.',
  configuration_error:
    'This AIBOT server is not configured to sign you in yet. Set the Supabase environment variables and restart it.',
  session_not_established:
    'Your credentials were accepted but the session could not be stored. Check that cookies are enabled and try again.',
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const error = typeof params.error === 'string' ? messages[params.error] : undefined
  const message = typeof params.message === 'string' ? messages[params.message] : undefined
  const next = safeNextPath(params.next)

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">AIBOT</div>
        <div className="auth-heading">
          <h1>Welcome back</h1>
          <p>Sign in to manage your AI lead engagement workspace.</p>
        </div>

        {error ? <div className="auth-alert auth-alert-error">{error}</div> : null}
        {message ? <div className="auth-alert auth-alert-success">{message}</div> : null}

        <form className="auth-form" action={login}>
          <input type="hidden" name="next" value={next} />
          <label>Email<input name="email" type="email" placeholder="you@company.com" autoComplete="email" required /></label>
          <label>Password<input name="password" type="password" placeholder="••••••••" autoComplete="current-password" required /></label>
          <button type="submit" className="auth-primary">Sign in</button>
        </form>

        <details className="auth-signup">
          <summary>New to AIBOT? Create an account</summary>
          <form className="auth-form" action={signup}>
            <label>Your name<input name="fullName" type="text" placeholder="Your name" autoComplete="name" required /></label>
            <label>Workspace name<input name="workspaceName" type="text" placeholder="Your company" required /></label>
            <label>Email<input name="email" type="email" placeholder="you@company.com" autoComplete="email" required /></label>
            <label>Password<input name="password" type="password" placeholder="At least 8 characters" autoComplete="new-password" minLength={8} maxLength={72} required /></label>
            <label>Confirm password<input name="confirm" type="password" placeholder="Repeat your password" autoComplete="new-password" minLength={8} maxLength={72} required /></label>
            <button type="submit" className="auth-secondary">Create account</button>
          </form>
          <p className="auth-footnote">We email a 6-digit code to confirm your address before your account is active.</p>
        </details>

        <p className="auth-footnote">By continuing, you agree to use AIBOT responsibly and keep your workspace credentials secure.</p>
      </div>
    </main>
  )
}
