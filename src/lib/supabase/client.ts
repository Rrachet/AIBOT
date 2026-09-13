import { createBrowserClient } from '@supabase/ssr'
import { requireSupabaseEnv } from './env'

/**
 * Browser Supabase client. Uses the publishable key only and stores the
 * session in cookies (the @supabase/ssr default) so the server sees the same
 * session — never localStorage.
 */
export function createClient() {
  const { url, key } = requireSupabaseEnv()
  return createBrowserClient(url, key)
}
