export type SpeechRegister = 'ENGLISH' | 'HINDI' | 'HINGLISH';
export type SpeechLanguage = 'en-IN' | 'hi-IN' | 'hi-Latn-IN';

export function spokenLanguageFor(register: SpeechRegister, preferred?: SpeechLanguage): SpeechLanguage {
  const preferred_lower = preferred?.toLowerCase() || '';

  switch (register) {
    case 'ENGLISH':
      return 'en-IN';
    case 'HINDI':
      return 'hi-IN';
    case 'HINGLISH':
      return 'hi-Latn-IN';
    default:
      return 'en-IN';
  }
}
