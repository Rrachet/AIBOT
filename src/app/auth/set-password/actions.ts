'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { SupabaseConfigError } from '@/lib/supabase/env'
import { PASSWORD_SET_FLAG } from '@/lib/auth/password'
import { safeNextPath } from '@/lib/auth/redirect'

/**
 * Supabase hashes passwords with bcrypt, which ignores anything past 72 bytes,
 * so accepting more would silently truncate what the user typed.
 */
const passwordSchema = z
  .object({
    password: z.string().min(8).max(72),
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, { path: ['confirm'] })

/**
 * Adds a password to the signed-in account.
 *
 * The password is handed straight to Supabase and never stored, logged or
 * echoed back. Validation runs here on the server as well as in the browser,
 * so a bypassed form cannot set a weak one.
 */
export async function setPassword(formData: FormData) {
  const next = safeNextPath(formData.get('next'))
  const withError = (code: string) =>
    `/auth/set-password?error=${code}${next !== '/' ? `&next=${encodeURIComponent(next)}` : ''}`

  const parsed = passwordSchema.safeParse({
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  })

  if (!parsed.success) {
    const mismatch = parsed.error.issues.some((issue) => issue.path[0] === 'confirm')
    redirect(withError(mismatch ? 'password_mismatch' : 'password_invalid'))
  }

  let supabase
  try {
    supabase = await createClient()
  } catch (error) {
    if (error instanceof SupabaseConfigError) redirect('/login?error=configuration_error')
    throw error
  }

  // Only a signed-in user can reach this action; updateUser applies to the
  // session's own account and cannot name another one.
  const { data: current } = await supabase.auth.getUser()
  if (!current.user) redirect('/login?next=/auth/set-password')

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
    // Recorded so the prompt is not shown again even if Supabase does not add
    // an `email` identity for a password set on an OAuth account.
    data: { [PASSWORD_SET_FLAG]: true },
  })

  if (error) redirect(withError('password_update_failed'))

  redirect(next)
}
