'use client';

import { useMemo } from 'react';

/**
 * Zemo.
 *
 * A pebble with a notch out of one corner — half speech bubble, half worry
 * stone — and two eyes. Not a robot, not a brain, not an orb. The notch is
 * what makes it recognisable at 20px, which is the size it usually appears at.
 *
 * Two independent dials drive the face, and nothing else about Zemo changes:
 *
 *   mood — what Zemo is doing. idle, thinking, talking, curious, pleased,
 *          helpful. Sets eye shape.
 *   gaze — where Zemo is looking. left, right, down, center. Shifts the eyes
 *          a couple of pixels, which is enough to read as attention and not
 *          enough to be creepy.
 *
 * Blinking is a single long CSS keyframe with irregular blink points and one
 * double blink, offset per instance by a stable pseudo-random delay. That
 * gives natural-looking irregularity with no JavaScript timer, no re-render
 * per blink, and nothing that can drift out of sync with itself. Reduced
 * motion switches it off through the global rule in globals.css.
 */

export type ZemoMood = 'idle' | 'thinking' | 'talking' | 'curious' | 'pleased' | 'helpful';
export type ZemoGaze = 'center' | 'left' | 'right' | 'down';

/**
 * A stable per-instance offset so two Zemos on the same page never blink in
 * lockstep. Derived from the id rather than Math.random so the server and the
 * client agree and hydration stays quiet.
 */
function blinkOffset(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  // Spread across the 13s cycle.
  return ((hash >>> 0) % 130) / 10;
}

export function ZemoAvatar({
  size = 32,
  mood = 'idle',
  gaze = 'center',
  seed,
  className,
}: {
  size?: number;
  mood?: ZemoMood;
  gaze?: ZemoGaze;
  /** Distinguishes instances so their blinks are offset from one another. */
  seed?: string;
  className?: string;
}) {
  const delay = useMemo(() => blinkOffset(seed ?? `z${size}${mood}`), [seed, size, mood]);

  return (
    <span
      className={`zemo-avatar${className ? ` ${className}` : ''}`}
      data-mood={mood}
      data-gaze={gaze}
      style={{ width: size, height: size, ['--blink-delay' as string]: `-${delay}s` }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 40 40" width={size} height={size} role="presentation">
        {/* The body. The bottom-left corner is cut short, which reads as the
            tail of a speech bubble without drawing one. */}
        <path
          className="zemo-body"
          d="M12 2h16a10 10 0 0 1 10 10v16a10 10 0 0 1-10 10H12A10 10 0 0 1 2 28V14L2 14a12 12 0 0 1 10-12z"
        />
        <g className="zemo-face">
          <rect className="zemo-eye zemo-eye-l" x="12" y="15" width="4.5" height="9" rx="2.25" />
          <rect className="zemo-eye zemo-eye-r" x="23.5" y="15" width="4.5" height="9" rx="2.25" />
        </g>
      </svg>
    </span>
  );
}
