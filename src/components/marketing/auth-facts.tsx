'use client';

import { useEffect, useState } from 'react';
import { Icon, type IconName } from '@/components/icons';

/**
 * The rotating strip on the sign-in panel.
 *
 * These describe what the product does, not what anybody's workspace contains.
 * A signed-out page cannot honestly show "9 leads worked" — whose nine? — and
 * inventing a number here would be the first thing a visitor sees and the
 * first thing that turns out to be untrue.
 */

const FACTS: { icon: IconName; text: string; lead: string }[] = [
  { icon: 'phone', lead: 'Every lead', text: 'gets a call, not a place in a queue' },
  { icon: 'target', lead: 'Every call', text: 'ends with an outcome and the reason for it' },
  { icon: 'clock', lead: 'Every no-answer', text: 'becomes a scheduled follow-up' },
  { icon: 'message', lead: 'Every follow-up', text: 'has the message already written' },
  { icon: 'chart', lead: 'Every figure', text: 'is a count of rows in your workspace' },
];

const INTERVAL_MS = 3600;

export function AuthFacts() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % FACTS.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  const fact = FACTS[index] as (typeof FACTS)[number];

  return (
    <div className="auth-facts" aria-live="off">
      {/* Keyed so React replaces the node and the entrance animation replays. */}
      <p className="auth-fact" key={index}>
        <Icon name={fact.icon} size={16} />
        <span>
          <strong>{fact.lead}</strong> {fact.text}
        </span>
      </p>
    </div>
  );
}
