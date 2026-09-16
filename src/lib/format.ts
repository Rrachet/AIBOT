/**
 * Timestamp formatting shared by every list that shows "when".
 *
 * These live outside the resource modules because leads, calls and follow-ups
 * all need the same two labels, and a second copy would be one more place for
 * them to drift apart.
 */

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * Short relative label for a "when" column. Computed in the browser only, so
 * it cannot cause a hydration mismatch.
 */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const timestamp = Date.parse(iso)
  if (Number.isNaN(timestamp)) return '—'

  const elapsed = now - timestamp
  if (elapsed < MINUTE) return 'just now'
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)} min ago`
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)} hr ago`
  if (elapsed < 7 * DAY) {
    const days = Math.floor(elapsed / DAY)
    return days === 1 ? 'yesterday' : `${days} days ago`
  }

  return new Date(timestamp).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Full timestamp, shown on hover so the relative label stays unambiguous. */
export function formatAbsoluteTime(iso: string): string {
  const timestamp = Date.parse(iso)
  if (Number.isNaN(timestamp)) return ''
  return new Date(timestamp).toLocaleString()
}

/** Date and time for a scheduled or completed event, e.g. "12 Sep, 14:30". */
export function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  const timestamp = Date.parse(iso)
  if (Number.isNaN(timestamp)) return '—'
  return new Date(timestamp).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
