'use server'

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
  // Send it back to the code it was already issued rather than telling the
  // user their correct password is wrong.
  if (error) {
    if (/confirm/i.test(error.message)) {
      redirect(`/auth/verify?email=${encodeURIComponent(parsed.data.email)}&error=email_not_confirmed`)
    }
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
    if (fields.has('confirm')) redirect('/login?error=password_mismatch')
    if (fields.has('password')) redirect('/login?error=password_too_short')
    if (fields.has('email')) redirect('/login?error=invalid_email')
    redirect('/login?error=invalid_signup')
  }

  let supabase
  try {
    supabase = await createClient()
  } catch (error) {
    if (error instanceof SupabaseConfigError) redirect('/login?error=configuration_error')
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
      data: {
        full_name: parsed.data.fullName,
        workspace_name: parsed.data.workspaceName,
      },
    },
  })

  if (error) redirect('/login?error=signup_failed')

  // With confirmations on, Supabase does not reveal that an address is already
  // registered: it returns a user with no identities instead of an error. Say
  // so plainly rather than sending the user to wait for a code that will not
  // arrive.
  if (data.user && (data.user.identities?.length ?? 0) === 0) {
    redirect('/login?error=email_taken')
  }

  // A session here means the project has email confirmation switched off, so
  // the account is already usable and there is no code to enter.
  if (data.session) redirect('/')

  redirect(`/auth/verify?email=${encodeURIComponent(parsed.data.email)}&sent=1`)
}
