'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/icons';
import { ApiError } from '@/lib/api/client';
import { fetchWorkspace, renameWorkspace } from '@/lib/workspace';

/**
 * Workspace settings.
 *
 * The name is read from and written to the workspace the session belongs to —
 * the browser never says which one that is. Save stays disabled while the
 * field is unchanged or empty, so the only time it can be pressed is the one
 * time pressing it does something.
 *
 * There is deliberately no "business description" field here. The column does
 * not exist, and a field that accepts input it cannot store is worse than no
 * field: the agent's background context is set per agent, where it is read.
 */

type LoadState =
  | { phase: 'loading' }
  | { phase: 'ready'; saved: string }
  | { phase: 'error'; message: string };

export function WorkspaceForm() {
  const [state, setState] = useState<LoadState>({ phase: 'loading' });
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();

    void fetchWorkspace(controller.signal)
      .then((workspace) => {
        if (controller.signal.aborted) return;
        const current = workspace?.workspaceName ?? '';
        setName(current);
        setState({ phase: 'ready', saved: current });
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;
        const apiError = caught instanceof ApiError ? caught : null;
        setState({
          phase: 'error',
          message: apiError?.message ?? 'We could not reach the server.',
        });
      });

    return () => {
      mounted.current = false;
      controller.abort();
    };
  }, []);

  const trimmed = name.trim();
  const dirty = state.phase === 'ready' && trimmed !== '' && trimmed !== state.saved;

  const save = async () => {
    if (!dirty) return;
    setBusy(true);
    setError(null);
    setSaved(false);

    try {
      const workspace = await renameWorkspace(trimmed);
      if (!mounted.current) return;
      setName(workspace.workspaceName);
      setState({ phase: 'ready', saved: workspace.workspaceName });
      setSaved(true);
    } catch (caught) {
      if (!mounted.current) return;
      const apiError = caught instanceof ApiError ? caught : null;
      setError(
        apiError?.fieldErrors.name ??
          apiError?.message ??
          'We could not save your workspace name.'
      );
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  if (state.phase === 'error') {
    return (
      <p className="form-alert" role="alert">
        {state.message}
      </p>
    );
  }

  return (
    <form
      className="form-grid"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <label className="field">
        <span className="field-label">Workspace name</span>
        <input
          className="field-input"
          name="workspaceName"
          value={name}
          placeholder={state.phase === 'loading' ? 'Loading…' : undefined}
          disabled={state.phase === 'loading'}
          maxLength={120}
          autoComplete="organization"
          aria-invalid={error ? true : undefined}
          onChange={(event) => {
            setName(event.target.value);
            setError(null);
            setSaved(false);
          }}
        />
        <span className="field-hint">
          Shown in the sidebar and on everything this workspace owns.
        </span>
        {error ? (
          <span className="field-error" role="alert">
            {error}
          </span>
        ) : null}
      </label>

      <div className="form-actions">
        <button type="submit" className="primary-button" disabled={!dirty || busy}>
          {busy ? 'Saving…' : 'Save changes'}
        </button>
        {saved && !dirty ? (
          <span className="form-saved" role="status">
            <Icon name="check" size={14} />
            Saved
          </span>
        ) : null}
      </div>
    </form>
  );
}
