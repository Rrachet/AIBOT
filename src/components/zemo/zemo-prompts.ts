import { pageContextFor } from './zemo-context';

/**
 * Proactive nudges.
 *
 * The whole design here is restraint. A nudge fires at most once per page per
 * session, never before the reader has settled, never twice in a row, and
 * never while a dialog is open or a field has focus. The widget enforces the
 * last of those; this module owns the rest.
 */

const SESSION_KEY = 'aibot-zemo-nudges';

/** How long to let someone read before offering anything. */
export const NUDGE_DELAY_MS = 11_000;

/** Minimum gap between two nudges anywhere in the session. */
export const NUDGE_COOLDOWN_MS = 90_000;

function seen(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function remember(route: string) {
  try {
    const all = seen();
    all.add(route);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify([...all]));
  } catch {
    // Not worth an exception; the nudge simply may repeat next navigation.
  }
}

/**
 * The line Zemo may offer here, or null if it has already been offered, the
 * page has none, or the cooldown has not elapsed.
 */
export function nudgeFor(route: string, lastNudgeAt: number | null): string | null {
  const page = pageContextFor(route);
  if (!page.nudge) return null;
  if (seen().has(page.route)) return null;
  if (lastNudgeAt !== null && Date.now() - lastNudgeAt < NUDGE_COOLDOWN_MS) return null;
  return page.nudge;
}

export function markNudged(route: string) {
  remember(pageContextFor(route).route);
}

/** Opening chips, so the first message is never a blank box. */
export function openingPrompts(route: string): string[] {
  const page = pageContextFor(route);
  if (page.surface === 'public') {
    return ['What does AIBOT actually do?', 'Which plan fits me?', 'Book me a demo'];
  }
  return ['What is this page for?', 'What does qualified mean?', 'How do I run a campaign?'];
}
