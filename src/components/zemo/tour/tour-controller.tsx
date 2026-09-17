'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { trackTour } from './tour-analytics';
import { TourHighlight, useTargetRect, type Rect } from './tour-highlight';
import { TourTooltip } from './tour-tooltip';
import type { ZemoTourStep } from './tour-steps';
import type { ZemoGaze } from '../zemo-avatar';

/**
 * Runs a tour.
 *
 * Owns four things that are easy to get wrong:
 *
 *   Navigation. A step names a route; if the person is not on it, the tour
 *   pushes them there and waits for the target to actually exist before
 *   pointing at it. It navigates by the app's own router, so every route it
 *   opens goes through the same auth the person would hit by clicking — the
 *   tour has no privileged path to anything.
 *
 *   The Space key. Space is the fastest way through, and also the key that
 *   presses focused buttons, ticks checkboxes and scrolls the page. It is only
 *   claimed when none of those is what the person meant.
 *
 *   Click gating. Some steps ask the person to press the real control. The
 *   tour waits, and if they click elsewhere it says so gently once rather than
 *   blocking the interface.
 *
 *   Where Zemo stands. It moves to the side of the viewport the target is not
 *   on, and looks toward it.
 */

export type TourAnchor = 'left' | 'right';

export interface TourRun {
  /** Where the rim presence should sit while the tour is running. */
  anchor: TourAnchor;
  gaze: ZemoGaze;
  /** Full-viewport dimming and ring. Rendered at the top level. */
  shade: React.ReactNode;
  /**
   * What Zemo is saying. Rendered *inside* the rim container, which is what
   * positions it — on its own the card is an ordinary block element, and
   * rendering it beside the shade dropped it at the foot of the document.
   */
  card: React.ReactNode;
}

/** Does the person's current keypress belong to something else? */
function spaceIsSpokenFor(): boolean {
  const active = document.activeElement;
  if (!active || active === document.body) return false;

  if (
    active instanceof HTMLInputElement ||
    active instanceof HTMLTextAreaElement ||
    active instanceof HTMLSelectElement
  ) {
    return true;
  }
  if (active instanceof HTMLElement && active.isContentEditable) return true;

  // A focused button, link or anything else that treats Space as activation.
  // The tour's own Next button is exempt — pressing Space there should advance
  // rather than do nothing.
  if (active instanceof HTMLElement) {
    if (active.closest('.tour-card')) return false;
    const tag = active.tagName;
    if (tag === 'BUTTON' || tag === 'A' || tag === 'SUMMARY') return true;
    if (active.getAttribute('role') === 'button') return true;
    if (active.hasAttribute('tabindex')) return true;
  }

  return false;
}

export function useTourRun({
  steps,
  active,
  startIndex,
  onStep,
  onFinish,
  onExit,
}: {
  steps: readonly ZemoTourStep[];
  active: boolean;
  startIndex: number;
  onStep: (step: ZemoTourStep, index: number) => void;
  onFinish: () => void;
  onExit: () => void;
}): TourRun | null {
  const router = useRouter();
  const pathname = usePathname() ?? '/';
  const [index, setIndex] = useState(startIndex);
  const [missed, setMissed] = useState(false);
  const missedTimer = useRef<number | null>(null);

  const step = steps[index];
  const waiting = step?.action === 'click';

  // Seed the index on the transition into a run, not on every change of
  // `startIndex` — that value is also written as the tour progresses, and
  // reacting to it would pin the tour to whichever step it last saved.
  const wasActive = useRef(false);
  useEffect(() => {
    if (active && !wasActive.current) {
      setIndex(startIndex);
      const first = steps[startIndex];
      if (first) onStep(first, startIndex);
    }
    wasActive.current = active;
  }, [active, startIndex, steps, onStep]);

  /**
   * Take the person to the step's route — once per step, and never again.
   *
   * Re-asserting the route whenever the path changes turns the tour into a
   * trap: someone who wanders off mid-tour gets dragged straight back, over
   * and over, and no page but the tour's own will render. Navigating exactly
   * once when the step changes gives the tour its guidance without taking the
   * browser away from the person using it.
   */
  const navigatedFor = useRef<number | null>(null);
  useEffect(() => {
    if (!active) {
      navigatedFor.current = null;
      return;
    }
    if (!step || navigatedFor.current === index) return;
    navigatedFor.current = index;
    if (pathname !== step.route) router.replace(step.route);
  }, [active, step, index, pathname, router]);

  /**
   * If they navigate somewhere the tour did not send them, the tour is over.
   *
   * The grace period matters: a click-gated step deliberately causes a
   * navigation, and the advance that follows it lands a moment later. Exiting
   * on the first mismatch would end the tour every time somebody followed an
   * instruction correctly.
   */
  useEffect(() => {
    if (!active || !step) return;
    if (pathname === step.route) return;
    if (navigatedFor.current !== index) return;

    const nextRoute = steps[index + 1]?.route;
    if (pathname === nextRoute) return;

    const timer = window.setTimeout(() => onExit(), 1200);
    return () => window.clearTimeout(timer);
  }, [active, step, index, pathname, steps, onExit]);

  const onRoute = Boolean(step) && pathname === step!.route;
  const rect = useTargetRect(active && onRoute ? (step?.target ?? null) : null, [index]);

  /**
   * Put the target somewhere it can actually be seen.
   *
   * "Visible" is not enough: Zemo's card occupies the bottom of the viewport,
   * so a target scrolled to the centre can still end up underneath it. The
   * safe area is the space above the card, measured from the card itself
   * rather than guessed at, and the target is scrolled into that.
   *
   * Only when it needs to be. Yanking the page on every step is disorienting,
   * so a target already sitting in the safe area is left exactly where it is.
   */
  useEffect(() => {
    if (!active || !onRoute || !step?.target) return;

    // One frame, so the card for this step has been laid out and measured.
    const frame = requestAnimationFrame(() => {
      const node = document.querySelector(`[data-tour="${step.target}"]`);
      if (!node) return;

      // `offsetHeight`, not the bounding rect: the card enters with a scale
      // and translate, and a rect read mid-animation reports it smaller and
      // lower than it will settle, which left the target a few pixels under it.
      const card = document.querySelector<HTMLElement>('.tour-card');
      const cardHeight = card ? card.offsetHeight : 0;
      const rimGap = 18;
      const topLimit = 84;
      const bottomLimit = Math.max(
        window.innerHeight - cardHeight - rimGap - 24,
        topLimit + 120
      );

      const box = node.getBoundingClientRect();
      if (box.top >= topLimit && box.bottom <= bottomLimit) return;

      const behaviour: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)')
        .matches
        ? 'auto'
        : 'smooth';

      // A target taller than the safe area cannot fit; show its top, which is
      // where the labels are, rather than centring it and losing both ends.
      const delta =
        box.height > bottomLimit - topLimit
          ? box.top - topLimit
          : box.bottom - bottomLimit > 0
            ? box.bottom - bottomLimit
            : box.top - topLimit;

      window.scrollBy({ top: delta, behavior: behaviour });
    });

    return () => cancelAnimationFrame(frame);
  }, [active, onRoute, step, index]);

  useEffect(() => {
    if (!active || !step) return;
    trackTour('tour_step_viewed', { step: step.id, index });
  }, [active, step, index]);

  /**
   * Move to a step.
   *
   * `onStep` is called synchronously here rather than from an effect, and that
   * ordering is load-bearing. The shell remounts on every navigation, so the
   * tour resumes from the saved step id — and if the id were written by an
   * effect it would land *after* the route change had already begun. The fresh
   * mount would then read the previous step and navigate back to it, walking
   * the tour in circles.
   */
  const goTo = useCallback(
    (next: number) => {
      const target = steps[next];
      if (target) onStep(target, next);
      setMissed(false);
      setIndex(next);
    },
    [steps, onStep]
  );

  const advance = useCallback(() => {
    if (!step) return;
    trackTour('tour_step_completed', { step: step.id, index });
    if (index >= steps.length - 1) {
      setMissed(false);
      onFinish();
      return;
    }
    goTo(index + 1);
  }, [step, index, steps.length, onFinish, goTo]);

  const back = useCallback(() => {
    goTo(Math.max(0, index - 1));
  }, [goTo, index]);

  // Click gating: the right target advances, anything else is nudged once.
  useEffect(() => {
    if (!active || !waiting || !onRoute || !step?.target) return;

    const onClick = (event: MouseEvent) => {
      const node = event.target;
      if (!(node instanceof Element)) return;
      if (node.closest('.tour-card') || node.closest('.zemo-root')) return;

      if (node.closest(`[data-tour="${step.target}"]`)) {
        // Let the real control do its job — including navigating — and
        // advance after it has.
        window.setTimeout(advance, 120);
        return;
      }

      setMissed(true);
      if (missedTimer.current) window.clearTimeout(missedTimer.current);
      missedTimer.current = window.setTimeout(() => setMissed(false), 4000);
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [active, waiting, onRoute, step, advance]);

  // Keyboard: Space advances when it is safe, Escape always leaves.
  useEffect(() => {
    if (!active) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onExit();
        return;
      }
      if (event.key !== ' ' && event.key !== 'Spacebar') return;
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      if (document.querySelector('dialog[open]')) return;
      if (spaceIsSpokenFor()) return;
      if (waiting) return;

      event.preventDefault();
      advance();
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [active, waiting, advance, onExit]);

  useEffect(
    () => () => {
      if (missedTimer.current) window.clearTimeout(missedTimer.current);
    },
    []
  );

  const placement = useMemo(() => anchorFor(rect), [rect]);

  if (!active || !step) return null;

  return {
    anchor: placement.anchor,
    gaze: step.gaze ?? placement.gaze,
    shade: <TourHighlight rect={rect} waiting={waiting} />,
    card: (
      <TourTooltip
          step={step}
          index={index}
          total={steps.length}
          mood={missed ? 'helpful' : waiting ? 'curious' : (step.mood ?? 'talking')}
          gaze={step.gaze ?? placement.gaze}
          waiting={waiting}
          missed={missed}
        onNext={advance}
        onBack={back}
        onExit={onExit}
      />
    ),
  };
}

/**
 * Stand on the opposite side from whatever is being pointed at, and look
 * toward it. With no target, default to the right-hand rim, which is where
 * Zemo lives inside the application anyway.
 */
function anchorFor(rect: Rect | null): { anchor: TourAnchor; gaze: ZemoGaze } {
  if (!rect || typeof window === 'undefined') return { anchor: 'right', gaze: 'center' };

  const centre = rect.left + rect.width / 2;
  const onLeftHalf = centre < window.innerWidth / 2;

  return onLeftHalf ? { anchor: 'right', gaze: 'left' } : { anchor: 'left', gaze: 'right' };
}
