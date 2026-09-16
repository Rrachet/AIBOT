'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { SupabaseConfigError } from '@/lib/supabase/env'
import { safeNextPath } from '@/lib/auth/redirect'

const credentialsSchema = z.object({ email: z.string().trim().email(), password: z.string().min(8).max(72) })
const signupSchema = credentialsSchema.extend({ confirm: z.string(), fullName: z.string().trim().min(1).max(120), workspaceName: z.string().trim().min(1).max(120) }).refine((value) => value.password === value.confirm, { path: ['confirm'] })

function text(value: FormDataEntryValue | null): string { return typeof value === 'string' ? value.trim() : '' }

async function siteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (configured) return configured.replace(/\/+$/, '')
  const headerList = await headers()
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host') ?? 'localhost:3000'
  const protocol = headerList.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  return `${protocol}://${host}`
}

export async function login(formData: FormData) {
  const parsed = credentialsSchema.safeParse({ email: formData.get('email'), password: formData.get('password') })
  if (!parsed.success) redirect('/login?error=invalid_credentials')

  const requested = safeNextPath(formData.get('next'))
  const destination = requested === '/' ? '/dashboard' : requested
  let supabase
  try { supabase = await createClient() } catch (error) { if (error instanceof SupabaseConfigError) redirect('/login?error=configuration_error'); throw error }
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) {
    if (/confirm/i.test(error.message)) redirect('/login?error=email_not_confirmed')
    redirect('/login?error=invalid_credentials')
  }
  if (!data.session) redirect('/login?error=session_not_established')
  redirect(destination)
}

export async function signup(formData: FormData) {
  const parsed = signupSchema.safeParse({ email: text(formData.get('email')), password: formData.get('password'), confirm: formData.get('confirm'), fullName: formData.get('fullName'), workspaceName: formData.get('workspaceName') })
  const page = formData.get('authPage') === 'signup' ? '/signup' : '/login'
  if (!parsed.success) {
    const fields = new Set(parsed.error.issues.map((issue) => String(issue.path[0])))
    if (fields.has('confirm')) redirect(`${page}?error=password_mismatch`)
    if (fields.has('password')) redirect(`${page}?error=password_too_short`)
    if (fields.has('email')) redirect(`${page}?error=invalid_email`)
    redirect(`${page}?error=invalid_signup`)
  }

  let supabase
  try { supabase = await createClient() } catch (error) { if (error instanceof SupabaseConfigError) redirect(`${page}?error=configuration_error`); throw error }
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: `${await siteOrigin()}/auth/callback`, data: { full_name: parsed.data.fullName, workspace_name: parsed.data.workspaceName } },
  })
  if (error) {
    const reason = error.message ?? ''
    console.error(`signup rejected by Supabase (status ${error.status ?? 'unknown'}): ${reason}`)
    if (error.status === 429 || /rate limit/i.test(reason)) redirect(`${page}?error=signup_rate_limited`)
    if (/sending confirmation|error sending|smtp|email address .* invalid/i.test(reason)) redirect(`${page}?error=signup_email_failed`)
    if (/signups? (not allowed|are disabled|disabled)/i.test(reason)) redirect(`${page}?error=signup_disabled`)
    if (/password/i.test(reason)) redirect(`${page}?error=password_rejected`)
    redirect(`${page}?error=signup_failed`)
  }
  if (data.session) redirect('/dashboard')
  if (data.user && (data.user.identities?.length ?? 0) === 0) redirect(`${page}?error=email_taken`)
  redirect(`${page}?message=check_email`)
}
