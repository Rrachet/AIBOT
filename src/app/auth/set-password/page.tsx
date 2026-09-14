import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/require-user'
import { hasPasswordCredential } from '@/lib/auth/password'
import { safeNextPath } from '@/lib/auth/redirect'
import { setPassword } from './actions'

const messages: Record<string, string> = {
  password_invalid: 'Use a password of at least 8 characters (72 maximum).',
  password_mismatch: 'Those passwords do not match.',
  password_update_failed: 'We could not save that password. Try again in a moment.',
}

/**
 * Offered once, right after a first sign-in through Google, so the account is
 * not locked into a single sign-in method. An account that already has a
 * password never sees this page.
 */
export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await requireUser('/auth/set-password')
  const params = await searchParams
  const next = safeNextPath(params.next)

  if (hasPasswordCredential(user)) redirect(next)

  const error = typeof params.error === 'string' ? messages[params.error] : undefined

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">AIBOT</div>
        <div className="auth-heading">
          <h1>Create your AIBOT password</h1>
          <p>
            You signed in with Google{user.email ? ` as ${user.email}` : ''}. Adding a password lets
            you sign in with your email as well.
          </p>
        </div>

        {error ? <div className="auth-alert auth-alert-error">{error}</div> : null}

        <form className="auth-form" action={setPassword}>
          <input type="hidden" name="next" value={next} />
          <label>
            Password
            <input
              name="password"
              type="password"
              placeholder="At least 8 characters"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              required
            />
          </label>
          <label>
            Confirm password
            <input
              name="confirm"
              type="password"
              placeholder="Repeat your password"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              required
            />
          </label>
          <button type="submit" className="auth-primary">
            Save password
          </button>
        </form>

        <p className="auth-footnote">
          You can keep using Google to sign in. This password is an additional way in, not a
          replacement.
        </p>
      </div>
    </main>
  )
}
