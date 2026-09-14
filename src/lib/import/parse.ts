import 'server-only'
import Papa from 'papaparse'
import readXlsxFile from 'read-excel-file/node'

/** Upper bounds. A lead list is small; anything larger is a mistake or an attack. */
export const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5 MB
export const MAX_ROWS = 5000

export type FileKind = 'CSV' | 'XLSX'

export class ImportParseError extends Error {
  readonly code:
    | 'UNSUPPORTED_FILE_TYPE'
    | 'FILE_TOO_LARGE'
    | 'TOO_MANY_ROWS'
    | 'EMPTY_FILE'
    | 'NO_HEADER_ROW'
    | 'MALFORMED_FILE'

  constructor(code: ImportParseError['code'], message: string) {
    super(message)
    this.name = 'ImportParseError'
    this.code = code
  }
}

export interface ParsedSheet {
  headers: string[]
  /** Data rows only; each is padded to the header length. */
  rows: string[][]
}

/**
 * Decide the file kind from the extension, cross-checked against the MIME type
 * when the browser supplies a useful one. Extension is authoritative because
 * browsers are inconsistent about spreadsheet MIME types, but an extension that
 * contradicts a recognised MIME type is rejected rather than guessed at.
 */
export function detectFileKind(fileName: string, mimeType: string): FileKind {
  const extension = fileName.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? ''

  if (extension === 'csv') return 'CSV'
  if (extension === 'xlsx') return 'XLSX'

  if (extension === 'xls') {
    throw new ImportParseError(
      'UNSUPPORTED_FILE_TYPE',
      'Legacy .xls files are not supported. Save the file as .xlsx or .csv and try again.'
    )
  }

  throw new ImportParseError(
    'UNSUPPORTED_FILE_TYPE',
    `Unsupported file type${extension ? ` (.${extension})` : ''}. Upload a .csv or .xlsx file.`
  )
}

function toText(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'number') {
    // Spreadsheets store phone numbers as numbers surprisingly often; keep all
    // digits rather than letting exponent notation through.
    return Number.isInteger(value) ? value.toFixed(0) : String(value)
  }
  return String(value)
}

function finish(table: string[][]): ParsedSheet {
  // Drop leading blank lines so a file with padding above the header still works.
  while (table.length > 0 && table[0].every((cell) => cell.trim() === '')) table.shift()

  if (table.length === 0) {
    throw new ImportParseError('EMPTY_FILE', 'That file has no rows.')
  }

  const headers = table[0].map((cell) => cell.trim())
  if (headers.every((header) => header === '')) {
    throw new ImportParseError('NO_HEADER_ROW', 'The first row must contain column headers.')
  }

  const body = table.slice(1)
  if (body.length > MAX_ROWS) {
    throw new ImportParseError(
      'TOO_MANY_ROWS',
      `That file has ${body.length.toLocaleString()} rows. Import at most ${MAX_ROWS.toLocaleString()} at a time.`
    )
  }

  const width = headers.length
  const rows = body.map((row) => {
    const padded = row.slice(0, width)
    while (padded.length < width) padded.push('')
    return padded
  })

  return { headers, rows }
}

function parseCsv(text: string): ParsedSheet {
  // Strip a UTF-8 BOM, which Excel writes and which would otherwise become
  // part of the first header name.
  const cleaned = text.replace(/^﻿/, '')

  const result = Papa.parse<string[]>(cleaned, {
    skipEmptyLines: 'greedy',
    // Header handling is ours: we need the raw first row to offer mapping.
    header: false,
  })

  // Papa reports delimiter/quote problems per row. Structural failures matter;
  // a stray "too many fields" on one line does not sink the whole file, since
  // finish() pads and trims rows to the header width.
  const fatal = result.errors.find((error) => error.type === 'Delimiter' || error.code === 'UndetectableDelimiter')
  if (fatal) {
    throw new ImportParseError('MALFORMED_FILE', 'That CSV could not be read. Check the delimiter and quoting.')
  }

  return finish(result.data.map((row) => row.map(toText)))
}

/** `[{ sheet, data }]`, the shape returned for a multi-sheet workbook. */
function isSheetList(value: unknown): value is Array<{ sheet: string; data: unknown[][] }> {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    typeof value[0] === 'object' &&
    value[0] !== null &&
    Array.isArray((value[0] as { data?: unknown }).data)
  )
}

async function parseXlsx(buffer: Buffer): Promise<ParsedSheet> {
  let result: unknown

  try {
    result = await readXlsxFile(buffer)
  } catch {
    throw new ImportParseError(
      'MALFORMED_FILE',
      'That Excel file could not be read. Re-save it as .xlsx or export it as CSV.'
    )
  }

  // Reading from a Buffer returns every worksheet as { sheet, data }, while
  // other inputs return rows directly. Accept both and always take the first
  // worksheet, so additional sheets in the workbook are ignored.
  const table: unknown[][] = isSheetList(result)
    ? result[0].data
    : (result as unknown as unknown[][])

  if (!Array.isArray(table)) {
    throw new ImportParseError('MALFORMED_FILE', 'That Excel file could not be read.')
  }

  return finish(table.map((row) => (Array.isArray(row) ? row.map(toText) : [])))
}

/**
 * Parse an uploaded spreadsheet into a header row and data rows.
 * Throws `ImportParseError` for anything the user needs to fix.
 */
export async function parseImportFile(file: File): Promise<{ kind: FileKind; sheet: ParsedSheet }> {
  const kind = detectFileKind(file.name, file.type)

  if (file.size > MAX_FILE_BYTES) {
    throw new ImportParseError(
      'FILE_TOO_LARGE',
      `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_FILE_BYTES / 1024 / 1024} MB.`
    )
  }

  if (file.size === 0) {
    throw new ImportParseError('EMPTY_FILE', 'That file is empty.')
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  return kind === 'CSV'
    ? { kind, sheet: parseCsv(buffer.toString('utf8')) }
    : { kind, sheet: await parseXlsx(buffer) }
}
