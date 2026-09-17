import { planUtterances, speakableText } from '@/lib/speech/speech-script';
import type { SpeechRequest, SpeechResult } from '@/lib/speech/speech-types';
import type { ConversationSpeechRequest, SpeechProvider } from './speech-provider';

/**
 * A speech provider that produces no audio.
 *
 * It satisfies the same `SpeechProvider` contract a hosted voice will, so the
 * code above it is written once. What it returns instead of sound is a plan:
 * the lines to be spoken, in order, each tagged with the language to speak it
 * in. The browser reads that plan with `window.speechSynthesis` — voices the
 * operating system already has, no account, no key, no request leaving the
 * machine.
 *
 * The division of labour is the point, and it is not arbitrary:
 *
 *   The server decides *what is said*. It has the transcript, the campaign's
 *   configuration and the register the conversation was written in. None of
 *   that is knowable in the browser without shipping it there.
 *
 *   The browser decides *how it sounds*. Which voices exist is a property of
 *   the machine the person is sitting at, and the server cannot know it — a
 *   server that picked a voice name would be guessing.
 *
 * Unlike the resolver next door this file is not marked `server-only`. It has
 * to stay importable outside a server component so its planning can be checked
 * directly, and there is nothing in it that would be unsafe elsewhere: no
 * configuration, no secret, no I/O. The boundary that matters is on
 * `getSpeechProvider`, which is how anything reaches this class in the product.
 *
 * Safety properties, in order of importance:
 *
 * - Nothing here touches a browser API. `window` does not exist in this
 *   process, and a module that referenced it would throw on the first request
 *   rather than failing quietly, so the rule is worth stating: this file plans
 *   speech, it never performs it.
 * - No network call is made and no audio is generated, so there is no code path
 *   that could reach a paid TTS service even by mistake.
 * - Every result is stamped `simulated: true`, which is what the UI keys its
 *   labelling off. A preview must never be presentable as a recording of a real
 *   call.
 * - Given the same transcript it returns the same plan, so a demo can be
 *   rehearsed.
 */

export const DEMO_SPEECH_PROVIDER = 'demo';

export class DemoSpeechProvider implements SpeechProvider {
  readonly name = DEMO_SPEECH_PROVIDER;

  /**
   * There is no audio and there never will be from this provider. Callers read
   * this rather than comparing against `name`, so a second browser-side
   * provider would need no changes anywhere else.
   */
  readonly delivery = 'client-synthesis' as const;

  /**
   * One line, for the cases that are not a whole conversation — a greeting
   * preview while someone edits a script, say.
   */
  async speak(input: SpeechRequest): Promise<SpeechResult> {
    const text = speakableText(input.text);

    return {
      provider: this.name,
      delivery: this.delivery,
      audioUrl: null,
      simulated: true,
      utterances:
        text.length === 0
          ? []
          : [
              {
                id: 'line-0',
                speaker: 'AGENT',
                text,
                language: input.language,
                voice: input.voice ?? null,
              },
            ],
    };
  }

  /**
   * A whole call.
   *
   * The transcript is parsed rather than regenerated: the conversation that was
   * recorded is the conversation that is spoken, so what someone hears can
   * never disagree with what they are reading on the same screen.
   *
   * Hinglish is passed through untouched. The engine writes lines like "main
   * Frog Studios se call kar raha hoon" because that is how these calls are
   * actually held, and there is no Hinglish voice to ask for — so the words go
   * to whichever Indian voice was selected, exactly as written. Translating or
   * transliterating them here to fit a locale would quietly change what the
   * preview is demonstrating.
   */
  async speakConversation(input: ConversationSpeechRequest): Promise<SpeechResult> {
    return {
      provider: this.name,
      delivery: this.delivery,
      audioUrl: null,
      simulated: true,
      utterances: planUtterances(input.transcript, {
        register: input.register,
        preferredLanguage: input.preferredLanguage,
        voice: input.voice,
        speakers: input.speakers,
      }),
    };
  }
}
