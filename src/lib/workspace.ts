import { asString, isRecord, request } from '@/lib/api/client'

/** Client-side boundary for `/api/me`. */

export interface WorkspaceIdentity {
  workspaceId: string
  workspaceName: string
  role: string
}

/**
 * The workspace the session actually belongs to.
 *
 * Resolved server-side from `workspace_members` by `requireAuth`; the browser
 * never asserts which workspace it is in, and the shell renders whatever comes
 * back rather than a name compiled into the build.
 */
export async function fetchWorkspace(signal?: AbortSignal): Promise<WorkspaceIdentity | null> {
  const data = await request('/api/me', {
    method: 'GET',
    signal,
    fallback: 'The server did not return your workspace.',
  })

  if (!isRecord(data)) return null

  const workspaceId = asString(data.workspaceId)
  if (!workspaceId) return null

  return {
    workspaceId,
    workspaceName: asString(data.workspaceName) ?? '',
    role: asString(data.role) ?? '',
  }
}

/** Avatar letter for a workspace name, e.g. "Demo Workspace" -> "D". */
export function workspaceInitial(name: string): string {
  return name.trim()[0]?.toUpperCase() ?? '·'
}
