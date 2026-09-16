import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SupabaseConfigError } from '@/lib/supabase/env'
import { safeNextPath } from '@/lib/auth/redirect'

/**
 * Landing point for the confirmation link Supabase emails at signup.
 *
 * The link goes to Supabase first, which verifies the address and then sends
 * the browser here with a short-lived `code`. Exchanging that code is what
 * creates the session, so an address that was never confirmed never gets one.
 *
 * The exchange uses the PKCE verifier stored as a cookie when `signUp()` ran,
 * which is why the link has to be opened in the browser that started the
 * signup. A link opened elsewhere fails here rather than silently signing the
 * wrong person in.
 *
 * The resulting session is written to the same SSR cookies the rest of the app
 * uses, by the server client's cookie handler. No token ever appears in a URL
 * or a log line: only a redirect comes back.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const next = safeNextPath(params.get('next'))

  const back = (error: string) =>
    NextResponse.redirect(new URL(`/login?error=${error}`, request.url))

  // Supabase reports a refused or malformed link by redirecting here with an
  // error instead of a code.
  if (params.get('error')) return back('confirmation_failed')

  const code = params.get('code')
  if (!code) return back('confirmation_failed')

  let supabase
  try {
    supabase = await createClient()
  } catch (error) {
    if (error instanceof SupabaseConfigError) return back('configuration_error')
    throw error
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  // A code that was already used, has expired, or was issued to a different
  // browser cannot be exchanged. The reason stays Supabase's; the message
  // tells the user what to do about it.
  if (error || !data.session) return back('confirmation_exchange_failed')

  return NextResponse.redirect(new URL(next, request.url))
}
