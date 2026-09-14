import { requireAuth, type AuthContext } from '@/lib/api/auth'
import { detectColumns, sanitizeMapping } from '@/lib/import/mapping'
import { normalizeRow, phoneComparisonKey, type InvalidRow, type NormalizedRow } from '@/lib/import/normalize'
import { ImportParseError, MAX_FILE_BYTES, parseImportFile } from '@/lib/import/parse'
import type {
  ColumnMapping,
  ImportField,
  ImportPreview,
  ImportResult,
  RowError,
} from '@/lib/import/types'
import type { LeadSource } from '@/domain/types'

/** Rows per insert. Large enough to avoid chatter, small enough to isolate failures. */
const BATCH_SIZE = 500
/** Row-level errors returned to the browser; the counts always reflect every row. */
const MAX_REPORTED_ERRORS = 100

function fail(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status })
}

/**
 * POST /api/leads/import
 *
 * multipart/form-data:
 *   file    - .csv or .xlsx
 *   mode    - "preview" (default) or "commit"
 *   mapping - JSON object of field -> column index, required for "commit"
 *
 * The file is uploaded twice across the two steps rather than being stored
 * between them: the server stays the only thing that parses it, and nothing
 * needs a storage bucket or a cleanup job.
 *
 * The workspace always comes from the authenticated session. A workspace id in
 * the form data or in a spreadsheet column is ignored — there is no code path
 * that reads one.
 */
export async function POST(request: Request) {
  const auth = await requireAuth(request)
  if (auth instanceof Response) return auth

  // Reject oversized uploads before reading the body into memory.
  const declaredLength = Number(request.headers.get('content-length') ?? '0')
  if (declaredLength > MAX_FILE_BYTES + 64 * 1024) {
    return fail(
      'FILE_TOO_LARGE',
      `That file is too large. The limit is ${MAX_FILE_BYTES / 1024 / 1024} MB.`,
      413
    )
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return fail('INVALID_REQUEST', 'Upload the file as multipart/form-data.', 400)
  }

  const file = form.get('file')
  if (!(file instanceof File)) {
    return fail('FILE_REQUIRED', 'Choose a .csv or .xlsx file to import.', 400)
  }

  let parsed: Awaited<ReturnType<typeof parseImportFile>>
  try {
    parsed = await parseImportFile(file)
  } catch (error) {
    if (error instanceof ImportParseError) {
      const status = error.code === 'UNSUPPORTED_FILE_TYPE' ? 415 : error.code === 'FILE_TOO_LARGE' ? 413 : 422
      return fail(error.code, error.message, status)
    }
    return fail('IMPORT_FAILED', 'That file could not be read.', 422)
  }

  const { kind, sheet } = parsed
  const detected = detectColumns(sheet.headers)
  const mode = form.get('mode') === 'commit' ? 'commit' : 'preview'

  if (mode === 'preview') {
    const preview: ImportPreview = {
      fileName: file.name,
      fileKind: kind,
      source: sourceFor(kind),
      totalRows: sheet.rows.length,
      columns: detected.columns,
      mapping: detected.mapping,
      sample: buildSample(sheet.rows, detected.mapping),
      needsPhoneColumn: detected.mapping.phone === null,
    }
    return Response.json({ data: preview })
  }

  // ---- commit ----------------------------------------------------------
  const rawMapping = form.get('mapping')
  const mapping =
    typeof rawMapping === 'string'
      ? sanitizeMapping(safeJson(rawMapping), sheet.headers.length)
      : null

  if (!mapping) {
    return fail('INVALID_MAPPING', 'The column mapping is not valid for this file.', 400)
  }
  if (mapping.phone === null) {
    return fail('PHONE_COLUMN_REQUIRED', 'Choose which column holds the phone number.', 400)
  }

  const candidates: NormalizedRow[] = []
  const invalid: InvalidRow[] = []

  sheet.rows.forEach((cells, index) => {
    // +2: the header occupies row 1, and rows are 1-based in a spreadsheet.
    const outcome = normalizeRow(cells, mapping, index + 2)
    if (!outcome) return
    if ('invalid' in outcome) invalid.push(outcome.invalid)
    else candidates.push(outcome.lead)
  })

  const errors: RowError[] = invalid.map((row) => ({
    row: row.row,
    issue: row.issue,
    message: row.message,
  }))

  // Duplicates inside the file: the first occurrence wins.
  const seen = new Map<string, number>()
  const deduped: NormalizedRow[] = []

  for (const lead of candidates) {
    const firstRow = seen.get(lead.phoneKey)
    if (firstRow !== undefined) {
      errors.push({
        row: lead.row,
        issue: 'DUPLICATE_IN_FILE',
        message: `duplicate phone number (same as row ${firstRow})`,
      })
      continue
    }
    seen.set(lead.phoneKey, lead.row)
    deduped.push(lead)
  }

  // Duplicates against leads already in this workspace.
  let existingKeys: Set<string>
  try {
    existingKeys = await loadExistingPhoneKeys(auth.supabase, auth.workspaceId)
  } catch {
    return fail('IMPORT_FAILED', 'Existing leads could not be checked for duplicates.', 500)
  }

  const toInsert: NormalizedRow[] = []
  for (const lead of deduped) {
    if (existingKeys.has(lead.phoneKey)) {
      errors.push({
        row: lead.row,
        issue: 'DUPLICATE_IN_WORKSPACE',
        message: 'phone number already exists in this workspace',
      })
      continue
    }
    toInsert.push(lead)
  }

  const duplicates = errors.filter(
    (error) => error.issue === 'DUPLICATE_IN_FILE' || error.issue === 'DUPLICATE_IN_WORKSPACE'
  ).length

  const { imported, failures } = await insertInBatches(auth.supabase, auth.workspaceId, kind, toInsert)
  errors.push(...failures)

  const result: ImportResult = {
    totalRows: sheet.rows.length,
    imported,
    duplicates,
    invalid: invalid.length,
    failed: failures.length,
    errors: errors.sort((a, b) => a.row - b.row).slice(0, MAX_REPORTED_ERRORS),
  }

  return Response.json({ data: result })
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function buildSample(rows: string[][], mapping: ColumnMapping) {
  const fields: ImportField[] = ['name', 'phone', 'email', 'company']
  return rows.slice(0, 5).map((cells) => {
    const entry: Partial<Record<ImportField, string>> = {}
    for (const field of fields) {
      const index = mapping[field]
      if (index !== null) entry[field] = (cells[index] ?? '').trim()
    }
    return entry
  })
}

/** XLSX files are recorded as the EXCEL lead source; CSV files as CSV. */
function sourceFor(kind: 'CSV' | 'XLSX'): LeadSource {
  return kind === 'CSV' ? 'CSV' : 'EXCEL'
}

/**
 * Phone comparison keys for every lead already in the workspace.
 *
 * Scoped by workspace_id and further constrained by RLS, so this can never see
 * another tenant's numbers. Paged because the row count is unbounded.
 */
async function loadExistingPhoneKeys(
  supabase: AuthContext['supabase'],
  workspaceId: string
): Promise<Set<string>> {
  const keys = new Set<string>()
  const pageSize = 1000

  for (let page = 0; ; page += 1) {
    const { data, error } = await supabase
      .from('leads')
      .select('phone')
      .eq('workspace_id', workspaceId)
      .range(page * pageSize, page * pageSize + pageSize - 1)
      .overrideTypes<{ phone: string }[]>()

    if (error) throw error

    const rows = data ?? []
    for (const row of rows) keys.add(phoneComparisonKey(row.phone))
    if (rows.length < pageSize) break
  }

  return keys
}

/**
 * Insert in batches. When a batch is rejected the rows are retried one at a
 * time, so one bad row cannot discard the other 499 and every row is reported
 * as imported only if its own insert succeeded.
 */
async function insertInBatches(
  supabase: AuthContext['supabase'],
  workspaceId: string,
  kind: 'CSV' | 'XLSX',
  leads: NormalizedRow[]
): Promise<{ imported: number; failures: RowError[] }> {
  const source = sourceFor(kind)

  const toRow = (lead: NormalizedRow) => ({
    workspace_id: workspaceId,
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    company: lead.company,
    source,
  })

  let imported = 0
  const failures: RowError[] = []

  for (let start = 0; start < leads.length; start += BATCH_SIZE) {
    const batch = leads.slice(start, start + BATCH_SIZE)
    const { data, error } = await supabase.from('leads').insert(batch.map(toRow)).select('id')

    if (!error) {
      imported += data?.length ?? batch.length
      continue
    }

    // The batch was rejected. Retry row by row so one bad record cannot
    // discard the rest, and so each row is counted only on its own success.
    for (const lead of batch) {
      const single = await supabase.from('leads').insert([toRow(lead)]).select('id')
      if (single.error) {
        failures.push({ row: lead.row, issue: 'INSERT_FAILED', message: 'could not be saved' })
      } else {
        imported += 1
      }
    }
  }

  return { imported, failures }
}
