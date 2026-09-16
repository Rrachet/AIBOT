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
 * A value pasted through a dashboard or a shell often arrives wrapped in
 * whitespace, and a variable that exists but is blank is not configuration.
 * Both cases become "missing" rather than a URL the client cannot fetch.
 */
function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

/**
 * Reads a variable without the literal `process.env.NAME` form.
 *
 * Next replaces that exact expression at build time, so a bundle compiled
 * before the variable existed carries `undefined` forever and ignores whatever
 * the running process was given. A computed key is not replaced, so on the
 * server this reads the real environment and a deployment that was built
 * without its configuration still works once it has it.
 *
 * In the browser `process.env` holds only what was inlined, so this returns
 * nothing there and the static reads below are what count.
 */
function atRuntime(name: string): string | undefined {
  if (typeof process === 'undefined') return undefined
  return clean(process.env[name])
}

/**
 * Both key names are read so a project using the older `ANON_KEY` naming keeps
 * working, and each is referenced statically as well so Next can inline it
 * into the browser bundle.
 */
function url(): string | undefined {
  return clean(process.env.NEXT_PUBLIC_SUPABASE_URL) ?? atRuntime('NEXT_PUBLIC_SUPABASE_URL')
}

function key(): string | undefined {
  return (
    clean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ??
    clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ??
    atRuntime('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ??
    atRuntime('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  )
}

function read(): SupabaseEnv | null {
  const resolvedUrl = url()
  const resolvedKey = key()

  if (!resolvedUrl || !resolvedKey) return null
  return { url: resolvedUrl, key: resolvedKey }
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

/**
 * Names of the variables this server cannot read, for the message shown when
 * configuration is missing. Names only: no value is ever returned, logged or
 * rendered.
 */
export function missingSupabaseEnv(): string[] {
  const missing: string[] = []
  if (!url()) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!key()) missing.push('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
  return missing
}

/**
 * Supabase-related variable names this server can actually see, so a
 * misconfiguration names itself: a typo, a stray space or the wrong prefix
 * shows up here instead of looking identical to "not set at all".
 *
 * Restricted to names containing SUPABASE, so nothing else about the
 * environment is disclosed, and values are never read.
 */
export function visibleSupabaseEnvNames(): string[] {
  if (typeof process === 'undefined' || !process.env) return []
  return Object.keys(process.env)
    .filter((name) => name.toUpperCase().includes('SUPABASE'))
    .sort()
}
