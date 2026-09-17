'use client';

import { ZemoAvatar } from '../zemo-avatar';

/**
 * The first hello, and the goodbye.
 *
 * Both are small cards on the rim beside Zemo rather than a full-screen modal.
 * A modal on first load says "before you may use this product, sit through
 * something"; a card beside a character says "I'm here if you want me".
 */

export function TourIntro({
  onStart,
  onSkip,
}: {
  onStart: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="tour-card is-intro" role="dialog" aria-label="Zemo">
      <div className="tour-card-body">
        <ZemoAvatar size={38} mood="talking" seed="intro" />
        <h2>Hey, I&rsquo;m Zemo.</h2>
        <p>I&rsquo;ll show you around AIBOT if you want. It takes about a minute.</p>
      </div>
      <div className="tour-card-foot is-stacked">
        <button type="button" className="primary-button sm" onClick={onStart}>
          Take the tour
        </button>
        <button type="button" className="tour-exit" onClick={onSkip}>
          Skip for now
        </button>
      </div>
      <p className="tour-footnote">You can start it again any time from Settings.</p>
    </div>
  );
}

export function TourDone({
  surface,
  onReplay,
  onClose,
  onPrimary,
}: {
  surface: 'public' | 'app';
  onReplay: () => void;
  onClose: () => void;
  onPrimary: () => void;
}) {
  return (
    <div className="tour-card is-intro" role="dialog" aria-label="Tour complete">
      <div className="tour-card-body">
        <ZemoAvatar size={38} mood="pleased" seed="done" />
        <h2>And that&rsquo;s AIBOT.</h2>
        <p>
          Leads in. Conversations happen. Follow-ups keep moving. You see what worked.
        </p>
        <p className="tour-aside">You&rsquo;re ready.</p>
      </div>
      <div className="tour-card-foot is-stacked">
        <button type="button" className="primary-button sm" onClick={onPrimary}>
          {surface === 'app' ? 'Create my first campaign' : 'Start free'}
        </button>
        <div className="tour-done-links">
          <button type="button" className="tour-exit" onClick={onClose}>
            Explore on my own
          </button>
          <button type="button" className="tour-exit" onClick={onReplay}>
            Replay tour
          </button>
        </div>
      </div>
    </div>
  );
}
