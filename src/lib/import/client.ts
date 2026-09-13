import type { ColumnMapping, ImportPreview, ImportResult } from './types'

/**
 * Browser side of the import endpoint.
 *
 * The file is sent twice — once to preview it, once to commit it — so that the
 * server is the only thing that parses the file and nothing has to be stored
 * between the two steps. The browser keeps the File object, so the user only
 * picks it once.
 */

export class ImportApiError extends Error {
  readonly status: number
  readonly code: string | null

  constructor(message: string, status: number, code: string | null) {
    super(message)
    this.name = 'ImportApiError'
    this.status = status
    this.code = code
  }

  get isAuthError(): boolean {
    return this.status === 401
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function send<T>(form: FormData, fallback: string): Promise<T> {
  const response = await fetch('/api/leads/import', { method: 'POST', body: form })
  const body: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const error = isRecord(body) ? body.error : undefined
    if (typeof error === 'string') throw new ImportApiError(error, response.status, null)
    if (isRecord(error)) {
      throw new ImportApiError(
        typeof error.message === 'string' ? error.message : fallback,
        response.status,
        typeof error.code === 'string' ? error.code : null
      )
    }
    throw new ImportApiError(fallback, response.status, null)
  }

  if (!isRecord(body) || !isRecord(body.data)) {
    throw new ImportApiError(fallback, response.status, null)
  }

  return body.data as T
}

export function previewImport(file: File): Promise<ImportPreview> {
  const form = new FormData()
  form.set('file', file)
  form.set('mode', 'preview')
  return send<ImportPreview>(form, 'That file could not be read.')
}

export function commitImport(file: File, mapping: ColumnMapping): Promise<ImportResult> {
  const form = new FormData()
  form.set('file', file)
  form.set('mode', 'commit')
  form.set('mapping', JSON.stringify(mapping))
  return send<ImportResult>(form, 'The import could not be completed.')
}

/** Accepted by the file picker and checked again on the server. */
export const ACCEPTED_FILE_TYPES = '.csv,.xlsx'
