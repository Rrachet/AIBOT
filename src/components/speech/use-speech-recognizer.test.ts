import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSpeechRecognizer } from './use-speech-recognizer';
import { SpeechRecognizer } from './speech-recognizer';

vi.mock('./speech-recognizer', () => ({
  SpeechRecognizer: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    abort: vi.fn(),
    setLanguage: vi.fn(),
    addEventListener: vi.fn((listener) => {
      // Store listener for testing
      return vi.fn();
    }),
    dispose: vi.fn(),
  })),
}));

vi.mock('@/lib/speech/speech-types', () => ({
  spokenLanguageFor: vi.fn((register: string, language?: string) => {
    if (register === 'HINDI') return 'hi-IN';
    if (register === 'HINGLISH') return 'hi-Latn-IN';
    return language || 'en-IN';
  }),
}));

describe('useSpeechRecognizer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useSpeechRecognizer());

      expect(result.current.interimTranscript).toBe('');
      expect(result.current.finalTranscript).toBe('');
      expect(result.current.isListening).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should return control functions', () => {
      const { result } = renderHook(() => useSpeechRecognizer());

      expect(typeof result.current.start).toBe('function');
      expect(typeof result.current.stop).toBe('function');
      expect(typeof result.current.abort).toBe('function');
      expect(typeof result.current.setLanguage).toBe('function');
    });
  });

  describe('start/stop/abort', () => {
    it('should call recognizer.start()', () => {
      const { result } = renderHook(() => useSpeechRecognizer());

      act(() => {
        result.current.start();
      });

      expect(SpeechRecognizer.prototype.start).toHaveBeenCalled();
    });

    it('should call recognizer.stop()', () => {
      const { result } = renderHook(() => useSpeechRecognizer());

      act(() => {
        result.current.start();
        result.current.stop();
      });

      expect(SpeechRecognizer.prototype.stop).toHaveBeenCalled();
    });

    it('should call recognizer.abort()', () => {
      const { result } = renderHook(() => useSpeechRecognizer());

      act(() => {
        result.current.start();
        result.current.abort();
      });

      expect(SpeechRecognizer.prototype.abort).toHaveBeenCalled();
    });
  });

  describe('setLanguage', () => {
    it('should set language on recognizer', () => {
      const { result } = renderHook(() => useSpeechRecognizer());

      act(() => {
        result.current.setLanguage('HINDI', 'hi-IN');
      });

      expect(SpeechRecognizer.prototype.setLanguage).toHaveBeenCalledWith('hi-IN');
    });

    it('should use default language if not provided', () => {
      const { result } = renderHook(() => useSpeechRecognizer());

      act(() => {
        result.current.setLanguage('ENGLISH');
      });

      expect(SpeechRecognizer.prototype.setLanguage).toHaveBeenCalledWith('en-IN');
    });
  });

  describe('event handling', () => {
    it('should handle start event', async () => {
      const { result } = renderHook(() => useSpeechRecognizer());

      // Simulate start event
      const listeners: any[] = [];
      (SpeechRecognizer.prototype.addEventListener as any).mockImplementation((listener) => {
        listeners.push(listener);
        return vi.fn();
      });

      const { result: result2 } = renderHook(() => useSpeechRecognizer());

      act(() => {
        if (listeners.length > 0) {
          listeners[0]('start');
        }
      });

      await waitFor(() => {
        expect(result2.current.isListening).toBe(true);
      });
    });

    it('should handle error event', async () => {
      const listeners: any[] = [];
      (SpeechRecognizer.prototype.addEventListener as any).mockImplementation((listener) => {
        listeners.push(listener);
        return vi.fn();
      });

      const { result } = renderHook(() => useSpeechRecognizer());

      act(() => {
        if (listeners.length > 0) {
          listeners[0]('error', { error: 'not-allowed' });
        }
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
    });
  });

  describe('cleanup', () => {
    it('should dispose recognizer on unmount', () => {
      const { unmount } = renderHook(() => useSpeechRecognizer());

      unmount();

      expect(SpeechRecognizer.prototype.dispose).toHaveBeenCalled();
    });

    it('should unsubscribe from recognizer events on unmount', () => {
      const unsubscribe = vi.fn();
      (SpeechRecognizer.prototype.addEventListener as any).mockReturnValue(unsubscribe);

      const { unmount } = renderHook(() => useSpeechRecognizer());

      unmount();

      expect(unsubscribe).toHaveBeenCalled();
    });
  });

  describe('state updates after unmount', () => {
    it('should not update state after unmount', () => {
      const listeners: any[] = [];
      (SpeechRecognizer.prototype.addEventListener as any).mockImplementation((listener) => {
        listeners.push(listener);
        return vi.fn();
      });

      const { result, unmount } = renderHook(() => useSpeechRecognizer());

      unmount();

      act(() => {
        if (listeners.length > 0) {
          listeners[0]('start');
        }
      });

      // Should not update after unmount
      expect(result.current.isListening).toBe(false);
    });
  });
});
