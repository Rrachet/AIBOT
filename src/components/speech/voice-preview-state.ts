'use client';

import type { PreviewScenario } from '@/domain/voice-scenarios';
import type { SpeechRegister } from '@/lib/speech/speech-types';

/**
 * What the voice preview is doing, published for anything that wants to know.
 *
 * Zemo is the reason this exists. It will eventually be able to say "you are
 * listening to the price objection in Hinglish — try the agency one next", and
 * it cannot do that by reaching into a dialog's React state. So the preview
 * announces itself, and whatever wants to listen can.
 *
 * Deliberately not a store, a context or a subscription hook. Nothing renders
 * from this today, and building a reactive dependency between Zemo and a dialog
 * before there is a feature that needs one would be the wrong shape to inherit.
 * A last-known value and an event are enough, and both are cheap to delete.
 *
 * Nothing is persisted and nothing leaves the page: the payload is a scenario
 * key, a language and a phase, with no workspace data, no transcript and no
 * identifiers in it.
 */

export interface VoicePreviewState {
  scenario: PreviewScenario;
  language: SpeechRegister;
  /** True while the browser is actually speaking. */
  speaking: boolean;
  /** True once a conversation has played to the end. */
  complete: boolean;
  /** True while a conversation is being prepared. */
  loading: boolean;
}

export const VOICE_PREVIEW_EVENT = 'aibot:voice-preview';

let current: VoicePreviewState | null = null;

/** The last state the preview announced, or null if it has not run. */
export function readVoicePreviewState(): VoicePreviewState | null {
  return current;
}

export function publishVoicePreviewState(state: VoicePreviewState): void {
  current = state;
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(VOICE_PREVIEW_EVENT, { detail: state }));
}

/** Called when the preview goes away, so nothing reads a stale answer. */
export function clearVoicePreviewState(): void {
  current = null;
}
