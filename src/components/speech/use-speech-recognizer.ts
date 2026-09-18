'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  SpeechRecognizer,
  type SpeechRecognitionResult,
  type RecognitionEventType,
} from './speech-recognizer';
import type { SpeechRegister, SpeechLanguage } from '@/lib/speech/speech-types';
import { spokenLanguageFor } from '@/lib/speech/speech-types';

/**
 * State and callbacks for speech recognition.
 */
export interface UseVoiceRecognizerResult {
  /** Current interim transcript (user is still speaking). */
  interimTranscript: string;
  /** Latest final transcript (recognition complete). */
  finalTranscript: string;
  /** True if currently listening/recognizing. */
  isListening: boolean;
  /** Error message, if any. */
  error: string | null;
  /** Start listening. */
  start: () => void;
  /** Stop listening. */
  stop: () => void;
  /** Abort listening. */
  abort: () => void;
  /** Change recognition language. */
  setLanguage: (register: SpeechRegister, preferred?: SpeechLanguage) => void;
}

/**
 * React hook for speech recognition.
 *
 * Manages the recognizer lifecycle, state, and error handling.
 * Automatically cleans up on unmount.
 */
export function useSpeechRecognizer(
  initialRegister: SpeechRegister = 'ENGLISH',
  initialLanguage: SpeechLanguage = 'en-IN'
): UseVoiceRecognizerResult {
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognizerRef = useRef<SpeechRecognizer | null>(null);
  const isMountedRef = useRef(true);

  // Initialize recognizer on mount
  useEffect(() => {
    if (!SpeechRecognizer.isSupported()) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    const language = spokenLanguageFor(initialRegister, initialLanguage);
    recognizerRef.current = new SpeechRecognizer({ language });

    // Set up event listeners
    const unsubscribe = recognizerRef.current.addEventListener(
      (eventType: RecognitionEventType, result?: SpeechRecognitionResult) => {
        if (!isMountedRef.current) return;

        switch (eventType) {
          case 'start':
            setIsListening(true);
            setError(null);
            setInterimTranscript('');
            setFinalTranscript('');
            break;

          case 'result':
            if (result?.interimTranscript !== undefined) {
              setInterimTranscript(result.interimTranscript);
            }
            if (result?.finalTranscript !== undefined) {
              setFinalTranscript(result.finalTranscript);
              setInterimTranscript('');
            }
            break;

          case 'error':
            if (result?.error) {
              const errorMsg = getErrorMessage(result.error);
              setError(errorMsg);
              // Don't treat no-speech as a fatal error, just return to listening
              if (result.error === 'no-speech') {
                setIsListening(false);
                setInterimTranscript('');
              }
            }
            break;

          case 'end':
            setIsListening(false);
            setInterimTranscript('');
            break;

          case 'abort':
            setIsListening(false);
            setInterimTranscript('');
            break;
        }
      }
    );

    return () => {
      unsubscribe();
      recognizerRef.current?.dispose();
    };
  }, [initialRegister, initialLanguage]);

  // Mark as mounted
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const start = useCallback(() => {
    recognizerRef.current?.start();
  }, []);

  const stop = useCallback(() => {
    recognizerRef.current?.stop();
  }, []);

  const abort = useCallback(() => {
    recognizerRef.current?.abort();
  }, []);

  const setLanguage = useCallback((register: SpeechRegister, preferred?: SpeechLanguage) => {
    const language = spokenLanguageFor(register, preferred ?? 'en-IN');
    recognizerRef.current?.setLanguage(language);
  }, []);

  return {
    interimTranscript,
    finalTranscript,
    isListening,
    error,
    start,
    stop,
    abort,
    setLanguage,
  };
}

/**
 * Convert error code to user-friendly message.
 */
function getErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'not-allowed':
      return 'Microphone permission was denied. Please enable it in your browser settings.';
    case 'audio-capture':
      return 'Microphone is not available or not working properly.';
    case 'network':
      return 'Network error during speech recognition. Please check your connection.';
    case 'no-speech':
      return 'No speech detected. Please try speaking again.';
    case 'aborted':
      return 'Speech recognition was cancelled.';
    default:
      return 'An error occurred during speech recognition.';
  }
}
