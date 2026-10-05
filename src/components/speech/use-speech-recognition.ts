'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type RecognitionResultEvent = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: { transcript: string };
    };
  };
};

type RecognitionErrorEvent = { error: string };

interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type RecognitionConstructor = new () => RecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  }
}

export type VoiceInputStatus = 'unsupported' | 'idle' | 'listening' | 'error';

export interface VoiceInputState {
  status: VoiceInputStatus;
  transcript: string;
  error: string | null;
}

function constructorForWindow(): RecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

function messageForError(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone access was denied. Allow microphone access in your browser and try again.';
    case 'audio-capture':
      return 'No usable microphone was found.';
    case 'no-speech':
      return 'I did not hear anything. Try again.';
    case 'network':
      return 'The browser speech service is unavailable. You can type instead.';
    default:
      return 'Voice input stopped unexpectedly. You can type instead.';
  }
}

/**
 * Browser speech-to-text for Zemo.
 *
 * This intentionally uses the browser recognition API rather than recording
 * audio ourselves. The browser controls whether recognition is local or
 * service-backed, so the UI must not promise that raw microphone audio stays
 * on-device. Only the resulting text is passed to Zemo.
 */
export function useSpeechRecognition({
  lang = 'en-IN',
  onFinalTranscript,
}: {
  lang?: string;
  onFinalTranscript: (text: string) => void;
}) {
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const mountedRef = useRef(true);
  const [state, setState] = useState<VoiceInputState>(() => ({
    status: constructorForWindow() ? 'idle' : 'unsupported',
    transcript: '',
    error: null,
  }));

  useEffect(() => {
    mountedRef.current = true;
    const Recognition = constructorForWindow();
    if (Recognition) {
      setState((current) =>
        current.status === 'unsupported'
          ? { ...current, status: 'idle', error: null }
          : current
      );
    }
    return () => {
      mountedRef.current = false;
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Recognition = constructorForWindow();
    if (!Recognition) {
      setState({ status: 'unsupported', transcript: '', error: 'Voice input is not supported by this browser.' });
      return false;
    }

    recognitionRef.current?.abort();

    const recognition = new Recognition();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognitionRef.current = recognition;

    let finalText = '';

    recognition.onstart = () => {
      if (mountedRef.current) {
        setState({ status: 'listening', transcript: '', error: null });
      }
    };

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const text = event.results[i][0]?.transcript ?? '';
        if (event.results[i].isFinal) finalText += text;
        else interim += text;
      }
      if (mountedRef.current) {
        setState((current) => ({ ...current, transcript: (finalText + interim).trim(), error: null }));
      }
    };

    recognition.onerror = (event) => {
      if (mountedRef.current) {
        setState({ status: 'error', transcript: finalText.trim(), error: messageForError(event.error) });
      }
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      const text = finalText.trim();
      if (mountedRef.current) {
        setState((current) => ({ ...current, status: current.error ? 'error' : 'idle', transcript: text }));
      }
      if (text) onFinalTranscript(text);
    };

    try {
      recognition.start();
      return true;
    } catch {
      recognitionRef.current = null;
      setState({ status: 'error', transcript: '', error: 'Voice input could not start. You can type instead.' });
      return false;
    }
  }, [lang, onFinalTranscript]);

  return {
    ...state,
    supported: state.status !== 'unsupported',
    start,
    stop,
  };
}
