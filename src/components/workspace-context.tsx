'use client';

import { createContext, useContext } from 'react';
import { NO_CAPABILITIES, type WorkspaceCapabilities } from '@/domain/capabilities';
import type { WorkspaceIdentity } from '@/lib/workspace';

/**
 * The signed-in workspace, shared with whatever needs it.
 *
 * The shell already reads `/api/me` to put a name in the sidebar. Without this
 * every other part of the page that wants the same answer would fetch it
 * again — and worse, each would have its own loading state, so two parts of one
 * screen could disagree for a moment about what this workspace is allowed to
 * do. One read, one answer.
 *
 * Capabilities here decide what is *rendered*. They are not the permission: a
 * browser that edits this value gains a control whose server route refuses it.
 * Nothing behind a capability may rely on this context having been honest.
 */

const WorkspaceContext = createContext<WorkspaceIdentity | null>(null);

export function WorkspaceProvider({
  value,
  children,
}: {
  value: WorkspaceIdentity | null;
  children: React.ReactNode;
}) {
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

/** The workspace, or null until `/api/me` has answered. */
export function useWorkspaceIdentity(): WorkspaceIdentity | null {
  return useContext(WorkspaceContext);
}

/**
 * What this workspace may do.
 *
 * Everything is off while the answer is still in flight, which is the right
 * default in both directions: a control that appears a moment late is a
 * non-event, and one that flashes into view and disappears again is a bug
 * report.
 */
export function useCapabilities(): WorkspaceCapabilities {
  return useContext(WorkspaceContext)?.capabilities ?? NO_CAPABILITIES;
}
