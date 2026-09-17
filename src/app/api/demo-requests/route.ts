import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { SupabaseConfigError } from '@/lib/supabase/env'

/**
 * Demo requests from the public site.
 *
 * The only endpoint in the product an anonymous visitor may write through, so
 * it is deliberately narrow:
 *   - insert only, and the table grants nothing else to `anon`;
 *   - the row is never read back, so a reply can leak nothing;
 *   - `source_route` records which page the request came from and nothing
 *     about the person;
 *   - one request per address per minute, which is enough to stop a stuck
 *     submit button or a bored visitor filling the table.
 *
 * The rate limit is per server instance and resets on deploy. That is the
 * right trade here: it costs no storage, and the table's own constraints are
 * what actually bound the damage.
 */

const schema = z.object({
  name: z.string().trim().min(1, 'Tell me who you are.').max(120),
  email: z.string().trim().email('That email does not look right.').max(200),
  company: z.string().trim().max(160).optional().or(z.literal('')),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  note: z.string().trim().max(1000).optional().or(z.literal('')),
  sourceRoute: z.string().trim().max(200).optional(),
})

const WINDOW_MS = 60_000
const recent = new Map<string, number>()

function rateLimited(key: string): boolean {
  const now = Date.now()

  // Opportunistic sweep: the map only ever holds addresses seen in the last
  // minute, so it cannot grow without bound.
  for (const [seen, at] of recent) {
    if (now - at > WINDOW_MS) recent.delete(seen)
  }

  const last = recent.get(key)
  if (last !== undefined && now - last < WINDOW_MS) return true
  recent.set(key, now)
  return false
}

function blank(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() } },
      { status: 400 }
    )
  }

  const email = parsed.data.email.toLowerCase()
  if (rateLimited(email)) {
    return Response.json(
      {
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: 'That one is already with us. Give it a minute before sending another.',
        },
      },
      { status: 429 }
    )
  }

  let supabase
  try {
    supabase = await createClient()
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      return Response.json(
        {
          error: {
            code: 'SUPABASE_NOT_CONFIGURED',
            message: 'The server is missing its Supabase configuration.',
          },
        },
        { status: 503 }
      )
    }
    throw error
  }

  const { error } = await supabase.from('demo_requests').insert({
    name: parsed.data.name,
    email,
    company: blank(parsed.data.company),
    phone: blank(parsed.data.phone),
    note: blank(parsed.data.note),
    source_route: blank(parsed.data.sourceRoute),
  })

  if (error) {
    // The insert is write-only by design, so there is nothing to echo back and
    // no id to return.
    return Response.json(
      { error: { code: 'DEMO_REQUEST_FAILED', message: 'We could not record that request.' } },
      { status: 500 }
    )
  }

  return Response.json({ data: { received: true } }, { status: 201 })
}
