'use client';

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Icon } from '@/components/icons';
import {
  ACCEPTED_FILE_TYPES,
  ImportApiError,
  commitImport,
  previewImport,
} from '@/lib/import/client';
import {
  IMPORT_FIELDS,
  IMPORT_FIELD_LABEL,
  type ColumnMapping,
  type ImportField,
  type ImportPreview,
  type ImportResult,
} from '@/lib/import/types';

type Stage =
  | { name: 'choose' }
  | { name: 'reading' }
  | { name: 'map'; preview: ImportPreview; mapping: ColumnMapping }
  | { name: 'importing' }
  | { name: 'done'; result: ImportResult };

const ISSUE_ORDER = ['PHONE_MISSING', 'PHONE_INVALID', 'EMAIL_INVALID'] as const;

/**
 * CSV / Excel import, presented in the same dialog shell as Add lead.
 *
 * Walks file → columns → review → import → summary. The file is parsed by the
 * server at each step; nothing is inferred in the browser.
 */
export function ImportLeadsDialog({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  /** Called after a run that inserted at least one lead, to refresh the list. */
  onImported: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<Stage>({ name: 'choose' });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  // Reset on close so a reopened dialog never shows the previous run.
  useEffect(() => {
    if (open) return;
    setFile(null);
    setStage({ name: 'choose' });
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  }, [open]);

  const handleFile = useCallback(async (chosen: File) => {
    setFile(chosen);
    setError(null);
    setStage({ name: 'reading' });

    try {
      const preview = await previewImport(chosen);
      setStage({ name: 'map', preview, mapping: preview.mapping });
    } catch (cause) {
      setError(
        cause instanceof ImportApiError
          ? cause.message
          : 'That file could not be read. Check your connection and try again.'
      );
      setStage({ name: 'choose' });
    }
  }, []);

  const onPick = (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0];
    if (chosen) void handleFile(chosen);
  };

  async function runImport(preview: ImportPreview, mapping: ColumnMapping) {
    if (!file) return;
    setError(null);
    setStage({ name: 'importing' });

    try {
      const result = await commitImport(file, mapping);
      setStage({ name: 'done', result });
      if (result.imported > 0) onImported();
    } catch (cause) {
      setError(
        cause instanceof ImportApiError
          ? cause.message
          : 'The import could not be completed. Check your connection and try again.'
      );
      setStage({ name: 'map', preview, mapping });
    }
  }

  function reset() {
    setFile(null);
    setStage({ name: 'choose' });
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <dialog
      ref={dialogRef}
      className="lead-dialog import-dialog"
      aria-labelledby="import-leads-title"
      onClose={onClose}
    >
      <div className="lead-dialog-head">
        <div>
          <h2 id="import-leads-title">Import leads</h2>
          <p>Upload a CSV or Excel file. Every row is checked before anything is saved.</p>
        </div>
        <button type="button" className="icon-button" aria-label="Close" onClick={onClose}>
          <Icon name="close" size={16} />
        </button>
      </div>

      {error ? (
        <div className="form-alert" role="alert">
          {error}
        </div>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES}
        className="visually-hidden"
        onChange={onPick}
      />

      {stage.name === 'choose' ? (
        <ChooseStep onBrowse={() => inputRef.current?.click()} onDropFile={(f) => void handleFile(f)} />
      ) : null}

      {stage.name === 'reading' ? <BusyStep label="Reading your file…" /> : null}

      {stage.name === 'map' ? (
        <MapStep
          fileName={file?.name ?? stage.preview.fileName}
          preview={stage.preview}
          mapping={stage.mapping}
          onChange={(mapping) => setStage({ name: 'map', preview: stage.preview, mapping })}
          onBack={reset}
          onImport={() => void runImport(stage.preview, stage.mapping)}
        />
      ) : null}

      {stage.name === 'importing' ? <BusyStep label="Importing leads…" /> : null}

      {stage.name === 'done' ? (
        <DoneStep result={stage.result} onAnother={reset} onClose={onClose} />
      ) : null}
    </dialog>
  );
}

function ChooseStep({
  onBrowse,
  onDropFile,
}: {
  onBrowse: () => void;
  onDropFile: (file: File) => void;
}) {
  const [dragging, setDragging] = useState(false);

  return (
    <>
      <div
        className={`import-drop${dragging ? ' dragging' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const dropped = event.dataTransfer.files?.[0];
          if (dropped) onDropFile(dropped);
        }}
      >
        <span className="empty-icon" aria-hidden="true">
          <Icon name="upload" size={20} />
        </span>
        <strong>Drop a file here</strong>
        <span>CSV or Excel (.xlsx), up to 5 MB and 5,000 rows.</span>
        <button type="button" className="secondary-button" onClick={onBrowse}>
          Choose file
        </button>
      </div>

      <ol className="steps import-steps">
        <li>
          <span className="steps-index">1</span>
          <span>Your columns are matched to name, phone, email and company.</span>
        </li>
        <li>
          <span className="steps-index">2</span>
          <span>Every row is validated; a phone number is required.</span>
        </li>
        <li>
          <span className="steps-index">3</span>
          <span>Duplicates are skipped, never overwritten.</span>
        </li>
      </ol>
    </>
  );
}

function BusyStep({ label }: { label: string }) {
  return (
    <div className="import-busy" role="status">
      <span className="skeleton" style={{ width: 200 }} />
      <span className="skeleton" style={{ width: 150 }} />
      <span className="skeleton" style={{ width: 176 }} />
      <p className="muted">{label}</p>
    </div>
  );
}

function MapStep({
  fileName,
  preview,
  mapping,
  onChange,
  onBack,
  onImport,
}: {
  fileName: string;
  preview: ImportPreview;
  mapping: ColumnMapping;
  onChange: (mapping: ColumnMapping) => void;
  onBack: () => void;
  onImport: () => void;
}) {
  const ambiguous = preview.columns.some((column) => column.ambiguous);
  const ready = mapping.phone !== null;

  return (
    <>
      <div className="import-file">
        <span className="quick-icon" aria-hidden="true">
          <Icon name="upload" size={16} />
        </span>
        <span className="import-file-copy">
          <strong>{fileName}</strong>
          <span>
            {preview.totalRows.toLocaleString()} {preview.totalRows === 1 ? 'row' : 'rows'} ·{' '}
            {preview.columns.length} columns · {preview.fileKind}
          </span>
        </span>
        <button type="button" className="card-link" onClick={onBack}>
          Change
        </button>
      </div>

      {preview.needsPhoneColumn ? (
        <div className="form-alert" role="alert">
          No phone column was recognised. Choose which column holds the phone number — it is
          required for every lead.
        </div>
      ) : null}

      {ambiguous && !preview.needsPhoneColumn ? (
        <div className="import-note">
          More than one column could match the same field. Confirm the mapping below before
          importing.
        </div>
      ) : null}

      <div className="form-grid">
        {IMPORT_FIELDS.map((field) => (
          <label className="field" key={field}>
            <span className="field-label">
              {IMPORT_FIELD_LABEL[field]}
              {field === 'phone' ? ' (required)' : ''}
            </span>
            <select
              className="field-input field-select"
              value={mapping[field] === null ? '' : String(mapping[field])}
              onChange={(event) =>
                onChange({
                  ...mapping,
                  [field]: event.target.value === '' ? null : Number(event.target.value),
                } as ColumnMapping)
              }
            >
              <option value="">Not imported</option>
              {preview.columns.map((column) => (
                <option key={column.index} value={column.index}>
                  {column.header || `Column ${column.index + 1}`}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      {preview.sample.length > 0 ? (
        <div className="import-sample">
          <div className="card-subtitle">Preview of the first rows</div>
          <div className="table-scroll">
            <table className="table">
              <caption className="visually-hidden">Preview of the mapped columns</caption>
              <thead>
                <tr>
                  {IMPORT_FIELDS.map((field) => (
                    <th key={field} scope="col">
                      {IMPORT_FIELD_LABEL[field]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.sample.map((row, index) => (
                  <tr key={index}>
                    {IMPORT_FIELDS.map((field) => (
                      <td key={field} className={row[field] ? undefined : 'muted'}>
                        {row[field] || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="lead-dialog-actions">
        <button type="button" className="secondary-button" onClick={onBack}>
          Cancel
        </button>
        <button type="button" className="primary-button" onClick={onImport} disabled={!ready}>
          Import {preview.totalRows.toLocaleString()}{' '}
          {preview.totalRows === 1 ? 'row' : 'rows'}
        </button>
      </div>
    </>
  );
}

function DoneStep({
  result,
  onAnother,
  onClose,
}: {
  result: ImportResult;
  onAnother: () => void;
  onClose: () => void;
}) {
  const problems = result.errors.filter((error) => ISSUE_ORDER.includes(error.issue as never));
  const duplicates = result.errors.filter(
    (error) => error.issue === 'DUPLICATE_IN_FILE' || error.issue === 'DUPLICATE_IN_WORKSPACE'
  );
  const failures = result.errors.filter((error) => error.issue === 'INSERT_FAILED');

  return (
    <>
      <div className="import-summary">
        <SummaryTile label="Imported" value={result.imported} tone="green" />
        <SummaryTile label="Duplicates" value={result.duplicates} tone="amber" />
        <SummaryTile label="Invalid" value={result.invalid} tone={result.invalid ? 'red' : 'gray'} />
        <SummaryTile label="Failed" value={result.failed} tone={result.failed ? 'red' : 'gray'} />
      </div>

      <p className="import-summary-line muted">
        {result.imported > 0
          ? `${result.imported.toLocaleString()} of ${result.totalRows.toLocaleString()} rows were added to your workspace.`
          : `Nothing was added from ${result.totalRows.toLocaleString()} rows.`}
      </p>

      {result.errors.length > 0 ? (
        <div className="import-issues">
          <ErrorGroup title="Rows that could not be imported" rows={problems} />
          <ErrorGroup title="Duplicates skipped" rows={duplicates} />
          <ErrorGroup title="Rows that failed to save" rows={failures} />
        </div>
      ) : null}

      <div className="lead-dialog-actions">
        <button type="button" className="secondary-button" onClick={onAnother}>
          Import another file
        </button>
        <button type="button" className="primary-button" onClick={onClose}>
          Done
        </button>
      </div>
    </>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'green' | 'amber' | 'red' | 'gray';
}) {
  return (
    <div className="import-tile">
      <span className={`badge ${tone}`}>{value.toLocaleString()}</span>
      <span>{label}</span>
    </div>
  );
}

function ErrorGroup({ title, rows }: { title: string; rows: ImportResult['errors'] }) {
  if (rows.length === 0) return null;

  return (
    <div className="import-issue-group">
      <div className="card-subtitle">{title}</div>
      <ul className="notes">
        {rows.slice(0, 25).map((row) => (
          <li key={`${row.row}-${row.issue}`}>
            Row {row.row}: {row.message}
          </li>
        ))}
        {rows.length > 25 ? <li className="muted">…and {rows.length - 25} more</li> : null}
      </ul>
    </div>
  );
}
