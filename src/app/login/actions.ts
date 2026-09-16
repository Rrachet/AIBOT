'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { SupabaseConfigError } from '@/lib/supabase/env'
import { safeNextPath } from '@/lib/auth/redirect'

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(72),
})

/**
 * Signup additionally requires the password twice, and carries the names that
 * the workspace bootstrap trigger reads out of user metadata.
 */
const signupSchema = credentialsSchema
  .extend({
    confirm: z.string(),
    fullName: z.string().trim().min(1).max(120),
    workspaceName: z.string().trim().min(1).max(120),
  })
  .refine((value) => value.password === value.confirm, { path: ['confirm'] })

function text(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Absolute origin used to build the confirmation link Supabase emails.
 *
 * `NEXT_PUBLIC_SITE_URL` pins it in production; otherwise it is derived from
 * the request so preview deployments and localhost work without configuration.
 * A forged Host header cannot redirect anyone anywhere, because Supabase only
 * honours redirect targets on its own allow-list.
 */
async function siteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (configured) return configured.replace(/\/+$/, '')

  const headerList = await headers()
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host') ?? 'localhost:3000'
  const protocol = headerList.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')

  return `${protocol}://${host}`
}

export async function login(formData: FormData) {
  const parsed = credentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) redirect('/login?error=invalid_credentials')

  const destination = safeNextPath(formData.get('next'))

  let supabase
  try {
    supabase = await createClient()
  } catch (error) {
    if (error instanceof SupabaseConfigError) redirect('/login?error=configuration_error')
    throw error
  }

  const { data, error } = await supabase.auth.signInWithPassword(parsed.data)

  // An account that exists but has never confirmed its email cannot sign in.
  // Point the user at the link they were already sent rather than telling them
  // their correct password is wrong.
  if (error) {
    if (/confirm/i.test(error.message)) redirect('/login?error=email_not_confirmed')
    redirect('/login?error=invalid_credentials')
  }

  // Credentials were accepted, so the session cookies were just written by the
  // client's cookie handler. If no session came back there is nothing to
  // persist and the redirect would land on a protected page that immediately
  // bounces back here — fail loudly instead of looping.
  if (!data.session) redirect('/login?error=session_not_established')

  // redirect() throws, so it must stay outside the try above.
  redirect(destination)
}

export async function signup(formData: FormData) {
  const email = text(formData.get('email'))

  const parsed = signupSchema.safeParse({
    email,
    password: formData.get('password'),
    confirm: formData.get('confirm'),
    fullName: formData.get('fullName'),
    workspaceName: formData.get('workspaceName'),
  })

  if (!parsed.success) {
    const fields = new Set(parsed.error.issues.map((issue) => String(issue.path[0])))
    if (fields.has('confirm')) redirect('/signup?error=password_mismatch')
    if (fields.has('password')) redirect('/signup?error=password_too_short')
    if (fields.has('email')) redirect('/signup?error=invalid_email')
    redirect('/signup?error=invalid_signup')
  }

  let supabase
  try {
    supabase = await createClient()
  } catch (error) {
    if (error instanceof SupabaseConfigError) redirect('/signup?error=configuration_error')
    throw error
  }

  // The workspace and the owner membership are created by the
  // on_auth_user_created_workspace trigger from this metadata. Application
  // code must not create workspaces itself, or signup would race the trigger
  // and produce duplicates.
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // Where Supabase sends the browser once it has verified the address.
      // Without it the link lands on the dashboard with an unexchanged code in
      // the URL and the user is bounced straight back to /login.
      emailRedirectTo: `${await siteOrigin()}/auth/callback`,
      data: {
        full_name: parsed.data.fullName,
        workspace_name: parsed.data.workspaceName,
      },
    },
  })

  if (error) {
    // Supabase refuses a signup in several distinct ways and a single "we could
    // not create your account" hides the one thing that says what to change.
    // The reason is logged for the operator and mapped to a message that names
    // the fix; the address and password are never logged.
    const reason = error.message ?? ''
    console.error(`signup rejected by Supabase (status ${error.status ?? 'unknown'}): ${reason}`)

    if (error.status === 429 || /rate limit/i.test(reason)) {
      redirect('/signup?error=signup_rate_limited')
    }
    if (/sending confirmation|error sending|smtp|email address .* invalid/i.test(reason)) {
      redirect('/signup?error=signup_email_failed')
    }
    if (/signups? (not allowed|are disabled|disabled)/i.test(reason)) {
      redirect('/signup?error=signup_disabled')
    }
    if (/password/i.test(reason)) {
      redirect('/signup?error=password_rejected')
    }
    redirect('/signup?error=signup_failed')
  }

  // A session here means the project has email confirmation switched off, so
  // the account is already usable and there is no link to click. This is
  // checked first: a session proves the signup succeeded, whatever else the
  // response contains.
  if (data.session) redirect('/dashboard')

  // With confirmations on, Supabase does not reveal that an address is already
  // registered: it returns a user with no identities and no session instead of
  // an error. Say so plainly rather than sending the user to wait for an email
  // that will not arrive.
  if (data.user && (data.user.identities?.length ?? 0) === 0) {
    redirect('/signup?error=email_taken')
  }

  redirect('/login?message=check_email')
}
