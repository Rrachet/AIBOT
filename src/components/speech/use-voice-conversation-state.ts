'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  IDLE_STATE,
  initializeVoiceState,
  requestMicrophonePermission,
  startListening,
  startRecording,
  startProcessing,
  startAISpeaking,
  returnToListening,
  idleAfterTimeout,
  setError,
  clearError,
  type VoiceConversationState,
} from './voice-conversation-state';

/**
 * Hook to manage voice conversation state lifecycle.
 *
 * Handles:
 * - Initialization (browser capability detection)
 * - Permission state management
 * - Conversation state transitions
 * - Error handling
 * - Automatic cleanup
 *
 * Call this in the component that owns the voice preview or voice input.
 */
export function useVoiceConversationState() {
  const [state, setState] = useState<VoiceConversationState>(IDLE_STATE);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize on mount
  useEffect(() => {
    let mounted = true;

    void initializeVoiceState().then((initialState) => {
      if (mounted) {
        setState(initialState);
        setIsInitialized(true);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  // Request microphone permission (call in response to user action)
  const requestPermission = useCallback(async () => {
    const newState = await requestMicrophonePermission();
    setState(newState);
    return newState;
  }, []);

  // State transitions
  const onStartListening = useCallback(() => {
    setState((current) => startListening(current));
  }, []);

  const onStartRecording = useCallback(() => {
    setState((current) => startRecording(current));
  }, []);

  const onStartProcessing = useCallback(() => {
    setState((current) => startProcessing(current));
  }, []);

  const onStartAISpeaking = useCallback(() => {
    setState((current) => startAISpeaking(current));
  }, []);

  const onReturnToListening = useCallback(() => {
    setState((current) => returnToListening(current));
  }, []);

  const onIdleAfterTimeout = useCallback(() => {
    setState((current) => idleAfterTimeout(current));
  }, []);

  const onError = useCallback((message: string) => {
    setState((current) => setError(current, message));
  }, []);

  const onClearError = useCallback(() => {
    setState((current) => clearError(current));
  }, []);

  return {
    state,
    isInitialized,
    requestPermission,
    onStartListening,
    onStartRecording,
    onStartProcessing,
    onStartAISpeaking,
    onReturnToListening,
    onIdleAfterTimeout,
    onError,
    onClearError,
  };
}
