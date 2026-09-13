import { login, signup } from './actions'

const messages: Record<string, string> = {
  invalid_credentials: 'The email or password is incorrect.',
  invalid_signup: 'Use a valid email and a password with at least 8 characters.',
  signup_failed: 'We could not create your account. The email may already be registered.',
  check_email: 'Account created. Check your email to confirm your account before signing in.',
  confirmation_failed: 'That confirmation link is invalid or has expired. Request a new signup email.',
  configuration_error:
    'This AIBOT server is not configured to sign you in yet. Set the Supabase environment variables and restart it.',
  session_not_established:
    'Your credentials were accepted but the session could not be stored. Check that cookies are enabled and try again.',
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const error = typeof params.error === 'string' ? messages[params.error] : undefined
  const message = typeof params.message === 'string' ? messages[params.message] : undefined
  const next = typeof params.next === 'string' ? params.next : '/'

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
            <label>Your name<input name="fullName" type="text" placeholder="Your name" autoComplete="name" /></label>
            <label>Workspace name<input name="workspaceName" type="text" placeholder="Your company" /></label>
            <label>Email<input name="email" type="email" placeholder="you@company.com" autoComplete="email" required /></label>
            <label>Password<input name="password" type="password" placeholder="At least 8 characters" autoComplete="new-password" minLength={8} required /></label>
            <button type="submit" className="auth-secondary">Create account</button>
          </form>
        </details>

        <p className="auth-footnote">By continuing, you agree to use AIBOT responsibly and keep your workspace credentials secure.</p>
      </div>
    </main>
  )
}
