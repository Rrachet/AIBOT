'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { safeNextPath } from '@/lib/auth/redirect'

function getOrigin(headerStore: Headers) {
  const forwardedHost = headerStore.get('x-forwarded-host')?.split(',')[0]?.trim()
  const host = forwardedHost || headerStore.get('host')
  const forwardedProto = headerStore.get('x-forwarded-proto')?.split(',')[0]?.trim()
  const protocol = forwardedProto || (process.env.NODE_ENV === 'development' ? 'http' : 'https')

  if (host) return `${protocol}://${host}`

  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (configured) return configured.replace(/\/$/, '')

  return 'http://localhost:3000'
}

export async function signInWithGoogle(formData: FormData) {
  const destination = safeNextPath(formData.get('next'))
  const headerStore = await headers()
  const origin = getOrigin(headerStore)
  const callback = new URL('/auth/callback', origin)

  if (destination !== '/') callback.searchParams.set('next', destination)

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: callback.toString() },
  })

  if (error || !data.url) {
    redirect('/login?error=oauth_failed')
  }

  redirect(data.url)
}
