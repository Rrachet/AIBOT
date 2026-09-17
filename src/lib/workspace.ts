import { ApiError, asString, isRecord, request } from '@/lib/api/client'
import { readCapabilities, type WorkspaceCapabilities } from '@/domain/capabilities'

/** Client-side boundary for `/api/me`. */

export interface WorkspaceIdentity {
  workspaceId: string
  workspaceName: string
  role: string
  /**
   * What this workspace may do beyond the product everyone gets.
   *
   * Resolved server-side and sent here so the shell knows which controls to
   * render. It decides what is *shown*, never what is *allowed* — every
   * capability is checked again on the server where it is acted on, so a
   * browser that flipped one of these gains a button and nothing behind it.
   */
  capabilities: WorkspaceCapabilities
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
    capabilities: readCapabilities(data.capabilities),
  }
}

/**
 * Renames the workspace the session belongs to.
 *
 * The id is not sent: the server resolves it from the session and the RLS
 * policy decides whether this member may rename it, so a member without the
 * role gets a 403 rather than a silent no-op.
 */
export async function renameWorkspace(name: string): Promise<WorkspaceIdentity> {
  const data = await request('/api/workspace', {
    method: 'PATCH',
    body: JSON.stringify({ name }),
    fallback: 'The server could not save your workspace name. Please try again.',
  })

  if (!isRecord(data)) {
    throw new ApiError('The workspace was saved but could not be read back.', { status: 200 })
  }

  return {
    workspaceId: asString(data.workspaceId) ?? '',
    workspaceName: asString(data.workspaceName) ?? name,
    role: asString(data.role) ?? '',
    capabilities: readCapabilities(data.capabilities),
  }
}

/** Avatar letter for a workspace name, e.g. "Demo Workspace" -> "D". */
export function workspaceInitial(name: string): string {
  return name.trim()[0]?.toUpperCase() ?? '·'
}
