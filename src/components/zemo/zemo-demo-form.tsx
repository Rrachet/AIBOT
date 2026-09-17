'use client';

import { useState } from 'react';
import { Icon } from '@/components/icons';
import { ApiError } from '@/lib/api/client';
import { submitDemoRequest } from './zemo-actions';

/**
 * The demo request, inline in the conversation.
 *
 * Three fields, one optional. It confirms only after the server has written
 * the row — Zemo saying "done" for a request that never landed would be the
 * single most damaging thing this component could do.
 */
export function ZemoDemoForm({
  sourceRoute,
  onDone,
}: {
  sourceRoute: string;
  onDone: (summary: string) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const ready = name.trim() !== '' && email.trim() !== '';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready || busy) return;

    setBusy(true);
    setError(null);
    try {
      await submitDemoRequest({
        name: name.trim(),
        email: email.trim(),
        company: company.trim() || undefined,
        sourceRoute,
      });
      setSent(true);
      onDone(
        `Got it — ${name.trim()}, ${email.trim()}. Someone will come back to you. In the meantime you can create a workspace and run a campaign yourself; it costs nothing.`
      );
    } catch (caught) {
      const apiError = caught instanceof ApiError ? caught : null;
      setError(
        apiError?.fieldErrors.email ??
          apiError?.fieldErrors.name ??
          apiError?.message ??
          'I could not get that through.'
      );
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <p className="zemo-form-done">
        <Icon name="check" size={14} />
        Sent.
      </p>
    );
  }

  return (
    <form className="zemo-form" onSubmit={submit}>
      <label className="zemo-field">
        <span>Name</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Priya Sharma"
          maxLength={120}
          autoComplete="name"
          required
        />
      </label>
      <label className="zemo-field">
        <span>Email</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
          maxLength={200}
          autoComplete="email"
          required
        />
      </label>
      <label className="zemo-field">
        <span>
          Company <em>optional</em>
        </span>
        <input
          value={company}
          onChange={(event) => setCompany(event.target.value)}
          placeholder="Skyline Homes"
          maxLength={160}
          autoComplete="organization"
        />
      </label>

      {error ? (
        <p className="zemo-form-error" role="alert">
          {error}
        </p>
      ) : null}

      <button type="submit" className="primary-button sm" disabled={!ready || busy}>
        {busy ? 'Sending…' : 'Send it'}
      </button>
    </form>
  );
}
