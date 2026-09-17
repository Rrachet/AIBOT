/**
 * The vocabulary both sides of the speech boundary share.
 *
 * It lives under `src/lib` rather than `src/server` on purpose. The server
 * decides *what should be said*; the browser decides *how it is voiced*. Those
 * two halves have to agree on a shape, and a shape either of them could not
 * import would force one of them to redeclare it — which is exactly how the two
 * ends of an abstraction drift apart.
 *
 * Nothing here knows about `window.speechSynthesis`, and nothing here knows
 * about a TTS vendor. That is the point: swapping the browser for a hosted
 * voice later is a change of provider, not a change of this file.
 */

/* -------------------------------------------------------------------------- */
/* Languages                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The languages AIBOT asks for.
 *
 * Deliberately short. These are BCP-47 tags a speech engine can actually be
 * asked for, not a list of languages the product claims to support — adding a
 * tag here is a promise that voice selection has been thought about for it.
 */
export const SPEECH_LANGUAGES = ['en-IN', 'hi-IN'] as const;

export type SpeechLanguage = (typeof SPEECH_LANGUAGES)[number];

export const SPEECH_LANGUAGE_LABEL: Record<SpeechLanguage, string> = {
  'en-IN': 'Indian English',
  'hi-IN': 'Hindi',
};

/**
 * How the conversation engine wrote the words, which is not the same question
 * as which voice reads them.
 *
 * Hinglish is the reason this type exists. It is how a great many Indian sales
 * calls are actually held — "Hi Rahul, main Frog Studios se call kar raha hoon"
 * — but no speech engine has a Hinglish voice, and pretending otherwise would
 * mean either mangling the text into one language or asking for a locale that
 * does not exist. So Hinglish is a register, not a language: the words are left
 * exactly as written and are read by whichever Indian voice was chosen.
 */
export const SPEECH_REGISTERS = ['ENGLISH', 'HINDI', 'HINGLISH'] as const;

export type SpeechRegister = (typeof SPEECH_REGISTERS)[number];

export const SPEECH_REGISTER_LABEL: Record<SpeechRegister, string> = {
  ENGLISH: 'English',
  HINDI: 'Hindi',
  HINGLISH: 'Hinglish',
};

/**
 * The language to ask a speech engine for, given how the line was written.
 *
 * `preferred` is the Indian voice the user picked. It only decides Hinglish:
 * English and Hindi lines are read in their own language whatever is selected,
 * because a Hindi line read by an English voice is not a preference, it is a
 * mistake.
 */
export function spokenLanguageFor(
  register: SpeechRegister,
  preferred: SpeechLanguage = 'en-IN'
): SpeechLanguage {
  if (register === 'ENGLISH') return 'en-IN';
  if (register === 'HINDI') return 'hi-IN';
  return preferred;
}

/* -------------------------------------------------------------------------- */
/* What is to be said                                                         */
/* -------------------------------------------------------------------------- */

/** Who is talking. A demo plays the agent; the lead's turns are the other side. */
export type SpeechSpeaker = 'AGENT' | 'LEAD';

/** One thing to say. The unit a provider is asked about. */
export interface SpeechRequest {
  text: string;
  language: SpeechLanguage;
  /**
   * A specific voice, when the caller already knows which one. Advisory: a
   * provider that has never heard of it picks its own rather than failing, and
   * reports what it actually used.
   */
  voice?: string;
}

/** One line of a planned conversation, in the order it was spoken. */
export interface SpeechUtterance {
  /** Stable within a plan, so a player can report or resume at one line. */
  id: string;
  speaker: SpeechSpeaker;
  text: string;
  language: SpeechLanguage;
  voice: string | null;
}

/**
 * Where the audio comes from.
 *
 * `client-synthesis` means there is no audio file and there never was: the
 * browser reads the text itself. `audio` means a provider produced sound that
 * can be fetched. Everything downstream branches on this rather than on the
 * provider's name, so a second client-side provider or a second hosted one
 * changes nothing.
 */
export type SpeechDelivery = 'client-synthesis' | 'audio';

/** A provider's answer: what to say, and how the audio is to be obtained. */
export interface SpeechResult {
  provider: string;
  delivery: SpeechDelivery;
  utterances: readonly SpeechUtterance[];
  /** Set only by a provider that produced audio. Null for client synthesis. */
  audioUrl: string | null;
  /**
   * True when this is a preview rather than a recording of a real call. The UI
   * keys its labelling off this, the same way a demo call is labelled — audio
   * that sounds like a phone call must never be presentable as one.
   */
  simulated: boolean;
}

/* -------------------------------------------------------------------------- */
/* Playback                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The states a player moves through.
 *
 * `loading` is real and not a nicety: a browser reports its voice list
 * asynchronously, so there is a moment between being asked to speak and
 * knowing which voice will do it.
 */
export type SpeechState = 'idle' | 'loading' | 'speaking' | 'paused' | 'complete' | 'error';

export type SpeechErrorCode =
  /** This browser has no speech synthesis at all. */
  | 'UNSUPPORTED'
  /** It has synthesis, but reports no voice that could speak this. */
  | 'NO_VOICE'
  /** The browser refused — usually because nothing the user did led to this. */
  | 'NOT_ALLOWED'
  /** Something else went wrong inside the engine. */
  | 'SYNTHESIS_FAILED';

export interface SpeechError {
  code: SpeechErrorCode;
  /** A sentence that can be shown to a person as-is. */
  message: string;
}

/**
 * How closely the voice that will speak matches the one that was asked for.
 *
 * This exists so the UI cannot accidentally lie. A browser with no Hindi voice
 * will happily speak Hindi text in an American English voice and report no
 * error at all, and the only place that fact is knowable is here.
 */
export type SpeechVoiceMatch =
  /** The exact locale, e.g. an hi-IN voice for hi-IN. */
  | 'exact'
  /** Right language, different region — an en-GB voice for en-IN. */
  | 'language'
  /** Neither; the closest thing available. */
  | 'fallback'
  /** Nothing at all. */
  | 'none';

export interface SpeechVoiceChoice {
  voiceURI: string | null;
  name: string | null;
  /** The tag the browser reports for it, which may not be what was asked for. */
  lang: string | null;
  requested: SpeechLanguage;
  match: SpeechVoiceMatch;
  /**
   * One sentence describing what will actually be heard, written to be shown
   * to a person. Never claims an Indian voice the browser does not have.
   */
  note: string;
}

/** Everything a UI needs to render the current state of playback. */
export interface SpeechStatus {
  state: SpeechState;
  /** Index of the line being spoken, or -1 when none is. */
  index: number;
  utteranceId: string | null;
  total: number;
  /** Resolved once playback starts; null before that. */
  voice: SpeechVoiceChoice | null;
  error: SpeechError | null;
}

export const IDLE_STATUS: SpeechStatus = {
  state: 'idle',
  index: -1,
  utteranceId: null,
  total: 0,
  voice: null,
  error: null,
};
