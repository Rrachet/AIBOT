'use client';

import { useEffect, useRef } from 'react';
import { Icon } from '@/components/icons';
import { ZemoAvatar, type ZemoGaze, type ZemoMood } from '../zemo-avatar';
import type { ZemoTourStep } from './tour-steps';

/**
 * What Zemo is saying, and how to move on.
 *
 * Deliberately not a tooltip pinned to the target: a bubble with an arrow
 * pointing at a button is the visual language of onboarding software, and it
 * has to be re-placed every time the target moves near an edge. Zemo stays on
 * the rim and talks from there, the way a person showing you around would
 * stand beside the screen rather than on top of it.
 */
export function TourTooltip({
  step,
  index,
  total,
  mood,
  gaze,
  waiting,
  missed,
  onNext,
  onBack,
  onExit,
}: {
  step: ZemoTourStep;
  index: number;
  total: number;
  mood: ZemoMood;
  gaze: ZemoGaze;
  /** True while a click-gated step waits for the person to act. */
  waiting: boolean;
  /** Set when they clicked the wrong thing; softens the prompt. */
  missed: boolean;
  onNext: () => void;
  onBack: () => void;
  onExit: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  /**
   * Take focus on every step.
   *
   * Two reasons. A screen reader needs the new instruction announced, and it
   * will not be if focus is still sitting on the button the person just
   * pressed. And a click-gated step leaves focus on a link, where the browser
   * claims the space bar — so without this, Space silently stops advancing the
   * tour the moment somebody follows an instruction.
   */
  useEffect(() => {
    cardRef.current?.focus({ preventScroll: true });
  }, [step.id]);

  return (
    <div
      ref={cardRef}
      className="tour-card"
      role="dialog"
      tabIndex={-1}
      aria-label={`Tour step ${index + 1} of ${total}`}
    >
      <div className="tour-card-head">
        <ZemoAvatar size={30} mood={mood} gaze={gaze} seed="tour" />
        <span className="tour-progress">
          Step {index + 1} of {total}
        </span>
        <button type="button" className="tour-exit" onClick={onExit}>
          Skip tour
        </button>
      </div>

      <div className="tour-card-body">
        <h2>{step.title}</h2>
        <p>{step.explanation}</p>
        {step.aside ? <p className="tour-aside">{step.aside}</p> : null}
        {missed ? (
          <p className="tour-missed" role="status">
            Almost — I&rsquo;m looking for this one.
          </p>
        ) : null}
      </div>

      <div className="tour-card-foot">
        {index > 0 ? (
          <button type="button" className="tour-back" onClick={onBack}>
            <Icon name="arrowRight" size={14} />
            Back
          </button>
        ) : (
          <span />
        )}

        {waiting ? (
          <span className="tour-waiting">
            <span className="tour-waiting-dot" aria-hidden="true" />
            {step.prompt ?? 'Your turn'}
          </span>
        ) : (
          <button type="button" className="primary-button sm" onClick={onNext}>
            {index === total - 1 ? 'Finish' : 'Next'}
            <kbd className="tour-key">Space</kbd>
          </button>
        )}
      </div>
    </div>
  );
}
