import { IMPORT_FIELDS, type ColumnMapping, type DetectedColumn, type ImportField } from './types'

/**
 * Header aliases per field. Matching is done on a normalized form (lowercase,
 * punctuation and spacing removed), so "Phone Number", "phone_number" and
 * "Phone-Number" all collapse to the same key.
 *
 * Only headers that appear here are auto-mapped. Anything unrecognised is left
 * unmapped for the user to assign, rather than guessed at.
 */
const ALIASES: Record<ImportField, string[]> = {
  name: ['name', 'fullname', 'leadname', 'contactname', 'customername', 'personname', 'firstname'],
  phone: [
    'phone',
    'phonenumber',
    'mobile',
    'mobilenumber',
    'contactnumber',
    'contact',
    'phoneno',
    'mobileno',
    'telephone',
    'tel',
    'whatsapp',
    'whatsappnumber',
    'number',
  ],
  email: ['email', 'emailaddress', 'mail', 'emailid', 'e-mail'],
  company: ['company', 'companyname', 'organization', 'organisation', 'org', 'business', 'businessname', 'account'],
}

/** "Phone Number " -> "phonenumber"; "E-mail" -> "email". */
export function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\s._\-/\\()[\]]+/g, '')
    .trim()
}

function matchField(header: string): ImportField | null {
  const key = normalizeHeader(header)
  if (!key) return null

  for (const field of IMPORT_FIELDS) {
    if (ALIASES[field].includes(key)) return field
  }
  return null
}

/**
 * Inspect the header row and suggest a mapping.
 *
 * When two headers match the same field (say "Phone" and "Mobile"), the first
 * wins and both are flagged ambiguous so the UI can ask the user to confirm —
 * silently picking one and hiding the choice is how imports land in the wrong
 * column.
 */
export function detectColumns(headers: string[]): {
  columns: DetectedColumn[]
  mapping: ColumnMapping
} {
  const matches = headers.map((header) => matchField(header))
  const counts = new Map<ImportField, number>()

  for (const field of matches) {
    if (field) counts.set(field, (counts.get(field) ?? 0) + 1)
  }

  const mapping: ColumnMapping = { name: null, phone: null, email: null, company: null }
  const columns: DetectedColumn[] = headers.map((header, index) => {
    const suggested = matches[index]
    if (suggested && mapping[suggested] === null) mapping[suggested] = index
    return {
      index,
      header: header.trim(),
      suggested,
      ambiguous: suggested ? (counts.get(suggested) ?? 0) > 1 : false,
    }
  })

  return { columns, mapping }
}

/** Accepts a client-supplied mapping only if every index refers to a real column. */
export function sanitizeMapping(input: unknown, columnCount: number): ColumnMapping | null {
  if (typeof input !== 'object' || input === null) return null

  const record = input as Record<string, unknown>
  const mapping: ColumnMapping = { name: null, phone: null, email: null, company: null }

  for (const field of IMPORT_FIELDS) {
    const value = record[field]
    if (value === null || value === undefined) continue
    if (typeof value !== 'number' || !Number.isInteger(value)) return null
    if (value < 0 || value >= columnCount) return null
    mapping[field] = value
  }

  return mapping
}
