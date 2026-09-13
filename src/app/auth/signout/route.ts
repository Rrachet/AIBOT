import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SupabaseConfigError } from '@/lib/supabase/env'

/**
 * Ends the session server-side. `signOut()` revokes the refresh token and
 * clears the auth cookies through the server client's cookie handler, so the
 * next request has no session and the proxy sends the visitor back to /login.
 *
 * POST only: a GET would let a stray link or prefetch sign the user out.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
  } catch (error) {
    // A sign-out must never strand the user on a protected page, so an
    // unconfigured server still ends up back at the login screen.
    if (!(error instanceof SupabaseConfigError)) throw error
  }

  // 303 so the browser follows with GET after the POST.
  return NextResponse.redirect(new URL('/login', request.url), { status: 303 })
}
