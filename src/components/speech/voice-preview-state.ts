'use client';

import { useSyncExternalStore } from 'react';
import type { PreviewScenario } from '@/domain/voice-scenarios';
import type { SpeechRegister } from '@/lib/speech/speech-types';

/**
 * What the voice preview is doing, published for anything that wants to know.
 *
 * Zemo is the reason this exists. To say "you are listening to the price
 * objection in Hinglish — try the agency one next" it has to know what is on
 * screen, and it sits at the application shell while the preview sits inside a
 * dialog several levels down. Passing state up through that tree would mean
 * threading props through components that have no interest in it, and reading
 * the DOM would mean Zemo depending on class names that exist for CSS.
 *
 * So the preview publishes to a small store and anything can subscribe. In
 * React that is `useVoicePreviewState()`, which is typed and re-renders on
 * change; outside it, the same updates arrive as a window event.
 *
 * Nothing is persisted and nothing leaves the page. The payload is a scenario
 * key, a language and four booleans: no workspace data, no transcript, no
 * identifiers, nothing about the person using it.
 */

export interface VoicePreviewState {
  /**
   * Whether the preview is on screen at all.
   *
   * The others only mean anything while this is true — a scenario key from a
   * dialog that was closed ten minutes ago is not what anyone is looking at.
   */
  open: boolean;
  /** The conversation being shown, or null when the preview is closed. */
  scenario: PreviewScenario | null;
  language: SpeechRegister | null;
  /** A conversation is being prepared. */
  loading: boolean;
  /**
   * A conversation is running: an agent turn is being spoken, or a prospect
   * turn is on screen between two of them.
   *
   * Separate from `speaking` because the two are genuinely different things and
   * both are needed. `speaking` is about the browser's voice — it is what
   * decides whether anything may interrupt. This is about the conversation, and
   * it is what stops a reader being told something different every few seconds
   * as playback moves between the two sides of the call.
   */
  playing: boolean;
  /** The browser is speaking an agent turn right now. */
  speaking: boolean;
  /** Playback is held, mid-conversation. */
  paused: boolean;
  /** A conversation has played all the way through. */
  complete: boolean;
}

/** Nothing open. Also the server-side snapshot, where there is no preview. */
export const NO_VOICE_PREVIEW: VoicePreviewState = Object.freeze({
  open: false,
  scenario: null,
  language: null,
  loading: false,
  playing: false,
  speaking: false,
  paused: false,
  complete: false,
});

/** Also dispatched on `window`, for anything that is not a React component. */
export const VOICE_PREVIEW_EVENT = 'aibot:voice-preview';

let current: VoicePreviewState = NO_VOICE_PREVIEW;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * The snapshot is a frozen object replaced wholesale on every change, never
 * mutated. `useSyncExternalStore` compares by identity and would loop forever
 * on a fresh object per call.
 */
function getSnapshot(): VoicePreviewState {
  return current;
}

function getServerSnapshot(): VoicePreviewState {
  return NO_VOICE_PREVIEW;
}

/** The last state the preview announced. Never null; closed is a state. */
export function readVoicePreviewState(): VoicePreviewState {
  return current;
}

export function publishVoicePreviewState(state: VoicePreviewState): void {
  const next = Object.freeze({ ...state });

  // Unchanged is not news. Without this the studio's effects would wake every
  // subscriber on each render of a conversation that had not moved.
  if (
    current.open === next.open &&
    current.scenario === next.scenario &&
    current.language === next.language &&
    current.loading === next.loading &&
    current.playing === next.playing &&
    current.speaking === next.speaking &&
    current.paused === next.paused &&
    current.complete === next.complete
  ) {
    return;
  }

  current = next;
  for (const listener of listeners) listener();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(VOICE_PREVIEW_EVENT, { detail: next }));
  }
}

/** Called when the preview goes away, so nothing reads a stale answer. */
export function clearVoicePreviewState(): void {
  publishVoicePreviewState(NO_VOICE_PREVIEW);
}

/**
 * The preview's state, for a component that should re-render when it changes.
 *
 * Safe to call anywhere, including on a page with no preview on it: the answer
 * is then simply `open: false`.
 */
export function useVoicePreviewState(): VoicePreviewState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
