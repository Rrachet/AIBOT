'use client';

/**
 * Microphone permission and continuous voice conversation state machine.
 *
 * This state machine manages the lifecycle of microphone permission and the
 * continuous voice conversation flow. It handles explicit permission requests,
 * graceful degradation when microphone is unavailable, and transitions between
 * idle, listening, recording, processing, speaking, and error states.
 *
 * Permission is only persisted to localStorage to remember "have we shown the
 * UX to the user", never as an authoritative source. The browser's permission
 * state is always checked before attempting to use the microphone.
 */

export type PermissionState =
  /** Initial state; permission never requested. */
  | 'idle'
  /** User has been shown permission request; waiting for response. */
  | 'requesting'
  /** User has granted microphone access. */
  | 'granted'
  /** User has denied microphone access. */
  | 'denied'
  /** Browser doesn't support permission queries. */
  | 'unsupported'
  /** Browser error occurred during permission check. */
  | 'browser-error';

export type ConversationState =
  /** Not listening; no microphone active. */
  | 'idle'
  /** Microphone is active, listening for speech. */
  | 'listening'
  /** User is speaking; audio is being captured. */
  | 'recording'
  /** Audio has been captured; waiting for server response. */
  | 'processing'
  /** AI is speaking response. */
  | 'ai-speaking'
  /** Error occurred during conversation. */
  | 'error';

export interface VoiceConversationState {
  /** Permission state of the microphone. */
  permission: PermissionState;
  /** Current conversation state. */
  conversation: ConversationState;
  /** User-facing error message, if any. */
  error: string | null;
  /** True if TTS is available in browser. */
  ttsSupported: boolean;
  /** True if STT is available in browser. */
  sttSupported: boolean;
  /** True if mic permission queries are supported. */
  permissionQuerySupported: boolean;
}

/** Default state when first created. */
export const IDLE_STATE: VoiceConversationState = Object.freeze({
  permission: 'idle',
  conversation: 'idle',
  error: null,
  ttsSupported: true,
  sttSupported: true,
  permissionQuerySupported: true,
});

/**
 * Initialize voice state by checking browser support and permission state.
 * This must be called once when the component mounts.
 */
export async function initializeVoiceState(): Promise<VoiceConversationState> {
  const state: VoiceConversationState = { ...IDLE_STATE };

  // Check TTS support
  state.ttsSupported = typeof window !== 'undefined' && !!window.speechSynthesis;

  // Check STT support
  state.sttSupported =
    typeof window !== 'undefined' &&
    !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition;

  // Check permission query support
  state.permissionQuerySupported =
    typeof navigator !== 'undefined' && !!navigator.permissions?.query;

  // If permission queries aren't supported, leave permission as 'idle'
  if (!state.permissionQuerySupported) {
    state.permission = 'unsupported';
    return Object.freeze(state);
  }

  try {
    const permissionStatus = await navigator.permissions.query({ name: 'microphone' as any });
    state.permission =
      permissionStatus.state === 'granted'
        ? 'granted'
        : permissionStatus.state === 'denied'
          ? 'denied'
          : 'idle';
  } catch (err) {
    // Some browsers throw on permission queries; fall back to 'idle'
    state.permission = 'browser-error';
  }

  return Object.freeze(state);
}

/**
 * Request microphone permission explicitly.
 * Must be called in response to user interaction (button click).
 */
export async function requestMicrophonePermission(): Promise<VoiceConversationState> {
  const state: VoiceConversationState = { ...IDLE_STATE };

  if (!navigator.mediaDevices?.getUserMedia) {
    state.permission = 'unsupported';
    state.error = 'Your browser does not support microphone access.';
    return Object.freeze(state);
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Permission was granted; stop the stream immediately.
    stream.getTracks().forEach((track) => track.stop());
    state.permission = 'granted';
    state.conversation = 'listening';
    return Object.freeze(state);
  } catch (err: unknown) {
    if (err instanceof DOMException) {
      if (err.name === 'NotAllowedError') {
        state.permission = 'denied';
        state.error = 'Microphone access was denied. You can enable it in browser settings.';
      } else if (err.name === 'NotFoundError') {
        state.permission = 'unsupported';
        state.error = 'No microphone found on this device.';
      } else if (err.name === 'NotReadableError') {
        state.permission = 'browser-error';
        state.error = 'Microphone is already in use by another application.';
      } else {
        state.permission = 'browser-error';
        state.error = `Microphone error: ${err.message}`;
      }
    } else {
      state.permission = 'browser-error';
      state.error = 'An unexpected error occurred while requesting microphone access.';
    }
    return Object.freeze(state);
  }
}

/**
 * Transition to listening state after permission is confirmed granted.
 */
export function startListening(current: VoiceConversationState): VoiceConversationState {
  if (current.permission !== 'granted') {
    return Object.freeze({
      ...current,
      error: 'Microphone permission not granted',
    });
  }
  return Object.freeze({
    ...current,
    conversation: 'listening',
    error: null,
  });
}

/**
 * Transition to recording state when user starts speaking.
 */
export function startRecording(current: VoiceConversationState): VoiceConversationState {
  if (current.conversation !== 'listening') {
    return current;
  }
  return Object.freeze({
    ...current,
    conversation: 'recording',
    error: null,
  });
}

/**
 * Transition to processing state after recording ends.
 */
export function startProcessing(current: VoiceConversationState): VoiceConversationState {
  if (current.conversation !== 'recording') {
    return current;
  }
  return Object.freeze({
    ...current,
    conversation: 'processing',
    error: null,
  });
}

/**
 * Transition to ai-speaking state when server responds.
 */
export function startAISpeaking(current: VoiceConversationState): VoiceConversationState {
  if (current.conversation !== 'processing') {
    return current;
  }
  return Object.freeze({
    ...current,
    conversation: 'ai-speaking',
    error: null,
  });
}

/**
 * Return to listening state after AI finishes speaking (automatic).
 */
export function returnToListening(current: VoiceConversationState): VoiceConversationState {
  if (current.permission !== 'granted') {
    return Object.freeze({
      ...current,
      conversation: 'idle',
    });
  }
  return Object.freeze({
    ...current,
    conversation: 'listening',
    error: null,
  });
}

/**
 * Idle after 15 seconds of no speech detected.
 */
export function idleAfterTimeout(current: VoiceConversationState): VoiceConversationState {
  return Object.freeze({
    ...current,
    conversation: 'idle',
  });
}

/**
 * Set an error state and stop listening.
 */
export function setError(
  current: VoiceConversationState,
  message: string
): VoiceConversationState {
  return Object.freeze({
    ...current,
    conversation: 'error',
    error: message,
  });
}

/**
 * Clear error and return to appropriate state.
 */
export function clearError(current: VoiceConversationState): VoiceConversationState {
  if (current.error === null) {
    return current;
  }
  return Object.freeze({
    ...current,
    error: null,
    conversation:
      current.permission === 'granted' && current.conversation === 'error'
        ? 'listening'
        : 'idle',
  });
}

/**
 * Check whether a given state allows voice input.
 */
export function canVoiceInput(state: VoiceConversationState): boolean {
  return (
    state.permission === 'granted' &&
    state.sttSupported &&
    state.conversation === 'listening'
  );
}

/**
 * Check whether a given state allows text input.
 */
export function canTextInput(state: VoiceConversationState): boolean {
  return state.conversation === 'idle' || state.conversation === 'listening';
}

/**
 * Check whether voice is available (permission granted, browser supports it).
 */
export function voiceAvailable(state: VoiceConversationState): boolean {
  return state.permission === 'granted' && state.sttSupported && state.ttsSupported;
}

/**
 * Check whether to show the permission request card.
 */
export function shouldShowPermissionCard(state: VoiceConversationState): boolean {
  return (
    state.permission === 'idle' &&
    state.sttSupported &&
    state.ttsSupported &&
    state.permissionQuerySupported
  );
}
