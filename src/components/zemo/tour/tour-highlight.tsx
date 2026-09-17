'use client';

import { useEffect, useState } from 'react';

/**
 * The spotlight.
 *
 * Four dimming panels around the target rather than one overlay with a hole
 * punched in it. That matters for a reason beyond taste: with a cut-out mask,
 * the overlay still lies on top of the target and swallows clicks, so a step
 * that asks the person to press a button would not work. Four panels leave the
 * target genuinely untouched — it is still hovering, still focusable, still
 * clickable.
 *
 * The ring itself is a separate, non-interactive element sitting over the
 * target's edge. Dimming is deliberately light: the point is to draw the eye,
 * not to black the product out.
 */

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Breathing room around the target, so the ring never clips its content. */
const PAD = 6;

export function useTargetRect(selector: string | null, deps: unknown[] = []): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    if (!selector) {
      setRect(null);
      return;
    }

    let frame = 0;
    let cancelled = false;

    const measure = () => {
      const node = document.querySelector(`[data-tour="${selector}"]`);
      if (!node) {
        setRect(null);
        return;
      }
      const box = node.getBoundingClientRect();
      setRect((current) => {
        const next = {
          top: box.top - PAD,
          left: box.left - PAD,
          width: box.width + PAD * 2,
          height: box.height + PAD * 2,
        };
        // Only re-render when the box has actually moved; the rAF loop below
        // runs constantly and setState with an equal object would thrash.
        if (
          current &&
          Math.abs(current.top - next.top) < 0.5 &&
          Math.abs(current.left - next.left) < 0.5 &&
          Math.abs(current.width - next.width) < 0.5 &&
          Math.abs(current.height - next.height) < 0.5
        ) {
          return current;
        }
        return next;
      });
    };

    // A rAF loop rather than a ResizeObserver plus a scroll listener plus a
    // mutation observer: the target can move for reasons none of those catch
    // (a sibling finishing a fetch, a CSS transition, the sidebar collapsing),
    // and one cheap read per frame is simpler than four observers that still
    // miss cases.
    const tick = () => {
      if (cancelled) return;
      measure();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selector, ...deps]);

  return rect;
}

export function TourHighlight({ rect, waiting }: { rect: Rect | null; waiting: boolean }) {
  if (!rect) {
    // No target resolved — dim nothing rather than dimming everything, so a
    // step whose element has not rendered yet never blanks the screen.
    return null;
  }

  const right = rect.left + rect.width;
  const bottom = rect.top + rect.height;

  return (
    <div className="tour-shade" aria-hidden="true">
      <div className="tour-shade-panel" style={{ inset: `0 0 auto 0`, height: Math.max(rect.top, 0) }} />
      <div
        className="tour-shade-panel"
        style={{ top: bottom, left: 0, right: 0, bottom: 0 }}
      />
      <div
        className="tour-shade-panel"
        style={{ top: rect.top, left: 0, width: Math.max(rect.left, 0), height: rect.height }}
      />
      <div
        className="tour-shade-panel"
        style={{ top: rect.top, left: right, right: 0, height: rect.height }}
      />

      <div
        className={`tour-ring${waiting ? ' is-waiting' : ''}`}
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        }}
      />
    </div>
  );
}
