import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TextToSpeech } from './tts';

describe('TextToSpeech', () => {
  let tts: TextToSpeech;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock SpeechSynthesis API
    const mockUtterance = {
      rate: 1,
      pitch: 1,
      volume: 1,
      onend: null as any,
      onerror: null as any,
    };

    const mockSynthesis = {
      speaking: false,
      speak: vi.fn((utterance) => {
        setTimeout(() => utterance.onend?.(), 100);
      }),
      cancel: vi.fn(() => {
        mockSynthesis.speaking = false;
      }),
    };

    Object.defineProperty(window, 'speechSynthesis', {
      value: mockSynthesis,
      configurable: true,
    });

    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      value: vi.fn(() => mockUtterance),
      configurable: true,
    });

    tts = new TextToSpeech();
  });

  it('should detect TTS support', () => {
    expect(tts.isSupported()).toBe(true);
  });

  it('should handle unsupported browser gracefully', () => {
    // Mock no speechSynthesis
    Object.defineProperty(window, 'speechSynthesis', {
      value: undefined,
      configurable: true,
    });

    const unsupportedTTS = new TextToSpeech();
    expect(unsupportedTTS.isSupported()).toBe(false);
  });

  it('should throw error when speaking without support', async () => {
    Object.defineProperty(window, 'speechSynthesis', {
      value: undefined,
      configurable: true,
    });

    const unsupportedTTS = new TextToSpeech();

    try {
      await unsupportedTTS.speak('test');
      throw new Error('Should have thrown');
    } catch (error) {
      expect(error instanceof Error).toBe(true);
    }
  });

  it('should speak text with options', async () => {
    const speakPromise = tts.speak('hello', { rate: 1.2, pitch: 0.8, volume: 0.9 });

    expect(speakPromise).resolves.toBeUndefined();
  });

  it('should cancel speech', () => {
    const mockSynthesis = (window as any).speechSynthesis;
    tts.stop();

    expect(mockSynthesis.cancel).toHaveBeenCalled();
  });

  it('should report speaking status', () => {
    expect(typeof tts.isSpeaking()).toBe('boolean');
  });
});
