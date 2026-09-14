import type { LeadSource } from '@/domain/types'

/** The lead fields an import can populate. `phone` is the only required one. */
export const IMPORT_FIELDS = ['name', 'phone', 'email', 'company'] as const
export type ImportField = (typeof IMPORT_FIELDS)[number]

export const IMPORT_FIELD_LABEL: Record<ImportField, string> = {
  name: 'Name',
  phone: 'Phone',
  email: 'Email',
  company: 'Company',
}

/** A column mapping: target field -> index of the source column, or null. */
export type ColumnMapping = Record<ImportField, number | null>

export interface DetectedColumn {
  index: number
  header: string
  /** Field this header was matched to, if any. */
  suggested: ImportField | null
  /** True when more than one header matched the same field, so the user must choose. */
  ambiguous: boolean
}

export interface ImportPreview {
  fileName: string
  fileKind: 'CSV' | 'XLSX'
  source: LeadSource
  totalRows: number
  columns: DetectedColumn[]
  mapping: ColumnMapping
  /** First few mapped rows, for the user to sanity-check the mapping. */
  sample: Array<Partial<Record<ImportField, string>>>
  /** True when no header could be matched to `phone`; the user must pick one. */
  needsPhoneColumn: boolean
}

export type RowIssue =
  | 'PHONE_MISSING'
  | 'PHONE_INVALID'
  | 'EMAIL_INVALID'
  | 'DUPLICATE_IN_FILE'
  | 'DUPLICATE_IN_WORKSPACE'
  | 'INSERT_FAILED'

export interface RowError {
  /** 1-based row number as the user sees it in their spreadsheet (header = row 1). */
  row: number
  issue: RowIssue
  message: string
}

export interface ImportResult {
  totalRows: number
  imported: number
  duplicates: number
  invalid: number
  failed: number
  errors: RowError[]
}
