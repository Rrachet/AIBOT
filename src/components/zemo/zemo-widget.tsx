'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ZemoAvatar, type ZemoGaze, type ZemoMood } from './zemo-avatar';
import { ZemoPanel } from './zemo-panel';
import { buildContext, type ZemoHeard } from './zemo-context';
import { markNudged, nudgeFor, NUDGE_DELAY_MS } from './zemo-prompts';
import {
  DemoZemoProvider,
  userMessage,
  zemoMessage,
  type ZemoMessage,
  type ZemoProvider,
} from './zemo-provider';
import { allowedAction, type ZemoAction, type ZemoInputSource } from './zemo-intent';
import { useVoicePreviewState } from '@/components/speech/voice-preview-state';
import { useTourRun } from './tour/tour-controller';
import { TourDone, TourIntro } from './tour/tour-intro';
import { tourFor } from './tour/tour-steps';
import { trackTour } from './tour/tour-analytics';
import {
  fetchProgress,
  readCachedProgress,
  saveProgress,
  type TourProgress,
} from './tour/tour-state';

/**
 * Zemo's presence on the page, and the tour it runs.
 *
 * Not a round bubble pinned to one corner. Zemo rides the bottom rim and
 * drifts between anchors — left, centre, right — moving slowly enough to
 * notice and rarely enough not to annoy. During a tour the anchor is chosen
 * against whatever is being highlighted, so Zemo stands on the other side of
 * the screen from the thing it is pointing at and looks toward it.
 *
 * Restraint rules, all enforced here:
 *   - a nudge waits for the reader to settle, fires at most once per page per
 *     session, and never while a dialog is open or a field has focus;
 *   - proactive lines stop entirely once the panel has been opened;
 *   - the tour introduction appears once per person per workspace, and never
 *     again once it has been taken or dismissed;
 *   - opening the panel never moves the page, and closing returns focus.
 */

type Anchor = 'left' | 'center' | 'right';

/**
 * Where Zemo sits when no tour is running.
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

/** The public tour is offered once per browser session, not per account. */
const PUBLIC_TOUR_SEEN = 'aibot-public-tour';

export function ZemoWidget({
  userState,
  /** Present inside the application; scopes tour progress to the workspace. */
  workspaceId,
}: {
  userState?: 'anonymous' | 'empty-workspace' | 'active-workspace';
  workspaceId?: string;
}) {
  const pathname = usePathname() ?? '/';
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ZemoMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [nudge, setNudge] = useState<string | null>(null);
  const [lastNudgeAt, setLastNudgeAt] = useState<number | null>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const openedOnce = useRef(false);

  const surface: 'public' | 'app' = workspaceId ? 'app' : 'public';
  const steps = useMemo(() => tourFor(surface), [surface]);

  const [progress, setProgress] = useState<TourProgress>({ state: 'NOT_STARTED', step: null });
  const [running, setRunning] = useState(false);
  const [startIndex, setStartIndex] = useState(0);
  const [done, setDone] = useState(false);
  const resumed = useRef(false);

  /**
   * What the demo voice preview is doing, if one is open.
   *
   * A typed subscription to the store the preview publishes to — not a lookup
   * of anything on screen. The preview lives inside a modal dialog several
   * levels down the tree from here, and while that dialog is up this widget is
   * inert, so there is no path by which Zemo could have read it even if it
   * were inclined to.
   */
  const voice = useVoicePreviewState();

  /**
   * The conversation last played, kept once the dialog has closed.
   *
   * Written after render, read during it, which is what makes the handover
   * work: on the render where the preview reports itself closed this still
   * holds what it was, so Zemo can talk about the thing the person has just
   * been listening to instead of resetting to the page behind it.
   */
  const heard = useRef<ZemoHeard | null>(null);
  useEffect(() => {
    if (voice.open && voice.scenario && voice.language) {
      heard.current = { scenario: voice.scenario, language: voice.language };
    }
  }, [voice]);

  const context = useMemo(
    () =>
      buildContext(pathname, {
        ...(userState ? { userState } : {}),
        ...(voice.open ? { voice } : heard.current ? { heard: heard.current } : {}),
      }),
    [pathname, userState, voice]
  );

  // Load where this person got to. Inside the app that is a server round trip
  // keyed by user and workspace; on the public site it is a session flag,
  // because there is nobody to key it to.
  useEffect(() => {
    if (!workspaceId) {
      try {
        const seen = sessionStorage.getItem(PUBLIC_TOUR_SEEN);
        setProgress({ state: seen === 'yes' ? 'SKIPPED' : 'NOT_STARTED', step: null });
      } catch {
        setProgress({ state: 'NOT_STARTED', step: null });
      }
      return;
    }

    const cached = readCachedProgress(workspaceId);
    if (cached) setProgress(cached);

    const controller = new AbortController();
    void fetchProgress(workspaceId, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setProgress(result);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [workspaceId]);

  const record = useCallback(
    (next: TourProgress) => {
      setProgress(next);
      if (workspaceId) {
        void saveProgress(workspaceId, next);
      } else {
        try {
          sessionStorage.setItem(PUBLIC_TOUR_SEEN, 'yes');
        } catch {
          // Nothing to do; the offer may simply reappear next session.
        }
      }
    },
    [workspaceId]
  );

  // The introduction shows on one route only, so it cannot ambush someone
  // halfway through a task — the dashboard in the app, the homepage outside.
  const introRoute = surface === 'app' ? '/dashboard' : '/';
  const showIntro =
    !running && !done && !open && progress.state === 'NOT_STARTED' && pathname === introRoute;

  /**
   * Resume an interrupted run.
   *
   * The application shell — and Zemo with it — is mounted per page rather than
   * in a shared layout, so every navigation remounts this component and loses
   * whatever the tour was doing. The saved step is what carries it across:
   * each step writes its id, and a fresh mount picks the run back up exactly
   * where it was. It also means a browser reload mid-tour resumes rather than
   * starting again.
   */
  useEffect(() => {
    if (resumed.current || running || done) return;
    if (progress.state !== 'IN_PROGRESS') return;

    const index = steps.findIndex((step) => step.id === progress.step);
    const saved = index >= 0 ? steps[index] : undefined;

    // Only pick the tour back up where it left off. Somebody who reloads
    // mid-step is continuing; somebody who abandoned the tour last week and
    // has now opened Settings is not, and yanking them to a half-finished
    // tour's route would be indistinguishable from the app being broken.
    if (!saved || saved.route !== pathname) return;

    resumed.current = true;
    setStartIndex(index);
    setRunning(true);
  }, [progress.state, progress.step, running, done, steps, pathname]);

  const startTour = useCallback(() => {
    setOpen(false);
    setNudge(null);
    setDone(false);
    resumed.current = true;
    setStartIndex(0);
    setRunning(true);
    record({ state: 'IN_PROGRESS', step: steps[0]?.id ?? null });
    trackTour('tour_started', { surface });
  }, [record, steps, surface]);

  const skipTour = useCallback(() => {
    resumed.current = true;
    setRunning(false);
    setDone(false);
    record({ state: 'SKIPPED', step: null });
    // Somebody who has just declined help does not want a second offer on the
    // same page eleven seconds later. Spend this page's nudge on the refusal.
    markNudged(pathname);
    trackTour('tour_skipped', { surface });
  }, [record, surface, pathname]);

  const finishTour = useCallback(() => {
    resumed.current = true;
    setRunning(false);
    setDone(true);
    record({ state: 'COMPLETED', step: null });
    trackTour('tour_completed', { surface });
  }, [record, surface]);

  const tour = useTourRun({
    steps,
    active: running,
    startIndex,
    onStep: useCallback(
      (step) => {
        if (workspaceId) void saveProgress(workspaceId, { state: 'IN_PROGRESS', step: step.id });
      },
      [workspaceId]
    ),
    onFinish: finishTour,
    onExit: skipTour,
  });

  // Zemo can be asked to run the tour from the conversation, or from Settings.
  useEffect(() => {
    const onRequest = () => startTour();
    window.addEventListener('aibot:start-tour', onRequest);
    return () => window.removeEventListener('aibot:start-tour', onRequest);
  }, [startTour]);

  const mood: ZemoMood = busy ? 'thinking' : open || running ? 'talking' : 'idle';

  // A nudge is an offer, not an interruption: it waits, it checks nothing else
  // has the user's attention, and it never fires twice for the same page. It
  // is suppressed entirely while the tour is on screen.
  useEffect(() => {
    setNudge(null);
    if (open || running || showIntro || done || openedOnce.current) return;
    // Never over a demo. Somebody playing a conversation to a prospect does
    // not need a tap on the shoulder, and the dialog check below only catches
    // this at fire time — this catches it at schedule time as well.
    if (voice.open) return;

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
  }, [pathname, open, running, showIntro, done, voice.open]);

  const openPanel = useCallback(() => {
    openedOnce.current = true;
    setNudge(null);
    setOpen(true);
    setMessages((current) => (current.length > 0 ? current : [provider.greeting(context)]));
    trackTour('zemo_opened', { surface });
  }, [context, surface]);

  const closePanel = useCallback(() => {
    setOpen(false);
    // On mobile the launcher is display:none while the sheet is up, so it
    // cannot take focus until React has re-rendered it. One frame is enough.
    requestAnimationFrame(() => launcherRef.current?.focus());
  }, []);

  /**
   * One way in, whatever did the asking.
   *
   * `source` is carried rather than assumed so that a microphone, if one is
   * ever added, is a fourth value here and nothing else changes. It is not
   * added: nothing in this build listens to anything.
   */
  const send = useCallback(
    async (text: string, source: ZemoInputSource = 'keyboard') => {
      setMessages((current) => [...current, userMessage(text)]);
      setBusy(true);
      trackTour('zemo_question_asked', { surface });
      try {
        // A beat before answering. Instant replies read as a lookup table,
        // which is exactly what would make Zemo feel cheap.
        await new Promise((resolve) => setTimeout(resolve, 380));
        const reply = await provider.respond({ text, source, context }, messages);
        setMessages((current) => [...current, ...reply.messages]);

        // "Show me the tour" is answered by running it, not describing it —
        // they asked in words, so the offer does not need pressing twice.
        if (reply.messages.some((message) => message.action?.kind === 'start-tour')) {
          window.setTimeout(startTour, 700);
        }
      } finally {
        setBusy(false);
      }
    },
    [context, messages, startTour, surface]
  );

  /**
   * Performs an action the person pressed.
   *
   * Navigation never arrives here — it is a link, and the browser follows it.
   * What is left is the tour and asking Zemo something else, both of which
   * change nothing and can be walked away from. The allow-list is checked
   * again rather than trusted from the panel, because "it was already
   * validated upstream" is how an action model stops being one.
   */
  const perform = useCallback(
    (action: ZemoAction) => {
      if (!allowedAction(action)) return;
      if (action.kind === 'start-tour') {
        startTour();
        return;
      }
      if (action.kind === 'ask') {
        void send(action.question, 'suggestion');
      }
    },
    [send, startTour]
  );

  const onFormDone = useCallback(
    (summary: string) => {
      setMessages((current) => [...current, zemoMessage(summary)]);
      trackTour('demo_requested', { surface });
    },
    [surface]
  );

  const anchor: Anchor = tour ? tour.anchor : anchorFor(pathname);
  const gaze: ZemoGaze = tour ? tour.gaze : 'center';
  const showCard = showIntro || done || Boolean(tour);
  // Only a running tour takes the launcher away — while the tour is on, the
  // card *is* the conversation. The intro and the completion card leave it
  // alone, so somebody can still ask a question instead of taking the tour.
  const guiding = Boolean(tour);

  return (
    <>
      {tour?.shade ?? null}

      <div
        className={`zemo-root is-${anchor}${open ? ' is-open' : ''}${guiding ? ' is-guiding' : ''}`}
        data-zemo-open={open}
      >
        {tour?.card ?? null}

        {showIntro ? <TourIntro onStart={startTour} onSkip={skipTour} /> : null}

        {done ? (
          <TourDone
            surface={surface}
            onReplay={startTour}
            onClose={() => setDone(false)}
            onPrimary={() => {
              setDone(false);
              router.push(surface === 'app' ? '/campaigns' : '/signup');
            }}
          />
        ) : null}

        {nudge && !open && !showCard ? (
          <button type="button" className="zemo-nudge" onClick={openPanel}>
            <ZemoAvatar size={24} mood="talking" seed="nudge" />
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
            onSuggestion={(text) => void send(text, 'suggestion')}
            onAction={perform}
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
          <ZemoAvatar size={26} mood={mood} gaze={gaze} seed="launcher" />
          <span className="zemo-launcher-label">Ask Zemo</span>
        </button>
      </div>
    </>
  );
}
