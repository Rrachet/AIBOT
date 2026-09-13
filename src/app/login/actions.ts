'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
})

export async function login(formData: FormData) {
  const parsed = credentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) redirect('/login?error=invalid_credentials')

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) redirect('/login?error=invalid_credentials')

  const next = typeof formData.get('next') === 'string' ? formData.get('next') : '/'
  const safeNext = next?.startsWith('/') && !next.startsWith('//') ? next : '/'
  redirect(safeNext)
}

export async function signup(formData: FormData) {
  const parsed = credentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) redirect('/login?error=invalid_signup')

  const supabase = await createClient()
  const fullName = typeof formData.get('fullName') === 'string' ? formData.get('fullName') : ''
  const workspaceName = typeof formData.get('workspaceName') === 'string' ? formData.get('workspaceName') : ''

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: fullName,
        workspace_name: workspaceName,
      },
    },
  })

  if (error) redirect('/login?error=signup_failed')
  if (!data.session) redirect('/login?message=check_email')

  redirect('/')
}
