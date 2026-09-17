import 'server-only';
import type { WorkspaceCapabilities } from '@/domain/capabilities';

/**
 * Where a workspace's capabilities are decided.
 *
 * One function, called with a workspace id that `requireAuth` resolved from the
 * session. Nothing in the browser can influence the answer, and no other module
 * needs to know how it was reached — which is what makes the eventual move to a
 * `workspaces.capabilities` column a change to this file alone.
 *
 * Today the source is deployment configuration: a list of workspace ids, set on
 * the server. That is enough for one demo workspace and has two properties a
 * database column would not have yet — it needs no migration, and it cannot be
 * granted by anything a user does inside the product.
 *
 * Why ids rather than an email or a workspace name:
 *
 *   An email identifies a person, and capabilities belong to a workspace. The
 *   same person can be in two workspaces, and a workspace outlives whoever
 *   created it.
 *
 *   A name is editable from Settings by any owner or admin, so granting on a
 *   name would let a customer grant themselves the capability by renaming their
 *   workspace. An id cannot be chosen.
 */

/**
 * Workspace ids allowed to preview a test call as speech, comma or
 * whitespace separated. Unset means nobody, which is the correct default for
 * every deployment that is not the demo.
 */
const LIVE_VOICE_PREVIEW = 'LIVE_VOICE_PREVIEW_WORKSPACE_IDS';

/**
 * Read per call rather than at module load.
 *
 * The lists are a handful of ids, so parsing costs nothing measurable, and
 * caching would mean a changed environment variable needed a rebuild to take
 * effect — the kind of thing that wastes an afternoon when a flag appears not
 * to work.
 */
function allowList(name: string): Set<string> {
  const raw = process.env[name];
  if (!raw) return new Set();

  return new Set(
    raw
      .split(/[\s,]+/)
      .map((id) => id.trim().toLowerCase())
      .filter((id) => id.length > 0)
  );
}

/** What this workspace may do. Everything is off unless it was explicitly turned on. */
export function capabilitiesFor(workspaceId: string): WorkspaceCapabilities {
  const id = workspaceId.trim().toLowerCase();
  if (id.length === 0) return { liveVoicePreview: false };

  return {
    liveVoicePreview: allowList(LIVE_VOICE_PREVIEW).has(id),
  };
}
