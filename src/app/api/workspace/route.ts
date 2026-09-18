import { z } from 'zod'
import { requireAuth } from '@/lib/api/auth'
import { capabilitiesFor } from '@/server/capabilities'
import { COUNTRY_CODE_PATTERN, looksLikePhone, type BusinessContact } from '@/domain/business-contact'

/**
 * The workspace the session belongs to: its name, and how to reach the
 * business behind it.
 *
 * The id is never taken from the request: `requireAuth` resolves it from
 * `workspace_members` for the authenticated user, and the update is filtered by
 * that id. The `workspace_update` RLS policy narrows it further to owners and
 * admins, so a member without the role gets no rows back and is told they
 * cannot change the settings rather than silently appearing to succeed.
 *
 * The business contact fields are configuration, not credentials — a phone
 * number a business publishes anyway. Nothing here connects a provider, dials
 * a number, sends a message or verifies anything.
 */

/**
 * Blank means "clear this", not "leave it alone".
 *
 * A field the person emptied and saved has to end up NULL, and a field they
 * did not touch has to be absent from the request entirely. Collapsing the
 * empty string to null here keeps those two cases distinct all the way to the
 * update, which only names the keys it was actually given.
 */
const blank = (value: unknown) => (typeof value === 'string' && value.trim() === '' ? null : value)

const optionalText = (max: number, message: string) =>
  z.preprocess(blank, z.string().trim().max(max, message).nullable().optional())

const optionalPhone = (label: string) =>
  z.preprocess(
    blank,
    z
      .string()
      .trim()
      .max(32, `${label} is too long.`)
      .refine(looksLikePhone, `${label} does not look like a phone number. Try +91 98765 43210.`)
      .nullable()
      .optional()
  )

const updateSchema = z
  .object({
    name: z.string().trim().min(1, 'Give your workspace a name.').max(120).optional(),
    businessName: optionalText(120, 'That business name is too long.'),
    businessPhone: optionalPhone('The business number'),
    whatsappNumber: optionalPhone('The WhatsApp number'),
    whatsappDisplayName: optionalText(60, 'That display name is too long.'),
    defaultCountryCode: z.preprocess(
      blank,
      z
        .string()
        .trim()
        .regex(COUNTRY_CODE_PATTERN, 'A country code looks like +91.')
        .nullable()
        .optional()
    ),
    businessEmail: z.preprocess(
      blank,
      z
        .string()
        .trim()
        .email('That email does not look right.')
        .max(200, 'That email is too long.')
        .nullable()
        .optional()
    ),
  })
  .refine((body) => Object.keys(body).length > 0, { message: 'There was nothing to save.' })

type UpdateBody = z.infer<typeof updateSchema>

/** Camel case on the wire, snake case in the database. */
const COLUMNS = {
  name: 'name',
  businessName: 'business_name',
  businessPhone: 'business_phone',
  whatsappNumber: 'whatsapp_number',
  whatsappDisplayName: 'whatsapp_display_name',
  defaultCountryCode: 'default_country_code',
  businessEmail: 'business_email',
} as const satisfies Record<keyof UpdateBody, string>

const SELECT = 'id, name, business_name, business_phone, whatsapp_number, whatsapp_display_name, default_country_code, business_email'

interface WorkspaceRow {
  id: string
  name: string
  business_name: string | null
  business_phone: string | null
  whatsapp_number: string | null
  whatsapp_display_name: string | null
  default_country_code: string | null
  business_email: string | null
}

function contactOf(row: WorkspaceRow): BusinessContact {
  return {
    businessName: row.business_name,
    businessPhone: row.business_phone,
    whatsappNumber: row.whatsapp_number,
    whatsappDisplayName: row.whatsapp_display_name,
    defaultCountryCode: row.default_country_code,
    businessEmail: row.business_email,
  }
}

export async function GET(request: Request) {
  const auth = await requireAuth(request)
  if (auth instanceof Response) return auth

  const { data, error } = await auth.supabase
    .from('workspaces')
    .select(SELECT)
    .eq('id', auth.workspaceId)
    .maybeSingle<WorkspaceRow>()

  if (error) {
    return Response.json(
      { error: { code: 'WORKSPACE_READ_FAILED', message: error.message } },
      { status: 500 }
    )
  }

  return Response.json({
    data: {
      workspaceId: auth.workspaceId,
      workspaceName: data?.name ?? auth.workspaceName,
      role: auth.role,
      capabilities: capabilitiesFor(auth.workspaceId),
      ...(data ? { businessContact: contactOf(data) } : {}),
    },
  })
}

export async function PATCH(request: Request) {
  const auth = await requireAuth(request)
  if (auth instanceof Response) return auth

  const body = await request.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() } },
      { status: 400 }
    )
  }

  // Only the fields that were sent. Anything absent keeps whatever it had, so
  // the workspace form and the business contact form can save independently
  // without either one wiping the other's work.
  const update: Record<string, string | null> = {}
  for (const [field, column] of Object.entries(COLUMNS)) {
    const value = parsed.data[field as keyof UpdateBody]
    if (value !== undefined) update[column] = value
  }

  if (Object.keys(update).length === 0) {
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', message: 'There was nothing to save.' } },
      { status: 400 }
    )
  }

  const { data, error } = await auth.supabase
    .from('workspaces')
    .update(update)
    .eq('id', auth.workspaceId)
    .select(SELECT)
    .maybeSingle<WorkspaceRow>()

  if (error) {
    return Response.json(
      { error: { code: 'WORKSPACE_UPDATE_FAILED', message: error.message } },
      { status: 500 }
    )
  }

  // No row came back although the workspace exists: RLS refused the update
  // because this member is neither owner nor admin.
  if (!data) {
    return Response.json(
      {
        error: {
          code: 'WORKSPACE_FORBIDDEN',
          message: 'Only an owner or admin can change these settings.',
        },
      },
      { status: 403 }
    )
  }

  // Capabilities are resolved from the id, which none of this can change. They
  // are returned so the caller's picture of the workspace stays complete rather
  // than silently losing them on a save.
  return Response.json({
    data: {
      workspaceId: data.id,
      workspaceName: data.name,
      role: auth.role,
      capabilities: capabilitiesFor(auth.workspaceId),
      businessContact: contactOf(data),
    },
  })
}
