/**
 * Zemo.
 *
 * A pebble with a notch out of one corner — half speech bubble, half worry
 * stone — and two eyes. Not a robot, not a brain, not an orb. The notch is
 * what makes it recognisable at 20px, which is the size it usually appears at.
 *
 * Three moods drive the eyes and nothing else, so Zemo stays the same shape
 * whatever it is doing:
 *   idle     — blinks occasionally
 *   thinking — eyes narrow to dashes
 *   talking  — eyes widen, one brow lifts
 *
 * Everything is CSS-animated from `data-mood`, so no JavaScript runs per frame
 * and reduced-motion switches it all off through the global rule.
 */

export type ZemoMood = 'idle' | 'thinking' | 'talking';

export function ZemoAvatar({
  size = 32,
  mood = 'idle',
  className,
}: {
  size?: number;
  mood?: ZemoMood;
  className?: string;
}) {
  return (
    <span
      className={`zemo-avatar${className ? ` ${className}` : ''}`}
      data-mood={mood}
      style={{ width: size, height: size }}
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
