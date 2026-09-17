'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/icons';

/**
 * The hero's artwork: one lead, walked through the product.
 *
 * Every frame is built from the application's own surfaces — the same rows,
 * badges, transcript lines and message bubble a customer sees after signing
 * in — because a picture of the real interface tells a visitor more than any
 * abstraction of it would.
 *
 * It advances on its own so the story tells itself, and the rail is a set of
 * real buttons so anyone can take it at their own pace. Autoplay stops for
 * good the moment someone chooses a step, and never starts at all under
 * reduced motion.
 */

const STEP_MS = 4200;

interface Stage {
  id: string;
  rail: string;
  title: string;
  caption: string;
  body: React.ReactNode;
}

const STAGES: Stage[] = [
  {
    id: 'lead',
    rail: 'New lead',
    title: 'A lead arrives',
    caption: 'Website form, 9:14 pm. Queued the moment it lands.',
    body: (
      <div className="mini">
        <div className="mini-row is-head">
          <span className="mini-main">Lead</span>
          <span className="mini-meta">Status</span>
        </div>
        <div className="mini-row">
          <span className="mini-avatar">KR</span>
          <span className="mini-main">
            <strong>Kavya Reddy</strong>
            <span>Website enquiry · 2BHK, Gachibowli</span>
          </span>
          <span className="badge gray">New</span>
        </div>
        <div className="mini-row">
          <span className="mini-avatar">AM</span>
          <span className="mini-main">
            <strong>Arjun Menon</strong>
            <span>Website enquiry · budget not stated</span>
          </span>
          <span className="badge gray">New</span>
        </div>
        <div className="mini-row">
          <span className="mini-avatar">SG</span>
          <span className="mini-main">
            <strong>Sanjay Gupta</strong>
            <span>Walk-in · sales office</span>
          </span>
          <span className="badge gray">New</span>
        </div>
      </div>
    ),
  },
  {
    id: 'call',
    rail: 'AI calls',
    title: 'The agent calls',
    caption: 'Your script, your questions, your product.',
    body: (
      <div className="journey-call">
        <div className="mini-row" style={{ border: 0, padding: '0 0 12px' }}>
          <span className="mini-avatar">P</span>
          <span className="mini-main">
            <strong>Priya · Skyline Homes</strong>
            <span>Calling Kavya Reddy</span>
          </span>
          <span className="badge purple">In progress</span>
        </div>
        <div className="transcript">
          <div className="transcript-line is-agent">
            <span className="transcript-speaker">Agent</span>
            <span className="transcript-text">
              Hi Kavya, this is Priya from Skyline Homes. I&rsquo;m following up on your enquiry —
              have you got a minute?
            </span>
          </div>
          <div className="transcript-line is-lead">
            <span className="transcript-speaker">Lead</span>
            <span className="transcript-text">Yes, go ahead.</span>
          </div>
          <div className="transcript-line is-agent">
            <span className="transcript-speaker">Agent</span>
            <span className="transcript-text">
              We sell 2BHK and 3BHK apartments in Gachibowli and Kondapur, ready to move in. Does
              that line up with what you&rsquo;re after?
            </span>
          </div>
          <div className="transcript-line is-lead">
            <span className="transcript-speaker">Lead</span>
            <span className="transcript-text">Broadly, yes.</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'qualified',
    rail: 'Qualified',
    title: 'An outcome, not a log',
    caption: 'Decided from the conversation, with the reason attached.',
    body: (
      <div className="journey-outcome">
        <div className="journey-outcome-head">
          <span className="badge green">Qualified</span>
          <span className="demo-tag">Demo call</span>
          <span className="mini-meta">2:25</span>
        </div>
        <p className="summary-text">
          Kavya is interested in a 2BHK in Gachibowli, budget 65–80L, looking to move within three
          months. Asked about possession timeline and parking.
        </p>
        <div className="mini">
          <div className="mini-row">
            <span className="mini-main">
              <strong>Budget range</strong>
              <span>₹65L – ₹80L</span>
            </span>
          </div>
          <div className="mini-row">
            <span className="mini-main">
              <strong>Preferred location</strong>
              <span>Gachibowli</span>
            </span>
          </div>
          <div className="mini-row">
            <span className="mini-main">
              <strong>Possession timeline</strong>
              <span>Within 3 months</span>
            </span>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'follow-up',
    rail: 'Follow-up',
    title: 'The next step is queued',
    caption: 'Written at the end of the call, not remembered later.',
    body: (
      <div className="mini">
        <div className="mini-row is-head">
          <span className="mini-main">Follow-up</span>
          <span className="mini-meta">Due</span>
        </div>
        <div className="mini-row">
          <span className="mini-avatar">KR</span>
          <span className="mini-main">
            <strong>Kavya Reddy</strong>
            <span>WhatsApp · site visit details</span>
          </span>
          <span className="mini-meta">Today, 6:00 pm</span>
        </div>
        <div className="mini-row">
          <span className="mini-avatar">MI</span>
          <span className="mini-main">
            <strong>Meera Iyer</strong>
            <span>WhatsApp · asked to be called back</span>
          </span>
          <span className="mini-meta">Tomorrow, 11:00 am</span>
        </div>
        <div className="mini-row">
          <span className="mini-avatar">RS</span>
          <span className="mini-main">
            <strong>Rahul Sharma</strong>
            <span>WhatsApp · no answer</span>
          </span>
          <span className="mini-meta">Tomorrow, 4:30 pm</span>
        </div>
      </div>
    ),
  },
  {
    id: 'whatsapp',
    rail: 'WhatsApp',
    title: 'The message writes itself',
    caption: 'From what was actually said on the call.',
    body: (
      <div className="journey-wa">
        <div className="wa-window">
          <div className="wa-bubble">
            <span className="wa-bubble-text">
              Hi Kavya 👋 Thanks for speaking with us at Skyline Homes. As discussed, here are the
              2BHK options in Gachibowli in your range, ready to move in.
              {'\n\n'}
              Shall I hold a slot for a site visit this weekend?
            </span>
            <span className="wa-bubble-time">
              Not sent
              <Icon name="clock" size={12} />
            </span>
          </div>
        </div>
        <p className="journey-wa-note">
          <span className="demo-tag">Demo / Simulated WhatsApp</span>
          Delivery needs a WhatsApp Business account. Until then it is written, queued and tracked —
          and nothing leaves your workspace.
        </p>
      </div>
    ),
  },
  {
    id: 'human',
    rail: 'Your team',
    title: 'A person picks it up',
    caption: 'With the whole conversation already in front of them.',
    body: (
      <div className="journey-handoff">
        <div className="mini-row" style={{ border: 0, padding: '0 0 14px' }}>
          <span className="mini-avatar">KR</span>
          <span className="mini-main">
            <strong>Kavya Reddy</strong>
            <span>+91 90000 10008 · Gachibowli</span>
          </span>
          <span className="badge green">Qualified</span>
        </div>
        <ul className="journey-facts">
          <li>
            <Icon name="check" size={14} />
            Wants a 2BHK, ₹65–80L, moving within three months
          </li>
          <li>
            <Icon name="check" size={14} />
            Transcript and summary on the record
          </li>
          <li>
            <Icon name="check" size={14} />
            Site visit offered, awaiting a reply
          </li>
        </ul>
        <p className="journey-handoff-note">
          Your salesperson opens one screen and already knows the budget, the area and the
          timeline. Nobody re-asks the questions the agent asked.
        </p>
      </div>
    ),
  },
];

export function LeadJourney() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef<number>(0);

  // Reduced motion means no autoplay at all — the rail is still fully usable,
  // it just never moves on its own.
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (query.matches) setPlaying(false);
  }, []);

  useEffect(() => {
    if (!playing) return;

    startedAt.current = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - startedAt.current) / STEP_MS, 1);
      setElapsed(progress);
      if (progress >= 1) {
        setIndex((current) => (current + 1) % STAGES.length);
        startedAt.current = now;
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  // Pause while the tab is hidden, so the story is not four stages further on
  // when someone comes back to it.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const choose = useCallback((next: number) => {
    setIndex(next);
    setPlaying(false);
    setElapsed(0);
  }, []);

  const stage = STAGES[index] as Stage;

  return (
    <div className="journey">
      <ul className="journey-rail">
        {STAGES.map((item, position) => (
          <li key={item.id}>
            <button
              type="button"
              className={`journey-step${position === index ? ' is-active' : ''}${
                position < index ? ' is-done' : ''
              }`}
              aria-current={position === index ? 'step' : undefined}
              onClick={() => choose(position)}
            >
              <span className="journey-dot" aria-hidden="true" />
              {item.rail}
            </button>
          </li>
        ))}
      </ul>

      <div className="journey-stage">
        <span
          className="journey-progress"
          style={{ width: playing ? `${elapsed * 100}%` : '0%' }}
          aria-hidden="true"
        />
        <div className="journey-frame" key={stage.id}>
          <div className="journey-frame-head">
            <div>
              <h2>{stage.title}</h2>
              <p>{stage.caption}</p>
            </div>
            <button
              type="button"
              className="journey-play"
              onClick={() => setPlaying((value) => !value)}
              aria-label={playing ? 'Pause the walkthrough' : 'Play the walkthrough'}
            >
              <Icon name={playing ? 'pause' : 'play'} size={12} />
              {playing ? 'Pause' : 'Play'}
            </button>
          </div>
          {stage.body}
        </div>
      </div>
    </div>
  );
}
