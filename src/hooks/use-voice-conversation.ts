'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useSpeechRecognizer } from '@/components/speech/use-speech-recognizer';
import { useVoiceConversationState } from './use-voice-conversation-state';
import type { SpeechRegister, SpeechLanguage } from '@/lib/speech/speech-types';

export interface VoiceConversationHandler {
  onFinalTranscript?: (transcript: string) => Promise<void>;
}

export function useVoiceConversation(
  handler: VoiceConversationHandler,
  register: SpeechRegister = 'ENGLISH'
) {
  const recognizer = useSpeechRecognizer(register);
  const state = useVoiceConversationState();
  const isProcessingRef = useRef(false);

  // Handle speech recognition events
  useEffect(() => {
    if (recognizer.isListening && state.context.state === 'IDLE') {
      state.startListening();
    }
  }, [recognizer.isListening, state.context.state, state]);

  // Update transcript when interim results come in
  useEffect(() => {
    if (recognizer.interimTranscript && state.context.state === 'LISTENING') {
      state.startRecording();
      state.updateTranscript(recognizer.interimTranscript);
    }
  }, [recognizer.interimTranscript, state.context.state, state]);

  // Handle final transcript
  useEffect(() => {
    if (
      recognizer.finalTranscript &&
      recognizer.finalTranscript !== state.context.lastFinalTranscript &&
      (state.context.state === 'RECORDING' || state.context.state === 'LISTENING')
    ) {
      state.finishRecording(recognizer.finalTranscript);
    }
  }, [recognizer.finalTranscript, state.context.state, state.context.lastFinalTranscript, state]);

  // Submit final transcript to handler
  useEffect(() => {
    if (
      state.context.state === 'PROCESSING' &&
      state.context.transcript &&
      !isProcessingRef.current &&
      handler.onFinalTranscript
    ) {
      isProcessingRef.current = true;
      handler
        .onFinalTranscript(state.context.transcript)
        .catch((err) => {
          state.setError(err instanceof Error ? err.message : 'Failed to process transcript');
        })
        .finally(() => {
          isProcessingRef.current = false;
        });
    }
  }, [state.context.state, state.context.transcript, handler, state]);

  // Handle recognition errors
  useEffect(() => {
    if (recognizer.error) {
      if (recognizer.error.includes('no-speech')) {
        // No-speech errors don't kill the conversation, just return to listening
        if (state.context.state === 'RECORDING') {
          state.startListening();
        }
      } else {
        state.setError(recognizer.error);
      }
    }
  }, [recognizer.error, state.context.state, state]);

  const start = useCallback(() => {
    state.reset();
    state.startListening();
    recognizer.start();
  }, [recognizer, state]);

  const stop = useCallback(() => {
    recognizer.stop();
    state.reset();
  }, [recognizer, state]);

  const finishSpeaking = useCallback(() => {
    state.finishSpeaking();
    // Automatically resume listening
    state.startListening();
    recognizer.start();
  }, [recognizer, state]);

  const setLanguage = useCallback((newRegister: SpeechRegister, preferred?: SpeechLanguage) => {
    recognizer.setLanguage(newRegister, preferred);
  }, [recognizer]);

  return {
    state: state.context,
    start,
    stop,
    finishSpeaking,
    setLanguage,
  };
}
