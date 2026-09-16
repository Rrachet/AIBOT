/**
 * Redirect-target validation, shared by every place that accepts a `next`
 * parameter (login, email confirmation and the signup confirmation callback).
 *
 * Only same-origin absolute paths are allowed. Anything else — a protocol,
 * a protocol-relative `//host`, a backslash variant some browsers normalise
 * to `//`, or a bare word — falls back to the dashboard.
 */
export function safeNextPath(value: unknown, fallback = '/dashboard'): string {
  if (typeof value !== 'string') return fallback

  const trimmed = value.trim()
  if (trimmed === '') return fallback

  // Must be a rooted path.
  if (!trimmed.startsWith('/')) return fallback

  // `//evil.com` and `/\\evil.com` both resolve to another origin.
  if (trimmed.startsWith('//') || trimmed.startsWith('/\\')) return fallback

  // Control characters could be used to split a header.
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) return fallback

  return trimmed
}
