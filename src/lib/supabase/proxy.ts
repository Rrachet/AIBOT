import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseEnv } from './env'

/**
 * Paths that must stay reachable without a session.
 *
 * The marketing site and the two auth screens are public; everything else in
 * the application still requires one. `/` is public because it is now the
 * homepage rather than the dashboard.
 */
const PUBLIC_PATHS = new Set(['/', '/pricing', '/login', '/signup'])

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname) || pathname.startsWith('/auth/')
}

/** API routes answer with JSON and must never be redirected to /login. */
function isApiPath(pathname: string): boolean {
  return pathname.startsWith('/api/')
}

/**
 * The canonical origin this deployment should be reached on.
 *
 * Only set deliberately, via `NEXT_PUBLIC_SITE_URL`. Left unset, nothing below
 * changes behaviour, so a deployment without it keeps serving every hostname
 * it is aliased to.
 */
function canonicalOrigin(): URL | null {
  // Read both ways for the same reason `lib/supabase/env.ts` does: Next
  // replaces the literal `process.env.NAME` form at build time, so a bundle
  // compiled before the variable existed would ignore it forever. A computed
  // key is not replaced and reads the running environment.
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env['NEXT_PUBLIC_SITE_URL']?.trim()
  if (!configured) return null
  try {
    return new URL(configured)
  } catch {
    return null
  }
}

/**
 * Sends a request that arrived on a secondary hostname to the canonical one,
 * so a project with several `.vercel.app` aliases still has a single address
 * that sessions, cookies and emailed links all agree on.
 *
 * Deliberately narrow:
 * - production only, so preview deployments keep their own hostnames;
 * - safe methods only, because redirecting a Server Action across origins
 *   would fail its origin check rather than replay it;
 * - path and query preserved, so a confirmation link survives the hop.
 */
function canonicalRedirect(request: NextRequest): NextResponse | null {
  if (process.env.VERCEL_ENV !== 'production') return null
  if (request.method !== 'GET' && request.method !== 'HEAD') return null

  const canonical = canonicalOrigin()
  if (!canonical) return null

  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  if (!host || host === canonical.host) return null

  const target = new URL(request.nextUrl.pathname + request.nextUrl.search, canonical)
  return NextResponse.redirect(target, 308)
}

/**
 * Rescues a confirmation code that Supabase delivered to the site root.
 *
 * Supabase refuses an `emailRedirectTo` that is not on its allow-list and
 * silently falls back to the Site URL instead of reporting it. The code then
 * lands on `/`, is never exchanged, and the visitor is bounced to /login as
 * though the link were dead. Forwarding it to the callback makes the link work
 * and leaves the exchange exactly where it was.
 */
function strayConfirmationCode(request: NextRequest): NextResponse | null {
  if (request.method !== 'GET') return null
  if (request.nextUrl.pathname !== '/') return null

  const code = request.nextUrl.searchParams.get('code')
  if (!code) return null

  const callback = request.nextUrl.clone()
  callback.pathname = '/auth/callback'
  return NextResponse.redirect(callback)
}

function unauthenticatedJson() {
  return NextResponse.json(
    { error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } },
    { status: 401 }
  )
}

/**
 * Refreshes the Supabase session on every matched request and enforces the
 * public/protected split.
 *
 * Cookie handling follows the @supabase/ssr pattern: refreshed cookies are
 * written onto both the forwarded request (so the handler downstream sees the
 * new token) and the outgoing response (so the browser stores it). The
 * library's cache headers are applied to the response as well, which keeps a
 * response carrying rotated auth cookies out of any shared cache.
 */
export async function updateSession(request: NextRequest) {
  const canonical = canonicalRedirect(request)
  if (canonical) return canonical

  const stray = strayConfirmationCode(request)
  if (stray) return stray

  let response = NextResponse.next({ request })

  const pathname = request.nextUrl.pathname
  const isPublic = isPublicPath(pathname)
  const isApi = isApiPath(pathname)
  const env = getSupabaseEnv()

  // Fail closed. Without configuration no session can be verified, so serving
  // a protected page would show signed-in chrome to an anonymous visitor and
  // every API call behind it would fail. Public paths still render so the
  // login screen can explain the problem.
  if (!env) {
    if (isApi) {
      return NextResponse.json(
        {
          error: {
            code: 'SUPABASE_NOT_CONFIGURED',
            message: 'The server is missing its Supabase configuration.',
          },
        },
        { status: 503 }
      )
    }
    if (isPublic) return response

    const misconfigured = request.nextUrl.clone()
    misconfigured.pathname = '/login'
    misconfigured.search = ''
    misconfigured.searchParams.set('error', 'configuration_error')
    return NextResponse.redirect(misconfigured)
  }

  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value))
      },
    },
  })

  // Revalidates the token against the auth server and refreshes it when it has
  // expired, writing the rotated cookies through `setAll` above. This must run
  // before any redirect decision, and before the request reaches a handler.
  const { data, error } = await supabase.auth.getUser()
  const user = error ? null : data.user

  if (!user) {
    if (isApi) return unauthenticatedJson()
    if (isPublic) return response

    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.search = ''
    loginUrl.searchParams.set('next', pathname + request.nextUrl.search)
    return NextResponse.redirect(loginUrl)
  }

  // An authenticated visitor has no use for the sign-in screens. The homepage
  // and pricing stay reachable, because a signed-in user may still want to
  // read them.
  if (pathname === '/login' || pathname === '/signup') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}
