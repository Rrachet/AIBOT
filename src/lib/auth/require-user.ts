import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { SupabaseConfigError } from '@/lib/supabase/env'

/**
 * Server-side guard for protected pages.
 *
 * Every protected page calls this during render, so a page is protected even
 * when middleware does not run — which is the case under `next start` for a
 * Turbopack production build in Next 16.3.5. Middleware still handles session
 * refresh and the redirect on the way in; this is the guarantee underneath it.
 *
 * Identity comes from `getUser()`, which validates the token against the auth
 * server rather than trusting the cookie's contents.
 */
export async function requireUser(pathname: string): Promise<User> {
  let supabase

  try {
    supabase = await createClient()
  } catch (error) {
    if (error instanceof SupabaseConfigError) redirect('/login?error=configuration_error')
    throw error
  }

  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    redirect(`/login?next=${encodeURIComponent(pathname)}`)
  }

  return data.user
}
