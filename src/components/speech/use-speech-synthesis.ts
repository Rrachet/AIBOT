'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type SpeechOutputStatus = 'unsupported' | 'idle' | 'speaking' | 'paused' | 'error';

function browserSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

export function useSpeechSynthesis() {
  const [status, setStatus] = useState<SpeechOutputStatus>(() =>
    browserSupported() ? 'idle' : 'unsupported'
  );
  const [enabled, setEnabled] = useState(true);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (browserSupported()) setStatus('idle');
    return () => {
      if (typeof window !== 'undefined') window.speechSynthesis.cancel();
    };
  }, []);

  const stop = useCallback(() => {
    if (!browserSupported()) return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setStatus('idle');
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!enabled || !browserSupported() || !text.trim()) return false;

      const clean = text
const clean = text
  .replace(/https?:\/\/\S+/g, '')
  .replace(/[*_#`]/g, '')
  .trim();
        .replace(/[*_#`]/g, '')
        .trim();

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = 'en-IN';
      utterance.rate = 0.98;
      utterance.pitch = 1.02;
      utterance.volume = 1;

      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find((voice) => voice.lang.toLowerCase() === 'en-in') ??
        voices.find((voice) => voice.lang.toLowerCase().startsWith('en-in')) ??
        voices.find((voice) => voice.lang.toLowerCase().startsWith('en'));

      if (preferred) utterance.voice = preferred;

      utterance.onstart = () => setStatus('speaking');
      utterance.onpause = () => setStatus('paused');
      utterance.onresume = () => setStatus('speaking');
      utterance.onerror = () => setStatus('error');
      utterance.onend = () => {
        utteranceRef.current = null;
        setStatus('idle');
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
      return true;
    },
    [enabled]
  );

  return {
    supported: status !== 'unsupported',
    status,
    enabled,
    setEnabled,
    speak,
    stop,
  };
}
