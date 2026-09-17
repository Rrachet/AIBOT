'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/icons';
import { ZemoAvatar, type ZemoMood } from './zemo-avatar';
import { ZemoDemoForm } from './zemo-demo-form';
import type { ZemoMessage } from './zemo-provider';

/**
 * The conversation.
 *
 * A floating panel on desktop, a bottom sheet on a phone — same markup, the
 * difference is entirely in CSS. Focus moves into the field on open and
 * returns to the launcher on close, Escape closes, and the transcript is a
 * polite live region so a screen reader hears replies without being yanked
 * out of whatever it was reading.
 */
export function ZemoPanel({
  messages,
  mood,
  busy,
  route,
  onSend,
  onClose,
  onSuggestion,
  onFormDone,
}: {
  messages: ZemoMessage[];
  mood: ZemoMood;
  busy: boolean;
  route: string;
  onSend: (text: string) => void;
  onClose: () => void;
  onSuggestion: (text: string) => void;
  onFormDone: (summary: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Keep the newest message in view without hijacking the whole page's scroll.
  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, busy]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = inputRef.current?.value.trim();
    if (!value) return;
    onSend(value);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div
      className="zemo-panel"
      role="dialog"
      aria-label="Zemo"
      aria-modal="false"
      ref={panelRef}
    >
      <header className="zemo-panel-head">
        <ZemoAvatar size={30} mood={mood} />
        <div>
          <strong>Zemo</strong>
          <span>Your AIBOT sidekick</span>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close Zemo">
          <Icon name="close" size={16} />
        </button>
      </header>

      <div className="zemo-thread" ref={scrollRef} aria-live="polite" aria-busy={busy}>
        {messages.map((message) => (
          <div key={message.id} className={`zemo-turn is-${message.role}`}>
            {message.role === 'zemo' ? <ZemoAvatar size={22} mood="idle" /> : null}
            <div className="zemo-bubble-group">
              <p className="zemo-bubble">{message.text}</p>

              {message.navigate ? (
                <Link className="zemo-go" href={message.navigate.href} onClick={onClose}>
                  {message.navigate.label}
                  <Icon name="arrowRight" size={14} />
                </Link>
              ) : null}

              {message.form === 'demo-request' ? (
                <ZemoDemoForm sourceRoute={route} onDone={onFormDone} />
              ) : null}

              {message.suggestions?.length ? (
                <div className="zemo-chips">
                  {message.suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="zemo-chip"
                      onClick={() => onSuggestion(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ))}

        {busy ? (
          <div className="zemo-turn is-zemo">
            <ZemoAvatar size={22} mood="thinking" />
            <p className="zemo-bubble zemo-typing" aria-label="Zemo is thinking">
              <span />
              <span />
              <span />
            </p>
          </div>
        ) : null}
      </div>

      <form className="zemo-composer" onSubmit={submit}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Ask me about AIBOT"
          aria-label="Message Zemo"
          maxLength={400}
          autoComplete="off"
        />
        <button type="submit" className="zemo-send" aria-label="Send">
          <Icon name="send" size={15} />
        </button>
      </form>
    </div>
  );
}
