import { chunkForSpeech } from './speech-script';
import { loadVoices, noVoice, selectVoice, speechSupported } from './speech-voices';
import {
  IDLE_STATUS,
  type SpeechError,
  type SpeechErrorCode,
  type SpeechLanguage,
  type SpeechStatus,
  type SpeechUtterance,
  type SpeechVoiceChoice,
} from './speech-types';

/**
 * Playback, kept out of the components that trigger it.
 *
 * `window.speechSynthesis` is a global with a queue, which makes it exactly the
 * kind of thing a React component should not be poking at directly: two
 * components that each call `speak()` do not produce two previews, they produce
 * one garbled overlap, and a component that unmounts mid-sentence leaves the
 * browser talking to an empty page. So the whole of it lives behind one object
 * with an owner and a lifetime.
 *
 * What this adds over the raw API:
 *
 *   A state machine. The API reports events; a UI needs to know whether it is
 *   loading, speaking, paused or finished, and which line it is on.
 *
 *   One speaker at a time. Starting a new run cancels the previous one and
 *   ignores everything still arriving from it, so a fast double-click plays the
 *   second request rather than both at once.
 *
 *   Honesty about the voice. What the browser actually found is carried in the
 *   status, so a fallback can be shown as a fallback.
 *
 *   Failure that is visible. A browser with no voices does not error, it simply
 *   stays silent; a run that never starts is reported rather than left hanging.
 */

export interface SpeechSessionOptions {
  /** 0.1–10 in the spec; around 0.95 sounds like a person on a phone. */
  rate?: number;
  pitch?: number;
  volume?: number;
  /** A specific browser voice name, when the user has chosen one. */
  preferredVoice?: string | null;
  /** Silence between turns, so two speakers do not run together. */
  gapMs?: number;
}

const DEFAULTS = { rate: 0.95, pitch: 1, volume: 1, gapMs: 260 } as const;

/**
 * How long to wait for a run to make a sound before calling it broken.
 *
 * Only armed when no voice could be resolved. A browser that reports voices is
 * given all the time it wants — some engines take a second or two to warm up,
 * and a watchdog that fires during a normal pause would be worse than no
 * watchdog at all.
 */
const SILENT_START_MS = 3000;

const MESSAGES: Record<SpeechErrorCode, string> = {
  UNSUPPORTED: 'This browser cannot read text aloud, so there is nothing to play here.',
  NO_VOICE: 'This browser has no speech voices installed, so nothing could be read aloud.',
  NOT_ALLOWED: 'The browser blocked playback. Press play again to allow it.',
  SYNTHESIS_FAILED: 'The browser stopped partway through reading this out.',
};

/** One piece of one line: what actually gets handed to the engine. */
interface Piece {
  utteranceId: string;
  index: number;
  text: string;
  language: SpeechLanguage;
  /** First piece of a line, which is when the line's index is announced. */
  opensLine: boolean;
}

export class SpeechSession {
  private readonly options: Required<Omit<SpeechSessionOptions, 'preferredVoice'>> & {
    preferredVoice: string | null;
  };

  private listeners = new Set<(status: SpeechStatus) => void>();
  private current: SpeechStatus = IDLE_STATUS;

  /**
   * Identifies the run in flight.
   *
   * Cancelling `speechSynthesis` does not unsubscribe the handlers already
   * attached to its utterances — `onend` and `onerror` still arrive, after the
   * next run has started. Every handler checks this first, so a stale event
   * cannot advance or end the run that replaced it.
   */
  private runId = 0;

  /**
   * Resolver for the `speak` call still outstanding.
   *
   * Every path out of a run has to go through it. A run that is cancelled, or
   * replaced by a newer one, is over as far as its caller is concerned — and a
   * caller left awaiting a promise that can no longer settle is a leak that
   * only shows up as a spinner that never stops.
   */
  private settle: ((status: SpeechStatus) => void) | null = null;

  private timer: ReturnType<typeof setTimeout> | null = null;
  private watchdog: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;

  constructor(options: SpeechSessionOptions = {}) {
    this.options = {
      rate: options.rate ?? DEFAULTS.rate,
      pitch: options.pitch ?? DEFAULTS.pitch,
      volume: options.volume ?? DEFAULTS.volume,
      gapMs: options.gapMs ?? DEFAULTS.gapMs,
      preferredVoice: options.preferredVoice ?? null,
    };
  }

  get status(): SpeechStatus {
    return this.current;
  }

  /** Subscribe to state changes. The returned function unsubscribes. */
  subscribe(listener: (status: SpeechStatus) => void): () => void {
    this.listeners.add(listener);
    listener(this.current);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Speaks a plan from the beginning.
   *
   * Resolves when the run reaches a terminal state — finished, cancelled or
   * failed — and never rejects. Failures are part of the status because that is
   * where a UI can render them; a rejected promise would mean every caller had
   * to handle the same four cases again.
   */
  async speak(utterances: readonly SpeechUtterance[]): Promise<SpeechStatus> {
    if (this.disposed) return this.current;

    // Whatever was talking stops before anything else happens, so two runs can
    // never be audible together, and whoever was awaiting it is released.
    this.finishPending();
    this.stopEngine();
    const run = ++this.runId;

    if (!speechSupported()) {
      return this.fail('UNSUPPORTED', utterances.length);
    }

    if (utterances.length === 0) {
      this.publish({ ...IDLE_STATUS, state: 'complete' });
      return this.current;
    }

    this.publish({
      state: 'loading',
      index: -1,
      utteranceId: null,
      total: utterances.length,
      voice: null,
      error: null,
    });

    const voices = await loadVoices();
    if (this.runId !== run || this.disposed) return this.current;

    // A plan can mix languages — an English opening with a Hindi reply — so the
    // voice is resolved per language, not once for the run.
    const chosen = new Map<SpeechLanguage, SpeechVoiceChoice>();
    for (const utterance of utterances) {
      if (chosen.has(utterance.language)) continue;
      chosen.set(
        utterance.language,
        voices.length === 0
          ? noVoice(utterance.language)
          : selectVoice(voices, utterance.language, utterance.voice ?? this.options.preferredVoice)
      );
    }

    const pieces = planPieces(utterances);
    if (pieces.length === 0) {
      this.publish({ ...IDLE_STATUS, state: 'complete', total: utterances.length });
      return this.current;
    }

    const first = chosen.get(pieces[0]!.language) ?? noVoice(pieces[0]!.language);

    this.publish({
      state: 'speaking',
      index: pieces[0]!.index,
      utteranceId: pieces[0]!.utteranceId,
      total: utterances.length,
      voice: first,
      error: null,
    });

    return new Promise<SpeechStatus>((resolve) => {
      this.settle = resolve;
      this.play(run, pieces, 0, voices, chosen, utterances.length);
    });
  }

  /** Pauses mid-sentence. Silently ignored when nothing is speaking. */
  pause(): void {
    if (!speechSupported() || this.current.state !== 'speaking') return;
    window.speechSynthesis.pause();
    this.publish({ ...this.current, state: 'paused' });
  }

  /** Picks up where `pause` left off. */
  resume(): void {
    if (!speechSupported() || this.current.state !== 'paused') return;
    window.speechSynthesis.resume();
    this.publish({ ...this.current, state: 'speaking' });
  }

  /** Stops immediately and returns to idle. Safe to call at any time. */
  cancel(): void {
    const wasRunning = this.current.state !== 'idle';
    this.runId += 1;
    this.stopEngine();
    if (wasRunning) this.publish({ ...IDLE_STATUS, total: this.current.total });
    this.finishPending();
  }

  /**
   * Releases the session for good.
   *
   * A component unmounting has to call this: the speech queue belongs to the
   * page, not to the component, so a run left alive keeps talking over whatever
   * the person navigated to.
   */
  dispose(): void {
    this.disposed = true;
    this.runId += 1;
    this.stopEngine();
    this.finishPending();
    this.listeners.clear();
  }

  /* ---------------------------------------------------------------------- */

  private play(
    run: number,
    pieces: readonly Piece[],
    at: number,
    voices: readonly SpeechSynthesisVoice[],
    chosen: ReadonlyMap<SpeechLanguage, SpeechVoiceChoice>,
    total: number
  ): void {
    if (this.runId !== run || this.disposed) return;

    const piece = pieces[at];
    if (!piece) {
      this.clearTimers();
      this.publish({
        state: 'complete',
        index: -1,
        utteranceId: null,
        total,
        voice: this.current.voice,
        error: null,
      });
      this.finishPending();
      return;
    }

    const choice = chosen.get(piece.language) ?? noVoice(piece.language);

    if (piece.opensLine) {
      this.publish({
        ...this.current,
        state: 'speaking',
        index: piece.index,
        utteranceId: piece.utteranceId,
        voice: choice,
      });
    }

    const utterance = new window.SpeechSynthesisUtterance(piece.text);
    utterance.lang = piece.language;
    utterance.rate = this.options.rate;
    utterance.pitch = this.options.pitch;
    utterance.volume = this.options.volume;

    // Only set a voice we actually found. Assigning null makes some engines
    // fall over rather than use their default.
    const voice = choice.voiceURI
      ? voices.find((candidate) => candidate.voiceURI === choice.voiceURI)
      : undefined;
    if (voice) utterance.voice = voice;

    let started = false;

    utterance.onstart = () => {
      if (this.runId !== run) return;
      started = true;
      this.clearWatchdog();
    };

    utterance.onend = () => {
      if (this.runId !== run) return;
      this.clearWatchdog();
      const gap = pieces[at + 1]?.opensLine ? this.options.gapMs : 0;
      this.timer = setTimeout(() => this.play(run, pieces, at + 1, voices, chosen, total), gap);
    };

    utterance.onerror = (event) => {
      if (this.runId !== run) return;
      this.clearWatchdog();

      // `interrupted` and `canceled` are what a deliberate stop looks like from
      // in here. Reporting those as failures would put an error on the screen
      // every time somebody pressed stop.
      const reason = (event as SpeechSynthesisErrorEvent).error;
      if (reason === 'interrupted' || reason === 'canceled') {
        this.finishPending();
        return;
      }

      // A missing voice is worth saying plainly rather than reporting as a
      // generic failure: it is the one cause the person can actually do
      // something about, and it is what an engine with an empty voice list
      // reports here — it refuses at the first utterance rather than stopping
      // partway through one.
      const missingVoice =
        choice.match === 'none' ||
        reason === 'language-unavailable' ||
        reason === 'voice-unavailable';

      this.fail(
        reason === 'not-allowed' ? 'NOT_ALLOWED' : missingVoice ? 'NO_VOICE' : 'SYNTHESIS_FAILED',
        total
      );
      this.finishPending();
    };

    // Armed only when the browser admitted to having no voice for this. A
    // silent no-op is this API's least helpful behaviour, and without this the
    // UI would sit on "speaking" forever.
    if (choice.match === 'none') {
      this.watchdog = setTimeout(() => {
        if (this.runId !== run || started) return;
        this.stopEngine();
        this.fail('NO_VOICE', total);
        this.finishPending();
      }, SILENT_START_MS);
    }

    window.speechSynthesis.speak(utterance);
  }

  /** Resolves the outstanding `speak`, if there is one. Safe to call twice. */
  private finishPending(): void {
    const settle = this.settle;
    this.settle = null;
    settle?.(this.current);
  }

  private fail(code: SpeechErrorCode, total: number): SpeechStatus {
    const error: SpeechError = { code, message: MESSAGES[code] };
    this.publish({
      state: 'error',
      index: -1,
      utteranceId: null,
      total,
      voice: this.current.voice,
      error,
    });
    return this.current;
  }

  private stopEngine(): void {
    this.clearTimers();
    if (speechSupported()) {
      // `cancel` leaves a paused engine paused on some platforms, and the next
      // `speak` then never sounds.
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
    }
  }

  private clearWatchdog(): void {
    if (this.watchdog) clearTimeout(this.watchdog);
    this.watchdog = null;
  }

  private clearTimers(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.clearWatchdog();
  }

  private publish(status: SpeechStatus): void {
    this.current = status;
    for (const listener of this.listeners) listener(status);
  }
}

/**
 * Flattens a plan into the pieces the engine is given.
 *
 * A line too long for one utterance becomes several, but keeps one index and
 * one id, so a UI highlighting "line 3" does not see it flicker through three
 * sub-steps.
 */
function planPieces(utterances: readonly SpeechUtterance[]): Piece[] {
  const pieces: Piece[] = [];

  utterances.forEach((utterance, index) => {
    const chunks = chunkForSpeech(utterance.text);
    chunks.forEach((text, chunkIndex) => {
      pieces.push({
        utteranceId: utterance.id,
        index,
        text,
        language: utterance.language,
        opensLine: chunkIndex === 0,
      });
    });
  });

  return pieces;
}
