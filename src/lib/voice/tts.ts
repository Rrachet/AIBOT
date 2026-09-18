/**
 * Text-to-speech utility using the browser's Web Speech API.
 * Falls back gracefully if TTS is not supported.
 */

export interface TTSOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
}

export class TextToSpeech {
  private synthesis: SpeechSynthesis | null = null;
  private utterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.synthesis = window.speechSynthesis;
    }
  }

  isSupported(): boolean {
    return !!this.synthesis;
  }

  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    if (!this.synthesis) {
      throw new Error('Text-to-speech not supported in this browser');
    }

    return new Promise((resolve, reject) => {
      // Cancel any ongoing speech
      this.synthesis?.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options.rate ?? 1;
      utterance.pitch = options.pitch ?? 1;
      utterance.volume = options.volume ?? 1;

      utterance.onend = () => {
        this.utterance = null;
        resolve();
      };

      utterance.onerror = (event) => {
        this.utterance = null;
        reject(new Error(`TTS error: ${event.error}`));
      };

      this.utterance = utterance;
      this.synthesis?.speak(utterance);
    });
  }

  stop(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
      this.utterance = null;
    }
  }

  isSpeaking(): boolean {
    return this.synthesis?.speaking ?? false;
  }
}

export const tts = new TextToSpeech();
