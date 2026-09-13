import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseEnv } from './env'

/** Paths that must stay reachable without a session. */
function isPublicPath(pathname: string): boolean {
  return pathname === '/login' || pathname.startsWith('/auth/')
}

/** API routes answer with JSON and must never be redirected to /login. */
function isApiPath(pathname: string): boolean {
  return pathname.startsWith('/api/')
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

  // An authenticated visitor has no use for the login screen.
  if (pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}
