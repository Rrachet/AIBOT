import Link from 'next/link'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { SupabaseConfigError } from '@/lib/supabase/env'
import { safeNextPath } from '@/lib/auth/redirect'
import { OtpForm } from './otp-form'

const messages: Record<string, string> = {
  invalid_code: 'That code is incorrect or has expired. Check the latest email, or send a new code.',
  invalid_code_format: 'Enter the 6-digit code from your email.',
  session_not_established:
    'Your email was verified but the session could not be stored. Check that cookies are enabled and sign in.',
  resend_failed: 'We could not send another code. Try again in a moment.',
  resend_rate_limited: 'A code was sent recently. Wait a minute before asking for another.',
  email_not_confirmed: 'Confirm your email to finish creating your account. Enter the code we sent you.',
}

/**
 * Email confirmation for a new account.
 *
 * Reached after signup, when the project requires email confirmation and the
 * account therefore has no session yet. The address is carried in the URL so a
 * failed attempt can return here without losing it; it is not a secret and it
 * grants nothing on its own, since the code still has to match.
 */
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const next = safeNextPath(params.next)

  const email = z.string().trim().email().safeParse(params.email)
  if (!email.success) redirect('/login')

  // Someone who is already signed in has nothing to confirm.
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    if (data.user) redirect(next)
  } catch (error) {
    if (error instanceof SupabaseConfigError) redirect('/login?error=configuration_error')
    throw error
  }

  const error = typeof params.error === 'string' ? messages[params.error] : undefined
  const justSent = params.sent === '1'

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">AIBOT</div>
        <div className="auth-heading">
          <h1>Verify your email</h1>
          <p>
            Enter the 6-digit code we sent to <strong>{email.data}</strong>.
          </p>
        </div>

        {error ? <div className="auth-alert auth-alert-error">{error}</div> : null}
        {justSent && !error ? (
          <div className="auth-alert auth-alert-success">
            A new code is on its way. It can take a minute to arrive.
          </div>
        ) : null}

        <OtpForm email={email.data} next={next} justSent={justSent} />

        <p className="auth-footnote">
          Wrong address? <Link href="/login">Go back and sign up again</Link>.
        </p>
      </div>
    </main>
  )
}
