'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { planUtterances, readTranscript } from '@/lib/speech/speech-script';
import { SpeechSession } from '@/lib/speech/speech-synthesis';
import { speechSupported } from '@/lib/speech/speech-voices';
import {
  spokenLanguageFor,
  type SpeechError,
  type SpeechLanguage,
  type SpeechRegister,
  type SpeechSpeaker,
  type SpeechVoiceChoice,
} from '@/lib/speech/speech-types';

/**
 * Plays a recorded conversation back as a conversation.
 *
 * `SpeechSession` knows how to say a list of lines. It does not know that a
 * call has two people in it, that only one of them is the AI, or that a reply
 * needs a beat of silence before it lands — and it should not, because those
 * are facts about a sales call rather than about speech. So the choreography
 * lives here:
 *
 *   the agent's turn is spoken;
 *   the prospect's turn is shown, for about as long as it would take to say,
 *   and is not spoken at all;
 *   a short gap separates them, because two turns run together stop sounding
 *   like two people.
 *
 * The prospect stays silent deliberately. Voicing them would mean putting words
 * into the mouth of a person who was never called, on a screen that is already
 * working hard to say nobody was contacted.
 *
 * Nothing here regenerates anything. The transcript handed in is the one the
 * call engine wrote and the database stored; this reads it. Replay is the same
 * conversation again, not another one.
 */

export type ConversationPhase =
  /** Nothing has been played yet, or playback was stopped. */
  | 'idle'
  /** Waiting for the browser to report its voices. */
  | 'loading'
  /** The AI is speaking. */
  | 'ai'
  /** The prospect's reply is on screen. */
  | 'prospect'
  | 'paused'
  | 'complete'
  | 'error';

export interface ConversationTurn {
  /** Matches the id of the spoken line, so the two can never drift apart. */
  id: string;
  index: number;
  speaker: SpeechSpeaker;
  text: string;
}

export interface VoiceConversation {
  phase: ConversationPhase;
  /** The turn on screen now, or -1 between runs. */
  activeIndex: number;
  turns: readonly ConversationTurn[];
  /** Which voice will actually be heard, and how close it is to the one asked for. */
  voice: SpeechVoiceChoice | null;
  language: SpeechLanguage;
  error: SpeechError | null;
  /** Seconds since playback began, for the running clock. */
  elapsedMs: number;
  /** 0 to 1 across the whole conversation. */
  progress: number;
  /** False when the browser has no speech synthesis at all. */
  supported: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  replay: () => void;
}

/** Roughly how long a line takes to say, so a reply is on screen for that long. */
function readingTimeMs(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.min(4500, Math.max(900, Math.round((words / 2.6) * 1000)));
}

/** Silence between turns. Long enough to hear, short enough not to drag. */
const TURN_GAP_MS = 420;

/** How often the pausable wait wakes up to check whether it still should be waiting. */
const TICK_MS = 100;

export function useVoiceConversation({
  transcript,
  register,
}: {
  transcript: string | null;
  register: SpeechRegister;
}): VoiceConversation {
  const turns = useMemo<ConversationTurn[]>(
    () =>
      readTranscript(transcript).map((line, index) => ({
        id: `line-${index}`,
        index,
        speaker: line.speaker,
        text: line.text,
      })),
    [transcript]
  );

  // The agent's lines, prepared for a speech engine by the same builder the
  // server uses. Ids come from the position in the whole transcript, so a turn
  // and the utterance for it are matched by construction rather than by
  // counting twice and hoping.
  const spoken = useMemo(() => {
    const plan = planUtterances(transcript, { register });
    return new Map(plan.map((utterance) => [utterance.id, utterance]));
  }, [transcript, register]);

  const [phase, setPhase] = useState<ConversationPhase>('idle');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [voice, setVoice] = useState<SpeechVoiceChoice | null>(null);
  const [error, setError] = useState<SpeechError | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  /**
   * Whether this browser can speak, decided after the first paint.
   *
   * Checking during render would answer "no" on the server and "yes" in the
   * browser, and React would report the mismatch. Assuming yes and correcting
   * costs a frame on the rare browser that cannot.
   */
  const [supported, setSupported] = useState(true);
  useEffect(() => setSupported(speechSupported()), []);

  const sessionRef = useRef<SpeechSession | null>(null);
  const runRef = useRef(0);
  const pausedRef = useRef(false);

  const session = useCallback(() => {
    // Built on first use rather than on mount: a workspace without the
    // capability never plays anything, and should not be holding a handle on
    // the browser's speech queue because a component rendered.
    sessionRef.current ??= new SpeechSession();
    return sessionRef.current;
  }, []);

  useEffect(
    () => () => {
      runRef.current += 1;
      sessionRef.current?.dispose();
      sessionRef.current = null;
    },
    []
  );

  // A new transcript is a new conversation. Anything still talking about the
  // previous one has to stop, or the voice outlives what is on screen.
  useEffect(() => {
    runRef.current += 1;
    pausedRef.current = false;
    sessionRef.current?.cancel();
    setPhase('idle');
    setActiveIndex(-1);
    setError(null);
    setElapsedMs(0);
  }, [transcript, register]);

  /** Waits, unless paused, and gives up the moment the run is superseded. */
  const wait = useCallback(async (ms: number, run: number) => {
    let left = ms;
    while (left > 0) {
      if (runRef.current !== run) return false;
      await new Promise((resolve) => setTimeout(resolve, TICK_MS));
      if (!pausedRef.current) left -= TICK_MS;
    }
    return runRef.current === run;
  }, []);

  const walk = useCallback(
    async (run: number) => {
      for (const turn of turns) {
        if (runRef.current !== run) return;
        setActiveIndex(turn.index);

        if (turn.speaker === 'AGENT') {
          const utterance = spoken.get(turn.id);
          if (utterance) {
            setPhase('ai');
            const status = await session().speak([utterance]);
            if (runRef.current !== run) return;

            setVoice(status.voice);
            if (status.state === 'error' && status.error) {
              setError(status.error);
              setPhase('error');
              return;
            }
          }
        } else {
          setPhase('prospect');
          if (!(await wait(readingTimeMs(turn.text), run))) return;
        }

        if (!(await wait(TURN_GAP_MS, run))) return;
      }

      if (runRef.current !== run) return;
      setActiveIndex(-1);
      setPhase('complete');
    },
    [turns, spoken, session, wait]
  );

  const start = useCallback(() => {
    if (turns.length === 0) return;

    // Superseding the previous run is what stops a second press producing two
    // voices: the walk checks this id at every step, and the session cancels
    // whatever it was saying.
    const run = ++runRef.current;
    pausedRef.current = false;
    setError(null);
    setElapsedMs(0);
    setVoice(null);
    setPhase('loading');
    void walk(run);
  }, [turns, walk]);

  const pause = useCallback(() => {
    if (phase !== 'ai' && phase !== 'prospect' && phase !== 'loading') return;
    pausedRef.current = true;
    sessionRef.current?.pause();
    setPhase('paused');
  }, [phase]);

  const resume = useCallback(() => {
    if (phase !== 'paused') return;
    pausedRef.current = false;
    sessionRef.current?.resume();
    // The walk restores the right phase on its next step; until then the turn
    // on screen decides which one to show.
    setPhase(turns[activeIndex]?.speaker === 'LEAD' ? 'prospect' : 'ai');
  }, [phase, turns, activeIndex]);

  const stop = useCallback(() => {
    runRef.current += 1;
    pausedRef.current = false;
    sessionRef.current?.cancel();
    setPhase('idle');
    setActiveIndex(-1);
    setElapsedMs(0);
  }, []);

  const replay = useCallback(() => {
    stop();
    start();
  }, [stop, start]);

  // The running clock. Stopped while paused, so the time shown is time spent
  // listening rather than time since the button was pressed.
  useEffect(() => {
    if (phase !== 'ai' && phase !== 'prospect' && phase !== 'loading') return;
    const started = Date.now() - elapsedMs;
    const timer = window.setInterval(() => setElapsedMs(Date.now() - started), 200);
    return () => window.clearInterval(timer);
    // `elapsedMs` is the resume point, not a dependency: reacting to it would
    // restart the interval twice a second.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const progress =
    turns.length === 0
      ? 0
      : phase === 'complete'
        ? 1
        : activeIndex < 0
          ? 0
          : (activeIndex + 1) / turns.length;

  return {
    phase,
    activeIndex,
    turns,
    voice,
    language: spokenLanguageFor(register),
    error,
    elapsedMs,
    progress,
    supported,
    start,
    pause,
    resume,
    stop,
    replay,
  };
}
