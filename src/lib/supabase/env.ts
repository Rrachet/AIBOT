/**
 * Supabase environment access.
 *
 * Every Supabase client reads its configuration here so there is exactly one
 * definition of "configured". Missing configuration is an explicit, catchable
 * error rather than a silent fallback — a server that cannot verify sessions
 * must refuse requests, not serve protected pages as if the user were signed in.
 *
 * Only the publishable (anon) key is used. It is safe in the browser and is
 * subject to RLS. The secret key must never be read from this module.
 */

export class SupabaseConfigError extends Error {
  constructor() {
    super(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and ' +
        'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.'
    )
    this.name = 'SupabaseConfigError'
  }
}

export interface SupabaseEnv {
  url: string
  key: string
}

/**
 * Both names are read so a project using the older `ANON_KEY` naming keeps
 * working. Each is referenced statically so Next can inline it into the
 * browser bundle.
 */
function read(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) return null
  return { url, key }
}

/** Returns null when unconfigured, for callers that must decide what to do. */
export function getSupabaseEnv(): SupabaseEnv | null {
  return read()
}

/** Throws `SupabaseConfigError` when unconfigured. */
export function requireSupabaseEnv(): SupabaseEnv {
  const env = read()
  if (!env) throw new SupabaseConfigError()
  return env
}
