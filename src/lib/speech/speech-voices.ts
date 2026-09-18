import {
  SPEECH_LANGUAGE_LABEL,
  type SpeechLanguage,
  type SpeechVoiceChoice,
} from './speech-types';

/**
 * Finding a voice, and being honest about the one that was found.
 *
 * Which voices exist is decided by the operating system, not by this project:
 * a Mac has Indian English and Hindi out of the box, a stock Windows install
 * has neither, a Linux box may have nothing at all, and Chrome on Android has a
 * different set again. So nothing here names a voice. It asks for a locale,
 * takes the closest thing the browser admits to having, and — this is the part
 * that matters — records how close that actually was.
 *
 * The failure this is written against is silent, not loud. Ask a browser with
 * no Hindi voice to speak Hindi and it will not refuse: it will read the
 * Devanagari in an American English voice, fire no error, and leave the
 * interface free to claim a Hindi preview was played. `match` is what stops
 * that claim being made.
 */

/**
 * True when this browser can speak at all. Safe to call during render.
 *
 * The value is tested rather than the key. `'speechSynthesis' in window` is
 * true on a browser that declares the property and leaves it undefined, and
 * every call after that check throws.
 */
export function speechSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.speechSynthesis === 'object' &&
    window.speechSynthesis !== null &&
    typeof window.SpeechSynthesisUtterance === 'function'
  );
}

/**
 * The browser's voice list.
 *
 * Chrome populates it asynchronously and returns an empty array until it has,
 * so a single `getVoices()` on a cold page reliably finds nothing. This waits
 * for `voiceschanged`, but only briefly: a browser that genuinely has no voices
 * never fires it, and a caller left waiting forever is worse than a caller told
 * there are none.
 */
export function loadVoices(timeoutMs = 1500): Promise<SpeechSynthesisVoice[]> {
  if (!speechSupported()) return Promise.resolve([]);

  const synthesis = window.speechSynthesis;
  const ready = synthesis.getVoices();
  if (ready.length > 0) return Promise.resolve(ready);

  return new Promise((resolve) => {
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      synthesis.removeEventListener('voiceschanged', finish);
      window.clearTimeout(timer);
      resolve(synthesis.getVoices());
    };

    const timer = window.setTimeout(finish, timeoutMs);
    synthesis.addEventListener('voiceschanged', finish);
  });
}

/** `en_IN`, `EN-in` and `en-IN` are the same tag as far as a browser is concerned. */
function normalise(tag: string | null | undefined): string {
  return (tag ?? '').replace(/_/g, '-').toLowerCase();
}

/** The language half of a tag: `en-GB` -> `en`. */
function primary(tag: string | null | undefined): string {
  return normalise(tag).split('-')[0] ?? '';
}

/**
 * The browser named no voices at all.
 *
 * Kept as a named value because it is a state the UI has to render, not an
 * error to swallow — and the wording matters. An empty voice list does not mean
 * the browser cannot speak: Chromium on Linux, talking to speech-dispatcher,
 * reads text aloud perfectly well while reporting nothing from `getVoices()`.
 * Saying "nothing can be read aloud" there would be a claim contradicted by the
 * sound coming out of the speakers.
 *
 * What is actually true in that case is narrower, and is what this says: the
 * voice cannot be identified, so an Indian one cannot be promised. When the
 * browser really cannot speak, the run fails and `NO_VOICE` says so instead.
 */
export function noVoice(requested: SpeechLanguage): SpeechVoiceChoice {
  return {
    voiceURI: null,
    name: null,
    lang: null,
    requested,
    match: 'none',
    note:
      'This browser does not say which voices it has, so AIBOT cannot tell you which one ' +
      'you are hearing or promise it is Indian.',
  };
}

function describe(voice: SpeechSynthesisVoice, requested: SpeechLanguage): SpeechVoiceChoice {
  const wanted = normalise(requested);
  const has = normalise(voice.lang);

  if (has === wanted) {
    return {
      voiceURI: voice.voiceURI,
      name: voice.name,
      lang: voice.lang,
      requested,
      match: 'exact',
      note: `Using ${voice.name}, a ${SPEECH_LANGUAGE_LABEL[requested]} voice from your browser.`,
    };
  }

  if (primary(has) === primary(wanted)) {
    // Deliberately does not say "this browser has no X voice". It often does:
    // a voice tagged `hi` is a Hindi voice, it simply is not tagged `hi-IN`,
    // and a sentence claiming otherwise is contradicted by the voice's own
    // name. What is actually known is that the locale differs, so that is what
    // is said.
    return {
      voiceURI: voice.voiceURI,
      name: voice.name,
      lang: voice.lang,
      requested,
      match: 'language',
      note:
        `Using ${voice.name} (${voice.lang}) — the closest this browser has to ` +
        `${SPEECH_LANGUAGE_LABEL[requested]} (${requested}). It may not sound the way an ` +
        `Indian caller would.`,
    };
  }

  return {
    voiceURI: voice.voiceURI,
    name: voice.name,
    lang: voice.lang,
    requested,
    match: 'fallback',
    note:
      `This browser has no ${SPEECH_LANGUAGE_LABEL[requested]} voice. ${voice.name} ` +
      `(${voice.lang}) will read the words, so some of them will be mispronounced.`,
  };
}

/**
 * Picks the voice that will speak, in order of how close it is to what was
 * asked for.
 *
 *   1. The voice the caller named, if the browser has it.
 *   2. The exact locale — an `hi-IN` voice for Hindi.
 *   3. The same language elsewhere — `en-GB` for `en-IN`.
 *   4. For Hindi with no Hindi voice: an Indian English one, which at least has
 *      the right vowels for Indian names, and is a great deal closer than a
 *      default American voice.
 *   5. Whatever the browser considers its default.
 *
 * Every step below the first two is recorded as a fallback rather than being
 * presented as a success.
 */
export function selectVoice(
  voices: readonly SpeechSynthesisVoice[],
  requested: SpeechLanguage,
  preferredName?: string | null
): SpeechVoiceChoice {
  if (voices.length === 0) return noVoice(requested);

  const wanted = normalise(requested);

  if (preferredName) {
    const named = voices.find(
      (voice) => voice.name === preferredName || voice.voiceURI === preferredName
    );
    if (named) return describe(named, requested);
  }

  const exact = voices.find((voice) => normalise(voice.lang) === wanted);
  if (exact) return describe(exact, requested);

  const sameLanguage = voices.find((voice) => primary(voice.lang) === primary(wanted));
  if (sameLanguage) return describe(sameLanguage, requested);

  if (requested === 'hi-IN') {
    const indianEnglish = voices.find((voice) => normalise(voice.lang) === 'en-in');
    if (indianEnglish) return describe(indianEnglish, requested);
  }

  const fallback = voices.find((voice) => voice.default) ?? voices[0]!;
  return describe(fallback, requested);
}
