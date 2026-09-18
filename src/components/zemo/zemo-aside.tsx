'use client';

import { useVoicePreviewState } from '@/components/speech/voice-preview-state';
import { ZemoAvatar } from './zemo-avatar';
import { voiceAsideFor } from './zemo-voice';

/**
 * Zemo, beside the voice preview.
 *
 * Zemo normally rides the bottom rim of the page, but the preview lives in a
 * modal dialog: while that is open everything outside it is inert, so the rim
 * Zemo is not merely ignored, it cannot be reached. Rather than fight the
 * dialog — a floating card over a demo is exactly the interruption this
 * assistant is not — Zemo says its one line from inside it, as part of the
 * panel rather than on top of it.
 *
 * One line, from the typed preview state, changing only when the preview does.
 * No avatar chatter between scenarios, nothing while a conversation is being
 * prepared, and nothing that has to be read while a voice is speaking.
 */
export function ZemoVoiceAside() {
  const state = useVoicePreviewState();
  const line = voiceAsideFor(state);
  if (!line) return null;

  return (
    <aside className="zemo-aside">
      <ZemoAvatar size={22} mood={line.mood} seed="zemo-aside" />
      <span>{line.text}</span>
    </aside>
  );
}
