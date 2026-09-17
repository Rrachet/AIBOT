import {
  spokenLanguageFor,
  type SpeechLanguage,
  type SpeechRegister,
  type SpeechSpeaker,
  type SpeechUtterance,
} from './speech-types';

/**
 * Turning a written transcript into something that can be read aloud.
 *
 * The demo call engine writes a transcript as plain text, one turn per line,
 * prefixed with the speaker: `Agent: Hi Rahul, …`. That is the right shape for
 * a page and the wrong shape for a voice — read literally, a speech engine says
 * the word "Agent" before every sentence, runs two speakers' turns together,
 * and treats an ellipsis differently on every platform.
 *
 * Everything here is pure text work: no browser API, no provider, no network.
 * It is used by the server to plan a conversation and by the browser to speak
 * one, and it must give both the same answer.
 */

export interface SpokenLine {
  speaker: SpeechSpeaker;
  text: string;
}

const SPEAKER_BY_LABEL: Record<string, SpeechSpeaker> = {
  agent: 'AGENT',
  lead: 'LEAD',
};

/**
 * Splits a transcript into turns.
 *
 * A line with no recognised speaker prefix is attributed to whoever spoke last
 * rather than dropped. The demo engine does not produce such lines today, but a
 * transcript that gained one — a wrapped paragraph, a line from a future
 * provider — would otherwise go silent mid-conversation, which is a far more
 * confusing failure than a line read in the wrong voice.
 */
export function readTranscript(transcript: string | null | undefined): SpokenLine[] {
  if (!transcript) return [];

  const lines: SpokenLine[] = [];
  let last: SpeechSpeaker = 'AGENT';

  for (const raw of transcript.split('\n')) {
    const line = raw.trim();
    if (line.length === 0) continue;

    const separator = line.indexOf(': ');
    const label = separator > 0 ? line.slice(0, separator).trim().toLowerCase() : null;
    const speaker = label ? SPEAKER_BY_LABEL[label] : undefined;

    if (speaker) {
      const text = line.slice(separator + 2).trim();
      if (text.length === 0) continue;
      last = speaker;
      lines.push({ speaker, text });
      continue;
    }

    lines.push({ speaker: last, text: line });
  }

  return lines;
}

/** Control characters, which reach a speech engine as garbage or as a silent truncation. */
const CONTROL = /\p{Cc}/gu;

/**
 * Prepares one line for a speech engine.
 *
 * Only punctuation and whitespace are touched. The words themselves are left
 * exactly as the conversation engine wrote them — including Hinglish, which
 * must not be translated, transliterated or "corrected" on its way to a voice.
 * Rewriting "main call kar raha hoon" into either pure Hindi or pure English
 * would change the very thing the preview exists to demonstrate.
 */
export function speakableText(text: string): string {
  return (
    text
      .replace(CONTROL, ' ')
      // An ellipsis is a pause when a person reads it and, depending on the
      // engine, either nothing or a spoken "dot dot dot" when a machine does.
      .replace(/…/g, ', ')
      // Dashes used as an aside are a pause too. A bare hyphen between words is
      // left alone, because it is usually part of one ("follow-up").
      .replace(/\s*[–—]\s*/g, ', ')
      // Curly quotes are read correctly by most engines and named aloud by a
      // few; straightening them costs nothing.
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * The longest run of text handed to a single utterance.
 *
 * Chrome stops partway through a long utterance — a well-known limit of roughly
 * fifteen seconds of speech, which at a normal rate lands somewhere near this
 * many characters. Splitting on sentence boundaries below that keeps every
 * engine inside its comfortable range, and costs nothing on the engines that
 * have no such limit.
 */
export const MAX_UTTERANCE_CHARS = 180;

/**
 * Splits text into pieces short enough to be spoken reliably.
 *
 * Sentences first, then clauses, and only then a hard wrap at a word boundary —
 * cutting mid-word is audible, so it is the last resort rather than the first
 * thing tried. Text already short enough comes back as a single piece, which is
 * the common case for a line of dialogue.
 */
export function chunkForSpeech(text: string, max: number = MAX_UTTERANCE_CHARS): string[] {
  const clean = speakableText(text);
  if (clean.length === 0) return [];
  if (clean.length <= max) return [clean];

  const chunks: string[] = [];
  let buffer = '';

  const flush = () => {
    const trimmed = buffer.trim();
    if (trimmed.length > 0) chunks.push(trimmed);
    buffer = '';
  };

  // The punctuation stays with the sentence it ends: an engine reads intonation
  // off it, and a question stripped of its question mark is read flat.
  for (const sentence of clean.split(/(?<=[.!?])\s+/)) {
    if (sentence.length > max) {
      flush();
      for (const piece of splitLong(sentence, max)) chunks.push(piece);
      continue;
    }
    if (buffer.length > 0 && buffer.length + 1 + sentence.length > max) flush();
    buffer = buffer.length > 0 ? `${buffer} ${sentence}` : sentence;
  }

  flush();
  return chunks;
}

/** A sentence longer than the limit: break on clauses, then on words. */
function splitLong(sentence: string, max: number): string[] {
  const out: string[] = [];
  let buffer = '';

  const flush = () => {
    if (buffer.trim().length > 0) out.push(buffer.trim());
    buffer = '';
  };

  for (const clause of sentence.split(/(?<=,)\s+/)) {
    if (buffer.length > 0 && buffer.length + 1 + clause.length > max) flush();

    if (clause.length > max) {
      flush();
      let line = '';
      for (const word of clause.split(' ')) {
        if (line.length > 0 && line.length + 1 + word.length > max) {
          out.push(line);
          line = '';
        }
        // A single word longer than the limit is not speech — a pasted url, a
        // run of characters from a mangled import. It still has to be cut, or
        // the piece it lands in defeats the whole point of chunking.
        if (word.length > max) {
          for (let at = 0; at < word.length; at += max) out.push(word.slice(at, at + max));
          continue;
        }
        line = line.length > 0 ? `${line} ${word}` : word;
      }
      buffer = line;
      continue;
    }

    buffer = buffer.length > 0 ? `${buffer} ${clause}` : clause;
  }

  flush();
  return out;
}

/* -------------------------------------------------------------------------- */
/* Plans                                                                      */
/* -------------------------------------------------------------------------- */

export interface UtterancePlanOptions {
  /** How the conversation engine wrote these words. */
  register: SpeechRegister;
  /** The Indian voice the user picked. Only decides Hinglish. */
  preferredLanguage?: SpeechLanguage;
  /** A specific browser voice, when one has been chosen. Advisory. */
  voice?: string | null;
  /**
   * Whose turns to speak. The agent's alone by default: the point of the
   * preview is to hear what AIBOT says, and voicing the lead as well would put
   * words into the mouth of a person who was never called.
   */
  speakers?: readonly SpeechSpeaker[];
}

/**
 * Turns a transcript into an ordered plan of things to say.
 *
 * Both ends of the abstraction call this — the server to describe a
 * conversation, the browser to play one — so the numbering has to be stable
 * whichever side is asking. Ids are taken from the line's position in the whole
 * transcript rather than from its position in the filtered plan, so the agent's
 * third line has the same id whether or not the lead's turns were included.
 */
export function planUtterances(
  transcript: string | null | undefined,
  options: UtterancePlanOptions
): SpeechUtterance[] {
  const speakers = options.speakers ?? (['AGENT'] as const);
  const language = spokenLanguageFor(options.register, options.preferredLanguage);

  return readTranscript(transcript)
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => speakers.includes(line.speaker))
    .map(({ line, index }) => ({
      id: `line-${index}`,
      speaker: line.speaker,
      text: speakableText(line.text),
      language,
      voice: options.voice ?? null,
    }))
    .filter((utterance) => utterance.text.length > 0);
}
