'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ZemoAvatar, type ZemoMood } from './zemo-avatar';
import { ZemoPanel } from './zemo-panel';
import { buildContext } from './zemo-context';
import { markNudged, nudgeFor, NUDGE_DELAY_MS } from './zemo-prompts';
import {
  DemoZemoProvider,
  userMessage,
  zemoMessage,
  type ZemoMessage,
  type ZemoProvider,
} from './zemo-provider';

/**
 * Zemo's presence on the page.
 *
 * Not a round bubble pinned to one corner. Zemo rides the bottom rim and
 * drifts between three anchors — left, centre, right — depending on the page,
 * moving slowly enough to notice and rarely enough not to annoy. The anchor is
 * chosen per route so it never lands on top of the thing that route is for:
 * centre under a marketing hero, right beside a table, left where a page has a
 * right-hand rail.
 *
 * Restraint rules, all enforced here:
 *   - a nudge waits for the reader to settle, fires at most once per page per
 *     session, and never while a dialog is open or a field has focus;
 *   - proactive lines stop entirely once the panel has been opened;
 *   - opening the panel never moves the page, and closing returns focus.
 */

type Anchor = 'left' | 'center' | 'right';

/**
 * Where Zemo sits, by route.
 *
 * Centre on the marketing pages, where the content is a centred column and the
 * rim is empty. Left on the auth screens, which have no sidebar and a form on
 * the right. Right everywhere inside the application — left there would put
 * Zemo on top of the navigation, and covering the nav is the one thing a
 * floating assistant must never do.
 */
function anchorFor(route: string): Anchor {
  if (route === '/' || route === '/pricing') return 'center';
  if (route === '/login' || route === '/signup') return 'left';
  return 'right';
}

const provider: ZemoProvider = new DemoZemoProvider();

export function ZemoWidget({ userState }: { userState?: 'anonymous' | 'empty-workspace' | 'active-workspace' }) {
  const pathname = usePathname() ?? '/';
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ZemoMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [nudge, setNudge] = useState<string | null>(null);
  const [lastNudgeAt, setLastNudgeAt] = useState<number | null>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const openedOnce = useRef(false);

  const context = useMemo(
    () => buildContext(pathname, userState ? { userState } : {}),
    [pathname, userState]
  );

  const mood: ZemoMood = busy ? 'thinking' : open ? 'talking' : 'idle';

  // A nudge is an offer, not an interruption: it waits, it checks nothing else
  // has the user's attention, and it never fires twice for the same page.
  useEffect(() => {
    setNudge(null);
    if (open || openedOnce.current) return;

    const line = nudgeFor(pathname, lastNudgeAt);
    if (!line) return;

    const timer = window.setTimeout(() => {
      const active = document.activeElement;
      const typing =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        (active instanceof HTMLElement && active.isContentEditable);
      if (typing) return;
      if (document.querySelector('dialog[open]')) return;
      if (document.hidden) return;

      setNudge(line);
      setLastNudgeAt(Date.now());
      markNudged(pathname);
    }, NUDGE_DELAY_MS);

    return () => window.clearTimeout(timer);
    // `lastNudgeAt` is read at schedule time on purpose; adding it as a
    // dependency would reschedule the timer every time a nudge fires.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, open]);

  const openPanel = useCallback(() => {
    openedOnce.current = true;
    setNudge(null);
    setOpen(true);
    setMessages((current) =>
      current.length > 0 ? current : [provider.greeting(context)]
    );
  }, [context]);

  const closePanel = useCallback(() => {
    setOpen(false);
    // On mobile the launcher is display:none while the sheet is up, so it
    // cannot take focus until React has re-rendered it. One frame is enough.
    requestAnimationFrame(() => launcherRef.current?.focus());
  }, []);

  const send = useCallback(
    async (text: string) => {
      setMessages((current) => [...current, userMessage(text)]);
      setBusy(true);
      try {
        // A beat before answering. Instant replies read as a lookup table,
        // which is exactly what would make Zemo feel cheap.
        await new Promise((resolve) => setTimeout(resolve, 380));
        const reply = await provider.respond({ message: text, context, history: messages });
        setMessages((current) => [...current, ...reply.messages]);
      } finally {
        setBusy(false);
      }
    },
    [context, messages]
  );

  const onFormDone = useCallback((summary: string) => {
    setMessages((current) => [...current, zemoMessage(summary)]);
  }, []);

  const anchor = anchorFor(pathname);

  return (
    <div className={`zemo-root is-${anchor}${open ? ' is-open' : ''}`} data-zemo-open={open}>
      {nudge && !open ? (
        <button type="button" className="zemo-nudge" onClick={openPanel}>
          <ZemoAvatar size={24} mood="talking" />
          <span>{nudge}</span>
        </button>
      ) : null}

      {open ? (
        <ZemoPanel
          messages={messages}
          mood={mood}
          busy={busy}
          route={pathname}
          onSend={(text) => void send(text)}
          onSuggestion={(text) => void send(text)}
          onClose={closePanel}
          onFormDone={onFormDone}
        />
      ) : null}

      <button
        ref={launcherRef}
        type="button"
        className="zemo-launcher"
        onClick={() => (open ? closePanel() : openPanel())}
        aria-expanded={open}
        aria-label={open ? 'Close Zemo' : 'Ask Zemo'}
      >
        <ZemoAvatar size={26} mood={mood} />
        <span className="zemo-launcher-label">Ask Zemo</span>
      </button>
    </div>
  );
}
