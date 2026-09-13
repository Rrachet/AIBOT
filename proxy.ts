import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/src/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  const response = await updateSession(request)
  const pathname = request.nextUrl.pathname

  if (pathname.startsWith('/api/')) {
    return response
  }

  const publicPath = pathname === '/login' || pathname.startsWith('/auth/')
  if (publicPath) {
    return response
  }

  // Let protected pages decide whether the verified claims exist. This keeps
  // the proxy focused on session refresh and avoids redirecting API requests.
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
