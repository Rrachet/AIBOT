import type { ImportField, RowIssue } from './types'

export interface NormalizedRow {
  /** 1-based spreadsheet row number, header included. */
  row: number
  name: string | null
  phone: string
  email: string | null
  company: string | null
  /** Comparison key used for duplicate detection. */
  phoneKey: string
}

export interface InvalidRow {
  row: number
  issue: Extract<RowIssue, 'PHONE_MISSING' | 'PHONE_INVALID' | 'EMAIL_INVALID'>
  message: string
}

/** Collapses internal runs of whitespace and trims; empty becomes null. */
function clean(value: string | undefined | null): string | null {
  if (value === undefined || value === null) return null
  const trimmed = String(value).replace(/\s+/g, ' ').trim()
  return trimmed === '' ? null : trimmed
}

/**
 * Digits of a phone number, used only for comparison — never stored.
 *
 * National and international spellings of the same number must collapse
 * together, so numbers of more than ten digits compare on their last ten:
 * "+91 98765 43210", "919876543210" and "9876543210" share the key
 * "9876543210". Shorter numbers compare in full. This is deliberately a
 * heuristic: two genuinely different numbers from different countries that
 * share their last ten digits would be treated as the same lead, and the
 * consequence is a reported skip, never an overwrite.
 */
export function phoneComparisonKey(phone: string): string {
  const digits = phone.replace(/\D+/g, '')
  return digits.length > 10 ? digits.slice(-10) : digits
}

/** Mirrors the phone rule the single-lead API enforces (5-40 characters). */
function phoneIssue(raw: string | null): InvalidRow['issue'] | null {
  if (!raw) return 'PHONE_MISSING'
  const digits = raw.replace(/\D+/g, '')
  if (digits.length < 5 || raw.length > 40) return 'PHONE_INVALID'
  return null
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const MESSAGES: Record<InvalidRow['issue'], string> = {
  PHONE_MISSING: 'phone number missing',
  PHONE_INVALID: 'phone number is not valid',
  EMAIL_INVALID: 'invalid email address',
}

/**
 * Turn one raw spreadsheet row into a lead, or explain why it cannot be one.
 *
 * Returns `null` for a row that is entirely empty — blank lines between
 * records are normal in exported spreadsheets and are not errors.
 */
export function normalizeRow(
  cells: string[],
  mapping: Record<ImportField, number | null>,
  rowNumber: number
): { lead: NormalizedRow } | { invalid: InvalidRow } | null {
  const pick = (field: ImportField): string | null => {
    const index = mapping[field]
    if (index === null) return null
    return clean(cells[index])
  }

  const name = pick('name')
  const phone = pick('phone')
  const email = pick('email')
  const company = pick('company')

  // A row with nothing in any mapped column, and nothing anywhere else, is skipped silently.
  if (!name && !phone && !email && !company && cells.every((cell) => clean(cell) === null)) {
    return null
  }

  const phoneProblem = phoneIssue(phone)
  if (phoneProblem) {
    return { invalid: { row: rowNumber, issue: phoneProblem, message: MESSAGES[phoneProblem] } }
  }

  if (email && !EMAIL_PATTERN.test(email)) {
    return { invalid: { row: rowNumber, issue: 'EMAIL_INVALID', message: MESSAGES.EMAIL_INVALID } }
  }

  // phone is non-null here: phoneIssue() returns PHONE_MISSING otherwise.
  const phoneValue = phone as string

  return {
    lead: {
      row: rowNumber,
      name,
      phone: phoneValue,
      email,
      company,
      phoneKey: phoneComparisonKey(phoneValue),
    },
  }
}
