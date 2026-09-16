import Link from 'next/link';
import { signup } from '../login/actions';
import { missingSupabaseEnv, visibleSupabaseEnvNames } from '@/lib/supabase/env';

const messages: Record<string, string> = {
  invalid_email: 'Enter a valid email address.', invalid_signup: 'Fill in every field.', password_too_short: 'Use a password of at least 8 characters.', password_mismatch: 'Those passwords do not match.', email_taken: 'That email is already registered. Sign in instead.', signup_failed: 'We could not create your account. Try again.', signup_email_failed: 'Your account could not be created because the confirmation email could not be sent.', signup_rate_limited: 'Too many signup emails were sent recently. Wait a few minutes.', signup_disabled: 'New signups are turned off for this project.', password_rejected: 'Choose a longer or less common password.', configuration_error: 'AIBOT is missing its Supabase configuration.', check_email: 'Account created. Check your email and click the confirmation link.',
};

export default async function SignupPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const error = typeof params.error === 'string' ? messages[params.error] : undefined;
  const message = typeof params.message === 'string' ? messages[params.message] : undefined;
  const missing = params.error === 'configuration_error' ? missingSupabaseEnv() : [];
  return <main className="auth-marketing">
    <section className="auth-pitch"><Link className="auth-pitch-logo" href="/">AIBOT.</Link><div><h1>Every lead gets <span>worked.</span></h1><p>Build an AI sales workflow that calls, understands, qualifies and follows up with your leads.</p><div className="auth-pitch-list"><span className="auth-pill">🇮🇳 Hindi + Hinglish</span><span className="auth-pill">🇺🇸 American English</span><span className="auth-pill">AI qualification</span><span className="auth-pill">WhatsApp follow-up</span></div></div></section>
    <section className="auth-form-side"><div className="auth-form-card"><Link className="auth-back" href="/">← Back to AIBOT</Link><h2>Create your workspace</h2><p>Start with your leads. No credit card required.</p>{error && <div className="auth-alert-mk">{error}{missing.length ? ` Missing: ${missing.join(', ')}.` : ''}</div>}{message && <div className="auth-alert-mk">{message}</div>}<form action={signup}><input type="hidden" name="authPage" value="signup"/><label>Your name<input name="fullName" placeholder="Your name" autoComplete="name" required/></label><label>Workspace name<input name="workspaceName" placeholder="Your company" required/></label><label>Work email<input name="email" type="email" placeholder="you@company.com" autoComplete="email" required/></label><label>Password<input name="password" type="password" placeholder="At least 8 characters" minLength={8} maxLength={72} autoComplete="new-password" required/></label><label>Confirm password<input name="confirm" type="password" placeholder="Repeat your password" minLength={8} maxLength={72} autoComplete="new-password" required/></label><button type="submit">Create workspace →</button></form><p className="auth-switch">Already have an account? <Link href="/login">Log in</Link></p><p className="auth-switch" style={{ fontSize: 11 }}>We’ll email you a confirmation link to activate your account.</p></div></section>
  </main>;
}
