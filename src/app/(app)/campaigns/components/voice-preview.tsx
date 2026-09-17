'use client';

import { useEffect } from 'react';
import { Icon } from '@/components/icons';
import { ZemoAvatar, type ZemoGaze, type ZemoMood } from '@/components/zemo/zemo-avatar';
import { SPEECH_LANGUAGE_LABEL, type SpeechRegister } from '@/lib/speech/speech-types';
import {
  useVoiceConversation,
  type ConversationPhase,
  type VoiceConversation,
} from '@/components/speech/use-voice-conversation';

/**
 * Hearing the call rather than only reading it.
 *
 * This is a presentation layer and nothing more. It is handed the transcript
 * the call engine wrote and the database stored, and it reads that aloud. It
 * creates nothing, changes nothing and calls no one — the words spoken are the
 * words on the screen beside it, and pressing replay plays the same
 * conversation again rather than generating another.
 *
 * Deliberately not an audio player. There is no file to scrub through: the
 * browser is speaking, turn by turn, and the thing worth showing is which turn
 * — so the shape of it is a conversation with a status, not a waveform with a
 * playhead.
 *
 * Two honesty rules run through the whole component. It says on its face that
 * this is simulated and voiced by the browser, never that a call took place.
 * And when the browser had to substitute a voice, it says which and why, rather
 * than letting "Hindi preview" stand over an American accent.
 */

const PHASE_LABEL: Record<ConversationPhase, string> = {
  idle: 'Ready',
  loading: 'Preparing',
  ai: 'AI speaking',
  prospect: 'Prospect',
  paused: 'Paused',
  complete: 'Conversation complete',
  error: 'Voice unavailable',
};

const MOOD: Record<ConversationPhase, ZemoMood> = {
  idle: 'idle',
  loading: 'thinking',
  ai: 'talking',
  prospect: 'curious',
  paused: 'idle',
  complete: 'pleased',
  error: 'helpful',
};

const GAZE: Record<ConversationPhase, ZemoGaze> = {
  idle: 'center',
  loading: 'center',
  ai: 'center',
  prospect: 'right',
  paused: 'down',
  complete: 'center',
  error: 'center',
};

function clock(ms: number): string {
  const total = Math.floor(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function VoicePreview({
  transcript,
  register,
  onActiveTurn,
}: {
  transcript: string | null;
  register: SpeechRegister;
  /** Lets the transcript beside this highlight the line being spoken. */
  onActiveTurn: (id: string | null) => void;
}) {
  const conversation = useVoiceConversation({ transcript, register });
  const { phase, activeIndex, turns } = conversation;

  const active = activeIndex >= 0 ? turns[activeIndex] : undefined;
  const reported = phase === 'idle' || phase === 'complete' ? null : (active?.id ?? null);

  // Told, not read: the transcript is rendered by a sibling, and announcing the
  // line from here is what keeps the two in step without either owning the
  // other. Reported after the commit, never during render.
  useEffect(() => {
    onActiveTurn(reported);
  }, [reported, onActiveTurn]);

  useEffect(() => () => onActiveTurn(null), [onActiveTurn]);

  if (turns.length === 0) return null;

  return (
    <section className="voice-preview" aria-label="AI voice preview">
      <header className="voice-head">
        <span className="voice-tag">
          <Icon name="phone" size={12} /> AI Voice Preview
        </span>
        <span className="voice-sub">Simulated conversation · Browser voice</span>
      </header>

      {phase === 'idle' ? (
        <Ready conversation={conversation} register={register} />
      ) : (
        <Playing conversation={conversation} active={active} />
      )}
    </section>
  );
}

/** Before anything is spoken. The one place playback can begin from. */
function Ready({
  conversation,
  register,
}: {
  conversation: VoiceConversation;
  register: SpeechRegister;
}) {
  const spokenTurns = conversation.turns.filter((turn) => turn.speaker === 'AGENT').length;

  return (
    <div className="voice-ready">
      <ZemoAvatar size={34} mood="idle" gaze="center" seed="voice-preview" />
      <div className="voice-ready-copy">
        <strong>Conversation ready</strong>
        <span>
          {spokenTurns} {spokenTurns === 1 ? 'line' : 'lines'} from your agent, in{' '}
          {register === 'HINGLISH' ? 'Hinglish' : SPEECH_LANGUAGE_LABEL[conversation.language]}.
        </span>
      </div>

      {conversation.supported ? (
        <button type="button" className="primary-button voice-play" onClick={conversation.start}>
          <Icon name="phone" size={15} /> Hear AI Live
        </button>
      ) : (
        <p className="voice-note" role="status">
          This browser cannot read text aloud. The transcript below is complete either way.
        </p>
      )}
    </div>
  );
}

/** Once it has started: status, the line being said, and the controls. */
function Playing({
  conversation,
  active,
}: {
  conversation: VoiceConversation;
  active: { speaker: string; text: string } | undefined;
}) {
  const { phase, voice, error } = conversation;
  const speaking = phase === 'ai';

  return (
    <>
      <div className="voice-stage">
        <ZemoAvatar
          size={40}
          mood={MOOD[phase]}
          gaze={GAZE[phase]}
          // The seed never changes, so the blink cycle carries on across every
          // change of mood instead of restarting each time Zemo starts talking.
          seed="voice-preview"
        />

        <span className={`voice-status is-${phase}`} role="status">
          <span className="voice-dot" aria-hidden="true" />
          {PHASE_LABEL[phase]}
        </span>
      </div>

      {active && phase !== 'complete' && phase !== 'error' ? (
        <blockquote className={`voice-line ${active.speaker === 'AGENT' ? 'is-ai' : 'is-lead'}`}>
          <span className="voice-line-who">{active.speaker === 'AGENT' ? 'AI agent' : 'Prospect'}</span>
          <p>{active.text}</p>
        </blockquote>
      ) : null}

      {error ? (
        <p className="voice-error" role="alert">
          {error.message}
        </p>
      ) : null}

      <div className="voice-track" aria-hidden="true">
        <span className="voice-track-fill" style={{ width: `${Math.round(conversation.progress * 100)}%` }} />
      </div>

      <div className="voice-controls">
        <span className="voice-clock">{clock(conversation.elapsedMs)}</span>

        {speaking || phase === 'prospect' || phase === 'loading' ? (
          <button type="button" className="secondary-button" onClick={conversation.pause}>
            Pause
          </button>
        ) : null}

        {phase === 'paused' ? (
          <button type="button" className="secondary-button" onClick={conversation.resume}>
            Resume
          </button>
        ) : null}

        {phase === 'error' ? (
          <button type="button" className="secondary-button" onClick={conversation.replay}>
            Try again
          </button>
        ) : (
          <button type="button" className="secondary-button" onClick={conversation.replay}>
            Replay
          </button>
        )}

        {phase !== 'complete' && phase !== 'error' ? (
          <button type="button" className="secondary-button" onClick={conversation.stop}>
            Stop
          </button>
        ) : null}
      </div>

      {/* Only when it matters. An exact match needs no commentary; anything
          else is a substitution the listener would otherwise be left to work
          out from the accent. */}
      {voice && voice.match !== 'exact' ? (
        <p className="voice-note" role="status">
          {voice.note}
        </p>
      ) : null}
    </>
  );
}
