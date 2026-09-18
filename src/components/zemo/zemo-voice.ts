import {
  PREVIEW_SCENARIO_LABEL,
  type PreviewScenario,
} from '@/domain/voice-scenarios';
import { SPEECH_REGISTER_LABEL } from '@/lib/speech/speech-types';
import type { VoicePreviewState } from '@/components/speech/voice-preview-state';
import type { ZemoHeard } from './zemo-context';
import type { ZemoMood } from './zemo-avatar';

/**
 * What Zemo may say about the voice preview.
 *
 * Zemo knows what is playing because the preview publishes it — a typed state
 * with a scenario, a language and four booleans. Nothing here reads the DOM,
 * looks for a class name or infers anything from text on screen. If the
 * preview does not publish it, Zemo does not know it.
 *
 * The restraint is the design. A demo is someone talking over a conversation
 * to a prospect, and an assistant that produces a line at every state change
 * is talking over the talking. So: one line, changing only when the preview
 * actually changes state, never during the moment the conversation is being
 * prepared, and never anything that needs reading while a voice is speaking.
 */

export interface ZemoVoiceLine {
  text: string;
  mood: ZemoMood;
}

/**
 * What each conversation is a test of.
 *
 * Deliberately not the same sentence as `PREVIEW_SCENARIO_HINT`, which tells a
 * salesperson what the chip does. This is what Zemo says about it: what to
 * listen for, and why that is the interesting part. Saying the same thing
 * twice in two places on one screen is worse than saying nothing.
 */
const LISTEN_FOR: Record<PreviewScenario, string> = {
  DISCOVERY:
    'Listen for it asking how they work today before it says a word about the product.',
  INTERESTED:
    'The easy one. The test is whether it closes on a time instead of talking past the yes.',
  HAS_AGENCY:
    'This tests whether the agent can handle an incumbent without attacking them.',
  NOT_INTERESTED:
    'Worth playing to a sceptic: it takes no for an answer the first time it hears it.',
  SEND_DETAILS:
    '"Send me details" is where most follow-ups quietly die. Listen for it asking what to send.',
  TOO_EXPENSIVE:
    'Value-based objection handling, with no discount invented to get out of the room.',
};

/**
 * The single line Zemo shows beside the preview, or nothing.
 *
 * Nothing is the common case and the important one. While a conversation is
 * being prepared there is nothing worth saying, and while it plays there is
 * one line that stays put rather than a commentary that moves.
 */
export function voiceAsideFor(state: VoicePreviewState): ZemoVoiceLine | null {
  if (!state.open || state.loading) return null;

  // `playing` rather than `speaking`: a conversation alternates between the
  // agent being spoken and the prospect's reply sitting on screen, and a line
  // that swapped for another one every few seconds through that would be the
  // most distracting thing in the room.
  if (state.playing || state.speaking) {
    return {
      text: 'Only the agent is voiced. The prospect is on screen so you can see where the objection lands.',
      mood: 'talking',
    };
  }

  if (state.paused) {
    return { text: 'Paused. Pick it back up whenever you are ready.', mood: 'idle' };
  }

  if (state.complete) {
    return {
      text: 'That is the whole call. Switch the objection and listen to how the same agent changes its answer.',
      mood: 'pleased',
    };
  }

  if (state.scenario) {
    return { text: LISTEN_FOR[state.scenario], mood: 'curious' };
  }

  return null;
}

/**
 * What Zemo says in the panel about a preview that is open.
 *
 * Longer than the aside, because this one was asked for: somebody typed a
 * question while a conversation was on screen, so the answer can afford to
 * name the scenario, the language and what the thing they are hearing is.
 */
export function voiceAnswerFor(state: VoicePreviewState): string | null {
  if (!state.open || !state.scenario || !state.language) return null;

  const what = PREVIEW_SCENARIO_LABEL[state.scenario].toLowerCase();
  const language = SPEECH_REGISTER_LABEL[state.language];
  const where = state.playing || state.speaking
    ? 'playing now'
    : state.paused
      ? 'paused'
      : state.complete
        ? 'finished'
        : state.loading
          ? 'being prepared'
          : 'ready to play';

  return (
    `You are on the "${what}" conversation in ${language} — ${where}. ${LISTEN_FOR[state.scenario]} ` +
    'It is your browser reading the agent’s side aloud, not a phone call: nothing is dialled and nothing is saved.'
  );
}

/**
 * What Zemo says about the conversation somebody has just closed.
 *
 * Past tense, and short. Whoever shut the dialog has moved on; this exists so
 * that opening Zemo straight afterwards picks up where their attention was
 * rather than reciting the page they happen to be standing on.
 */
export function voiceRecallFor(heard: ZemoHeard): string {
  const what = PREVIEW_SCENARIO_LABEL[heard.scenario].toLowerCase();
  const language = SPEECH_REGISTER_LABEL[heard.language];
  return (
    `That was the "${what}" conversation in ${language}. ${LISTEN_FOR[heard.scenario]} ` +
    'Run the same campaign against another objection and you will hear the same agent answer it differently.'
  );
}

/**
 * Chips offered while a preview is open.
 *
 * Only ever about the thing on screen. The generic suggestions are useless
 * here — nobody mid-demo wants to be asked whether they would like the tour.
 */
export function voiceSuggestionsFor(state: VoicePreviewState | undefined): string[] | null {
  if (!state?.open) return null;
  return ['What is this scenario testing?', 'Is this a real call?', 'Which language is this?'];
}

/** True when a question is about the preview rather than the page behind it. */
export function aboutVoicePreview(text: string): boolean {
  return /\b(voice|speak|speaking|spoken|aloud|audio|hear|hearing|listen|listening|scenario|objection|replay|language|accent|hindi|hinglish|english)\b/.test(
    text
  );
}
