'use client';

/**
 * Wrapper around the browser Web Speech API for speech recognition.
 *
 * Provides a clean interface to:
 * - Start/stop/abort recognition
 * - Get interim and final transcripts
 * - Handle browser errors gracefully
 * - Prevent duplicate transcripts
 * - Support both SpeechRecognition and webkitSpeechRecognition
 *
 * The browser's SpeechRecognition API is available in most modern browsers
 * but has inconsistent behavior across vendors. This wrapper normalizes
 * that behavior and handles edge cases.
 */

export type RecognitionErrorCode =
  /** User denied microphone permission. */
  | 'not-allowed'
  /** No microphone found or microphone is not working. */
  | 'audio-capture'
  /** Network error while trying to reach the recognition service. */
  | 'network'
  /** No speech was detected for an extended period. */
  | 'no-speech'
  /** The request was aborted. */
  | 'aborted'
  /** Something else went wrong. */
  | 'unknown';

export interface SpeechRecognitionResult {
  /** Final recognized transcript. Only set when recognition ends. */
  finalTranscript?: string;
  /** Interim transcript while user is still speaking. */
  interimTranscript?: string;
  /** Error code if recognition failed. */
  error?: RecognitionErrorCode;
  /** True if this is the final result. */
  isFinal?: boolean;
}

/**
 * Configuration for the speech recognizer.
 */
export interface SpeechRecognizerConfig {
  /** BCP-47 language tag (e.g., 'en-IN', 'hi-IN'). */
  language?: string;
  /** Whether to get interim results. Defaults to true. */
  interimResults?: boolean;
  /** Whether to continue listening after a result. Defaults to false (stops after one recognition). */
  continuous?: boolean;
  /** Maximum milliseconds to wait after user stops speaking before considering speech complete. Defaults to 1500. */
  speechEndTimeout?: number;
}

export type RecognitionEventType =
  | 'start'
  | 'result'
  | 'error'
  | 'end'
  | 'abort';

export type RecognitionEventListener = (event: RecognitionEventType, result?: SpeechRecognitionResult) => void;

/**
 * Speech recognizer wrapper that normalizes browser Web Speech API.
 */
export class SpeechRecognizer {
  private recognition: SpeechRecognitionAPI | null = null;
  private config: Required<SpeechRecognizerConfig>;
  private isListening = false;
  private lastFinalTranscript = '';
  private listeners = new Set<RecognitionEventListener>();
  private recognitionRunId = 0;

  constructor(config: SpeechRecognizerConfig = {}) {
    this.config = {
      language: config.language || 'en-IN',
      interimResults: config.interimResults ?? true,
      continuous: config.continuous ?? false,
      speechEndTimeout: config.speechEndTimeout ?? 1500,
    };
  }

  /**
   * Check if speech recognition is supported in this browser.
   */
  static isSupported(): boolean {
    return typeof window !== 'undefined' && !!(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    );
  }

  /**
   * Initialize the recognizer. Must be called before start().
   */
  private initRecognition(): void {
    if (this.recognition) return;

    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      throw new Error('Speech Recognition API not supported in this browser');
    }

    this.recognition = new SpeechRecognitionAPI();
    if (!this.recognition) return;

    this.recognition.language = this.config.language;
    this.recognition.interimResults = this.config.interimResults;
    this.recognition.continuous = this.config.continuous;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.emit('start');
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Prevent duplicate transcripts by only emitting if content changed
      if (finalTranscript && finalTranscript !== this.lastFinalTranscript) {
        this.lastFinalTranscript = finalTranscript;
        this.emit('result', {
          finalTranscript,
          isFinal: true,
        });
      } else if (interimTranscript) {
        this.emit('result', {
          interimTranscript,
          isFinal: false,
        });
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const errorCode = this.mapErrorCode(event.error);
      this.emit('error', { error: errorCode });
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.emit('end');
    };
  }

  /**
   * Start recognition.
   */
  start(): void {
    if (!SpeechRecognizer.isSupported()) {
      this.emit('error', { error: 'unknown' });
      return;
    }

    this.recognitionRunId += 1;

    try {
      this.initRecognition();
      if (this.recognition) {
        this.recognition.start();
      }
    } catch (err) {
      this.emit('error', { error: 'unknown' });
    }
  }

  /**
   * Stop recognition gracefully (allows current results to be processed).
   */
  stop(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore errors from stop
      }
    }
  }

  /**
   * Abort recognition immediately (discards current results).
   */
  abort(): void {
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // Ignore errors from abort
      }
    }
  }

  /**
   * Change the recognition language.
   */
  setLanguage(language: string): void {
    this.config.language = language;
    if (this.recognition) {
      this.recognition.language = language;
    }
  }

  /**
   * Check if recognizer is currently listening.
   */
  isActive(): boolean {
    return this.isListening;
  }

  /**
   * Add an event listener.
   */
  addEventListener(listener: RecognitionEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit an event to all listeners.
   */
  private emit(type: RecognitionEventType, result?: SpeechRecognitionResult): void {
    for (const listener of this.listeners) {
      try {
        listener(type, result);
      } catch {
        // Ignore listener errors
      }
    }
  }

  /**
   * Map browser error codes to our error codes.
   */
  private mapErrorCode(browserError: string): RecognitionErrorCode {
    switch (browserError) {
      case 'not-allowed':
      case 'permission-denied':
        return 'not-allowed';
      case 'audio-capture':
      case 'no-speech-detected':
        return 'audio-capture';
      case 'network':
        return 'network';
      case 'no-speech':
        return 'no-speech';
      case 'aborted':
        return 'aborted';
      default:
        return 'unknown';
    }
  }

  /**
   * Cleanup resources.
   */
  dispose(): void {
    this.abort();
    this.listeners.clear();
    this.recognition = null;
  }
}

/**
 * Type definition for the browser's SpeechRecognition API.
 */
interface SpeechRecognitionAPI {
  language: string;
  interimResults: boolean;
  continuous: boolean;
  onstart: ((this: SpeechRecognitionAPI, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognitionAPI, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognitionAPI, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognitionAPI, ev: Event) => any) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

/**
 * Type definition for the browser's SpeechRecognition event.
 */
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

/**
 * Type definition for the browser's SpeechRecognitionError event.
 */
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

/**
 * Type definition for the browser's SpeechRecognitionResultList.
 */
interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult_;
  item(index: number): SpeechRecognitionResult_;
}

/**
 * Type definition for individual result.
 */
interface SpeechRecognitionResult_ {
  length: number;
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
  item(index: number): SpeechRecognitionAlternative;
}

/**
 * Type definition for recognition alternative.
 */
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
