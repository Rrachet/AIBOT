'use client';

import { useState } from 'react';
import { Icon } from '@/components/icons';

/**
 * Restarts the product tour.
 *
 * Dispatches an event rather than holding tour state itself: the tour belongs
 * to the Zemo widget in the shell, which is mounted above this page and knows
 * how to run it. A button that owned a second copy of that state would be a
 * second thing to keep in step.
 */
export function TourRestart() {
  const [started, setStarted] = useState(false);

  return (
    <div className="form-actions">
      <button
        type="button"
        className="secondary-button"
        onClick={() => {
          setStarted(true);
          window.dispatchEvent(new CustomEvent('aibot:start-tour'));
        }}
      >
        <Icon name="play" size={15} />
        Take the product tour again
      </button>
      {started ? (
        <span className="form-saved" role="status">
          <Icon name="check" size={14} />
          Zemo is on it
        </span>
      ) : null}
    </div>
  );
}
