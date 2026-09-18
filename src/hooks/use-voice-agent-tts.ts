'use client';

import { useCallback, useEffect, useRef } from 'react';
import { voiceAgent } from '@/lib/voice/voice-agent';
import { tts } from '@/lib/voice/tts';

export interface UseVoiceAgentTTSOptions {
  onResponse?: (text: string) => void;
  onSpeaking?: () => void;
  onError?: (error: string) => void;
}

export function useVoiceAgentTTS(options: UseVoiceAgentTTSOptions = {}) {
  const processingRef = useRef(false);

  const processAndSpeak = useCallback(
    async (transcript: string) => {
      if (processingRef.current) return;
      processingRef.current = true;

      try {
        if (!tts.isSupported()) {
          options.onError?.('Text-to-speech not supported in this browser');
          return;
        }

        // Get response from agent
        const response = await voiceAgent.processInput(transcript);
        options.onResponse?.(response.text);

        // Signal that TTS is starting
        options.onSpeaking?.();

        // Speak the response
        await tts.speak(response.text);
      } catch (error) {
        options.onError?.(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        processingRef.current = false;
      }
    },
    [options]
  );

  const stop = useCallback(() => {
    tts.stop();
  }, []);

  const isSpeaking = useCallback(() => tts.isSpeaking(), []);

  return {
    processAndSpeak,
    stop,
    isSpeaking,
    isSupported: tts.isSupported(),
  };
}
