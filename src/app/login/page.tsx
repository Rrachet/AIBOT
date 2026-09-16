import Link from 'next/link'
import { login } from './actions'
import { safeNextPath } from '@/lib/auth/redirect'
import { missingSupabaseEnv, visibleSupabaseEnvNames } from '@/lib/supabase/env'

const messages: Record<string, string> = {
  invalid_credentials: 'The email or password is incorrect.',
  invalid_email: 'Enter a valid email address.',
  email_taken: 'That email is already registered. Sign in instead.',
  password_too_short: 'Use a password of at least 8 characters.',
  email_not_confirmed: 'Confirm your email first. Click the link in the message we sent you.',
  signup_email_failed: 'The confirmation email could not be sent. Check the email provider settings.',
  signup_rate_limited: 'Too many signup emails have been sent recently. Wait a few minutes.',
  signup_disabled: 'New signups are turned off for this project.',
  password_rejected: 'That password was refused. Choose a longer or less common one.',
  signup_failed: 'We could not create your account. Try again in a moment.',
  configuration_error: 'This AIBOT server is not configured to sign you in yet.',
  session_not_established: 'Your credentials were accepted but the session could not be stored.',
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const error = typeof params.error === 'string' ? messages[params.error] : undefined
  const message = typeof params.message === 'string' ? params.message : undefined
  const next = safeNextPath(params.next)
  const missing = params.error === 'configuration_error' ? missingSupabaseEnv() : []
  const detail = missing.length > 0 ? ` Missing: ${missing.join(' and ')}. Supabase names visible here: ${visibleSupabaseEnvNames().join(', ') || 'none'}.` : ''

  return <main className="auth-marketing">
    <section className="auth-pitch"><Link className="auth-pitch-logo" href="/">AIBOT.</Link><div><h1>Turn leads into <span>conversations.</span></h1><p>Your AI lead conversion workspace — calling, qualification and follow-up in one workflow.</p><div className="auth-pitch-list"><span className="auth-pill">AI calling</span><span className="auth-pill">Lead qualification</span><span className="auth-pill">WhatsApp follow-up</span><span className="auth-pill">Real-time analytics</span></div></div></section>
    <section className="auth-form-side"><div className="auth-form-card"><Link className="auth-back" href="/">← Back to AIBOT</Link><h2>Welcome back</h2><p>Sign in to your AIBOT workspace.</p>{error && <div className="auth-alert-mk">{error}{detail}</div>}{message && <div className="auth-alert-mk">{message}</div>}<form action={login}><input type="hidden" name="next" value={next}/><label>Email<input name="email" type="email" placeholder="you@company.com" autoComplete="email" required/></label><label>Password<input name="password" type="password" placeholder="Your password" autoComplete="current-password" required/></label><button type="submit">Sign in →</button></form><p className="auth-switch">New to AIBOT? <Link href="/signup">Create an account</Link></p></div></section>
  </main>
}
