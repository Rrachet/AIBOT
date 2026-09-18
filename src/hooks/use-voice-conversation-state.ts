'use client';

import { useCallback, useReducer, useRef } from 'react';

export type VoiceConversationState = 'IDLE' | 'LISTENING' | 'RECORDING' | 'PROCESSING' | 'AI_SPEAKING' | 'ERROR';

export interface VoiceConversationContext {
  state: VoiceConversationState;
  transcript: string;
  error: string | null;
  lastFinalTranscript: string;
}

export type VoiceConversationAction =
  | { type: 'START_LISTENING' }
  | { type: 'START_RECORDING' }
  | { type: 'UPDATE_TRANSCRIPT'; transcript: string }
  | { type: 'FINISH_RECORDING'; finalTranscript: string }
  | { type: 'START_PROCESSING' }
  | { type: 'START_AI_SPEAKING' }
  | { type: 'FINISH_SPEAKING' }
  | { type: 'ERROR'; error: string }
  | { type: 'RESET' };

function voiceConversationReducer(
  state: VoiceConversationContext,
  action: VoiceConversationAction
): VoiceConversationContext {
  switch (action.type) {
    case 'START_LISTENING':
      return {
        ...state,
        state: 'LISTENING',
        transcript: '',
        error: null,
      };

    case 'START_RECORDING':
      if (state.state !== 'LISTENING') return state;
      return {
        ...state,
        state: 'RECORDING',
      };

    case 'UPDATE_TRANSCRIPT':
      if (state.state !== 'RECORDING') return state;
      return {
        ...state,
        transcript: action.transcript,
      };

    case 'FINISH_RECORDING':
      if (state.state !== 'RECORDING') return state;
      return {
        ...state,
        state: 'PROCESSING',
        transcript: action.finalTranscript,
        lastFinalTranscript: action.finalTranscript,
      };

    case 'START_PROCESSING':
      return { ...state, state: 'PROCESSING' };

    case 'START_AI_SPEAKING':
      return { ...state, state: 'AI_SPEAKING' };

    case 'FINISH_SPEAKING':
      if (state.state !== 'AI_SPEAKING') return state;
      return { ...state, state: 'LISTENING', transcript: '' };

    case 'ERROR':
      return {
        ...state,
        state: 'ERROR',
        error: action.error,
      };

    case 'RESET':
      return {
        state: 'IDLE',
        transcript: '',
        error: null,
        lastFinalTranscript: '',
      };

    default:
      return state;
  }
}

export function useVoiceConversationState() {
  const [context, dispatch] = useReducer(voiceConversationReducer, {
    state: 'IDLE',
    transcript: '',
    error: null,
    lastFinalTranscript: '',
  });

  const startListening = useCallback(() => {
    dispatch({ type: 'START_LISTENING' });
  }, []);

  const startRecording = useCallback(() => {
    dispatch({ type: 'START_RECORDING' });
  }, []);

  const updateTranscript = useCallback((transcript: string) => {
    dispatch({ type: 'UPDATE_TRANSCRIPT', transcript });
  }, []);

  const finishRecording = useCallback((finalTranscript: string) => {
    dispatch({ type: 'FINISH_RECORDING', finalTranscript });
  }, []);

  const startProcessing = useCallback(() => {
    dispatch({ type: 'START_PROCESSING' });
  }, []);

  const startAISpeaking = useCallback(() => {
    dispatch({ type: 'START_AI_SPEAKING' });
  }, []);

  const finishSpeaking = useCallback(() => {
    dispatch({ type: 'FINISH_SPEAKING' });
  }, []);

  const setError = useCallback((error: string) => {
    dispatch({ type: 'ERROR', error });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return {
    context,
    startListening,
    startRecording,
    updateTranscript,
    finishRecording,
    startProcessing,
    startAISpeaking,
    finishSpeaking,
    setError,
    reset,
  };
}
