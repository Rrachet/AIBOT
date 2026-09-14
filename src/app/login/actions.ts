'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { SupabaseConfigError } from '@/lib/supabase/env'
import { safeNextPath } from '@/lib/auth/redirect'

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
})

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

  if (error) redirect('/login?error=invalid_credentials')

  // Credentials were accepted, so the session cookies were just written by the
  // client's cookie handler. If no session came back there is nothing to
  // persist and the redirect would land on a protected page that immediately
  // bounces back here — fail loudly instead of looping.
  if (!data.session) redirect('/login?error=session_not_established')

  // redirect() throws, so it must stay outside the try above.
  redirect(destination)
}

export async function signup(formData: FormData) {
  const parsed = credentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) redirect('/login?error=invalid_signup')

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
        full_name: text(formData.get('fullName')),
        workspace_name: text(formData.get('workspaceName')),
      },
    },
  })

  if (error) redirect('/login?error=signup_failed')

  // No session means the project requires email confirmation.
  if (!data.session) redirect('/login?message=check_email')

  redirect('/')
}
