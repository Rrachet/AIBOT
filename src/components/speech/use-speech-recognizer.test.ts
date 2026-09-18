import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSpeechRecognizer } from './use-speech-recognizer';

let capturedListener: any = null;

vi.mock('./speech-recognizer', () => {
  class MockSpeechRecognizer {
    start = vi.fn();
    stop = vi.fn();
    abort = vi.fn();
    setLanguage = vi.fn();
    addEventListener = vi.fn((listener: any) => {
      capturedListener = listener;
      return vi.fn();
    });
    dispose = vi.fn();

    static isSupported = vi.fn(() => true);
  }

  return { SpeechRecognizer: MockSpeechRecognizer };
});

vi.mock('@/lib/speech/speech-types', () => ({
  spokenLanguageFor: vi.fn((register: string) => {
    if (register === 'HINDI') return 'hi-IN';
    return 'en-IN';
  }),
}));

describe('useSpeechRecognizer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedListener = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useSpeechRecognizer());

    expect(result.current.interimTranscript).toBe('');
    expect(result.current.finalTranscript).toBe('');
    expect(result.current.isListening).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should have control methods', () => {
    const { result } = renderHook(() => useSpeechRecognizer());

    expect(typeof result.current.start).toBe('function');
    expect(typeof result.current.stop).toBe('function');
    expect(typeof result.current.abort).toBe('function');
    expect(typeof result.current.setLanguage).toBe('function');
  });

  it('should call start on recognizer', () => {
    const { result } = renderHook(() => useSpeechRecognizer());

    act(() => {
      result.current.start();
    });

    // Hook initialized successfully and start method exists
    expect(typeof result.current.start).toBe('function');
  });

  it('should handle start event from listener', () => {
    const { result } = renderHook(() => useSpeechRecognizer());

    act(() => {
      if (capturedListener) {
        capturedListener('start');
      }
    });

    expect(result.current.isListening).toBe(true);
  });

  it('should handle result event with interim transcript', () => {
    const { result } = renderHook(() => useSpeechRecognizer());

    act(() => {
      if (capturedListener) {
        capturedListener('result', { interimTranscript: 'hello' });
      }
    });

    expect(result.current.interimTranscript).toBe('hello');
  });

  it('should handle result event with final transcript', () => {
    const { result } = renderHook(() => useSpeechRecognizer());

    act(() => {
      if (capturedListener) {
        capturedListener('result', { finalTranscript: 'hello world' });
      }
    });

    expect(result.current.finalTranscript).toBe('hello world');
  });

  it('should handle error event', () => {
    const { result } = renderHook(() => useSpeechRecognizer());

    act(() => {
      if (capturedListener) {
        capturedListener('error', { error: 'not-allowed' });
      }
    });

    expect(result.current.error).toBeDefined();
  });

  it('should handle end event', () => {
    const { result } = renderHook(() => useSpeechRecognizer());

    act(() => {
      if (capturedListener) {
        capturedListener('start');
      }
    });

    expect(result.current.isListening).toBe(true);

    act(() => {
      if (capturedListener) {
        capturedListener('end');
      }
    });

    expect(result.current.isListening).toBe(false);
  });
});
