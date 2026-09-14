import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SupabaseConfigError } from '@/lib/supabase/env'
import { hasPasswordCredential } from '@/lib/auth/password'
import { safeNextPath } from '@/lib/auth/redirect'

/**
 * OAuth redirect target.
 *
 * The provider sends the browser here with a short-lived `code`, which is
 * exchanged for a session using the PKCE verifier the browser client stored in
 * a cookie when it started the flow. The resulting session is written to the
 * same SSR cookies the rest of the app already uses, so nothing downstream
 * needs to know the user arrived through Google.
 *
 * No token ever appears in a URL or in a log line: the code is exchanged
 * server-side and only a redirect comes back.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const next = safeNextPath(params.get('next'))

  const back = (error: string) => NextResponse.redirect(new URL(`/login?error=${error}`, request.url))

  // The provider reports a refusal (consent denied, misconfigured client) by
  // redirecting here with an error instead of a code.
  if (params.get('error')) return back('oauth_failed')

  const code = params.get('code')
  if (!code) return back('oauth_failed')

  let supabase
  try {
    supabase = await createClient()
  } catch (error) {
    if (error instanceof SupabaseConfigError) return back('configuration_error')
    throw error
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  // A code that was already used, expired, or issued for a different browser
  // cannot be exchanged. The message stays generic; the reason is Supabase's.
  if (error || !data.session) return back('oauth_exchange_failed')

  const user = data.user ?? data.session.user

  // An account created through Google has no password yet. Offer to create one
  // so the user is not locked into a single sign-in method.
  if (!hasPasswordCredential(user)) {
    const destination = new URL('/auth/set-password', request.url)
    if (next !== '/') destination.searchParams.set('next', next)
    return NextResponse.redirect(destination)
  }

  return NextResponse.redirect(new URL(next, request.url))
}
