import 'server-only';
import type {
  SpeechDelivery,
  SpeechLanguage,
  SpeechRegister,
  SpeechRequest,
  SpeechResult,
  SpeechSpeaker,
} from '@/lib/speech/speech-types';
import { DemoSpeechProvider } from './demo-speech';

/**
 * The seam between "here is what the agent said" and "here is how it sounds".
 *
 * AIBOT's conversation engine writes a call; something else has to voice it.
 * Today that something is the browser, reading the words with the voices the
 * operating system already has. Tomorrow it may be a hosted TTS service
 * returning audio files. The engine must not be able to tell the difference,
 * and specifically must never import a speech API — which is why this contract
 * exists at all rather than the call code reaching for `speechSynthesis`.
 *
 *     Conversation engine  ->  SpeechProvider  ->  DemoSpeechProvider
 *                                              ->  (later) a hosted voice
 *
 * The thing that makes that swap work is `delivery`. A demo provider answers
 * "there is no audio; here is what to say and in which language", and the
 * browser speaks it. A hosted provider answers "here is the audio". Everything
 * downstream branches on that field rather than on a provider's name, so a
 * second provider of either kind is a new file and nothing else.
 *
 * This module is server-only by import, so a component cannot accidentally pull
 * the resolver — and with it the provider configuration — into the browser
 * bundle.
 */

/** The whole of a call, rather than one line of it. */
export interface ConversationSpeechRequest {
  /** The transcript exactly as the conversation engine wrote it. */
  transcript: string | null;
  /** How those words were written: English, Hindi or Hinglish. */
  register: SpeechRegister;
  /** The Indian voice the user picked. Only decides how Hinglish is read. */
  preferredLanguage?: SpeechLanguage;
  voice?: string | null;
  /** Whose turns to voice. The agent's alone by default. */
  speakers?: readonly SpeechSpeaker[];
}

export interface SpeechProvider {
  readonly name: string;
  /**
   * How this provider's results are to be played. Fixed per provider: a
   * provider that sometimes returns audio and sometimes does not would push
   * that decision back onto every caller.
   */
  readonly delivery: SpeechDelivery;

  /** One line. */
  speak(input: SpeechRequest): Promise<SpeechResult>;

  /** A whole conversation, in the order it was spoken. */
  speakConversation(input: ConversationSpeechRequest): Promise<SpeechResult>;
}

/**
 * Resolve the configured speech provider in one place.
 *
 * With nothing configured AIBOT previews speech in the browser and contacts no
 * service. That is the default deliberately, and mirrors how the voice provider
 * behaves: a missing credential can never silently start spending money, and
 * the product is demonstrable before any TTS account exists.
 *
 * Setting SPEECH_PROVIDER to anything other than 'demo' is an explicit request
 * for a hosted provider, and fails loudly until one is implemented.
 */
export function getSpeechProvider(): SpeechProvider {
  const configured = process.env.SPEECH_PROVIDER?.trim().toLowerCase();

  if (!configured || configured === 'demo') return new DemoSpeechProvider();

  throw new Error(
    `Speech provider "${configured}" is not implemented. Unset SPEECH_PROVIDER to preview speech in the browser.`
  );
}

/** True when speech is previewed in the browser rather than synthesised by a service. */
export function isDemoSpeech(): boolean {
  const configured = process.env.SPEECH_PROVIDER?.trim().toLowerCase();
  return !configured || configured === 'demo';
}
