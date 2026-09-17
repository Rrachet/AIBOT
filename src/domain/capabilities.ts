import { z } from 'zod';

/**
 * What a workspace is allowed to do beyond the product everyone gets.
 *
 * This exists because the alternative is a line like `if (email ===
 * 'demo@aibot.app')` buried in a component, and that line is wrong in three
 * separate ways: it is an authorisation decision made in the browser, it ties a
 * feature to a person rather than to a workspace, and it is invisible to
 * everyone who does not already know to grep for it. A capability is none of
 * those — it is named, it is resolved server-side from the workspace the
 * session actually belongs to, and it appears in one place.
 *
 * Deny by default, always. An unconfigured deployment, a workspace that does
 * not exist, a value that fails to parse: every one of those reads as `false`.
 * A capability that defaulted to on would grant itself to every workspace the
 * moment a lookup went wrong.
 *
 * Today the resolver reads configuration (see `src/server/capabilities.ts`).
 * The shape is deliberately the shape of a row, so moving it into the database
 * later is a change of resolver and nothing else: nothing outside that file
 * knows where the answer came from.
 */

export interface WorkspaceCapabilities {
  /**
   * Whether this workspace may hear a test call read aloud in the browser.
   *
   * Off for normal workspaces. The preview uses the voices already installed on
   * the person's own machine — it places no call, contacts no telephony or
   * speech service, and costs nothing — but it is still a demonstration
   * feature, and a control that reads "Hear AI live" would be a promise the
   * product does not yet make to a paying customer.
   */
  liveVoicePreview: boolean;
}

export const NO_CAPABILITIES: WorkspaceCapabilities = Object.freeze({
  liveVoicePreview: false,
});

/**
 * Unknown keys are dropped rather than rejected, so capabilities written by an
 * older or newer build cannot fail a read, and an unrecognised flag from
 * somewhere else cannot smuggle itself through.
 */
export const capabilitiesSchema = z
  .object({
    liveVoicePreview: z.boolean().default(false),
  })
  .strip();

/** Parses a value of unknown provenance, denying everything on a bad one. */
export function readCapabilities(value: unknown): WorkspaceCapabilities {
  const parsed = capabilitiesSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : NO_CAPABILITIES;
}
