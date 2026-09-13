import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { requireSupabaseEnv } from './env'

/**
 * Server Supabase client for Server Components, Server Actions and Route
 * Handlers. Reads and writes the session through the request cookie store, so
 * the browser session and the server session are always the same session.
 *
 * Throws `SupabaseConfigError` when Supabase is not configured; callers decide
 * how to surface that.
 */
export async function createClient() {
  const cookieStore = await cookies()
  const { url, key } = requireSupabaseEnv()

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Server Components cannot write cookies. This is expected: the
          // proxy refreshes the session on every matched request, so a token
          // refreshed during rendering is persisted there instead.
          //
          // The library also hands `setAll` the no-store cache headers it
          // wants on responses that carry refreshed auth cookies. They are not
          // applied here because `cookies()` cannot set response headers; the
          // proxy applies them on the responses it returns.
        }
      },
    },
  })
}
