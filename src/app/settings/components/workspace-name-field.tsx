'use client';

import { useEffect, useState } from 'react';
import { fetchWorkspace } from '@/lib/workspace';

/**
 * The workspace name field, filled from the workspace the session actually
 * belongs to.
 *
 * It starts empty rather than with a plausible placeholder: a name compiled
 * into the build would be somebody else's, and showing it in an editable field
 * invites the user to "correct" a value that was never theirs.
 */
export function WorkspaceNameField() {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetchWorkspace(controller.signal)
      .then((workspace) => {
        if (!controller.signal.aborted) setName(workspace?.workspaceName ?? '');
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  return (
    <label className="field">
      <span className="field-label">Workspace name</span>
      <input
        className="field-input"
        name="workspaceName"
        value={name ?? ''}
        placeholder={name === null ? 'Loading…' : undefined}
        onChange={(event) => setName(event.target.value)}
        autoComplete="organization"
      />
    </label>
  );
}
