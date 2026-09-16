'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { SupabaseConfigError } from '@/lib/supabase/env'
import { safeNextPath } from '@/lib/auth/redirect'

const emailSchema = z.string().trim().email()
/** Supabase issues a six-digit numeric code for email confirmation. */
const tokenSchema = z.string().trim().regex(/^\d{6}$/)

function verifyUrl(email: string, params: Record<string, string> = {}): string {
  const search = new URLSearchParams({ email, ...params })
  return `/auth/verify?${search.toString()}`
}

/**
 * Confirms a new account with the code from the signup email.
 *
 * `verifyOtp` is what establishes the session: until it succeeds the account
 * exists but cannot sign in, so there is no point at which an unverified user
 * is treated as authenticated. The session cookies are written by the server
 * client's cookie handler, exactly as they are for a password login.
 */
export async function verifyEmail(formData: FormData) {
  const emailResult = emailSchema.safeParse(formData.get('email'))
  if (!emailResult.success) redirect('/login?error=invalid_signup')

  const email = emailResult.data
  const destination = safeNextPath(formData.get('next'))

  const tokenResult = tokenSchema.safeParse(formData.get('token'))
  if (!tokenResult.success) redirect(verifyUrl(email, { error: 'invalid_code_format' }))

  let supabase
  try {
    supabase = await createClient()
  } catch (error) {
    if (error instanceof SupabaseConfigError) redirect('/login?error=configuration_error')
    throw error
  }

  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: tokenResult.data,
    type: 'signup',
  })

  // Supabase uses the same response for a wrong code and an expired one, so
  // the message covers both rather than guessing which it was.
  if (error) redirect(verifyUrl(email, { error: 'invalid_code' }))

  if (!data.session) redirect(verifyUrl(email, { error: 'session_not_established' }))

  redirect(destination)
}

/**
 * Sends a fresh confirmation code.
 *
 * Supabase enforces its own interval between sends; the cooldown in the UI
 * exists so the user is not invited to hit a limit they cannot see. When the
 * limit is hit anyway, that is reported rather than swallowed.
 */
export async function resendCode(formData: FormData) {
  const emailResult = emailSchema.safeParse(formData.get('email'))
  if (!emailResult.success) redirect('/login?error=invalid_signup')

  const email = emailResult.data

  let supabase
  try {
    supabase = await createClient()
  } catch (error) {
    if (error instanceof SupabaseConfigError) redirect('/login?error=configuration_error')
    throw error
  }

  const { error } = await supabase.auth.resend({ type: 'signup', email })

  if (error) {
    const rateLimited = error.status === 429 || /rate|seconds|too many/i.test(error.message)
    redirect(verifyUrl(email, { error: rateLimited ? 'resend_rate_limited' : 'resend_failed' }))
  }

  redirect(verifyUrl(email, { sent: '1' }))
}
