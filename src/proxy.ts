import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

/**
 * Refreshes the Supabase session on every matched request and enforces the
 * public/protected split.
 *
 * This file MUST sit next to the `app` directory. Because this project keeps
 * the app at `src/app`, that means `src/proxy.ts` — the same file at the
 * project root is silently ignored: it compiles, no entry is added to
 * middleware-manifest.json, and it never executes, which leaves every route
 * unauthenticated. That is exactly what happened here before this change.
 *
 * Protection deliberately does not rest on this file alone. Pages are also
 * guarded during render by `requireUser()` and API routes by `requireAuth()`,
 * either of which protects a route on its own. Redirecting an already
 * authenticated visitor away from /login is the one behaviour only this
 * file provides.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
