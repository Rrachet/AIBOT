import type { User } from '@supabase/supabase-js'

/**
 * Set on the user's metadata when an AIBOT password is created.
 *
 * This is a UX hint only — it decides whether to show the "create a password"
 * step, never whether a request is authorised. Authentication itself is always
 * Supabase's business.
 */
export const PASSWORD_SET_FLAG = 'aibot_password_set'

/**
 * Whether this account can sign in with an email and password.
 *
 * Two signals are checked because only one of them is guaranteed:
 *
 * - An `email` identity is the authoritative marker of a password credential,
 *   and is present for any account created through email signup.
 * - `updateUser({ password })` on an account created through OAuth sets the
 *   password on the user record; whether it also adds an `email` identity is
 *   a Supabase implementation detail. The metadata flag written alongside it
 *   guarantees the prompt is not shown twice either way.
 *
 * A user who cleared their own metadata would see the prompt again, which
 * costs them one redundant password reset and grants no access.
 */
export function hasPasswordCredential(user: User): boolean {
  const hasEmailIdentity = (user.identities ?? []).some((identity) => identity.provider === 'email')
  if (hasEmailIdentity) return true

  return user.user_metadata?.[PASSWORD_SET_FLAG] === true
}

/** Providers linked to this account, for display and diagnostics. */
export function linkedProviders(user: User): string[] {
  const fromIdentities = (user.identities ?? []).map((identity) => identity.provider)
  if (fromIdentities.length > 0) return [...new Set(fromIdentities)]

  const fromMetadata = user.app_metadata?.providers
  return Array.isArray(fromMetadata)
    ? fromMetadata.filter((provider): provider is string => typeof provider === 'string')
    : []
}
