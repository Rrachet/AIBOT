import type { ReactNode } from 'react';

export interface Column {
  key: string;
  header: string;
  /** Right-align and tabular-number a numeric column. */
  numeric?: boolean;
}

/**
 * Table shell with a horizontal scroll container, so a wide table scrolls
 * inside its card instead of forcing the page to scroll sideways.
 *
 * `caption` is visually hidden but gives screen-reader users the table's
 * purpose before they enter it.
 */
export function DataTable({
  columns,
  caption,
  children,
  tourTarget,
}: {
  columns: readonly Column[];
  caption: string;
  children: ReactNode;
  /** `data-tour` value, so the guided tour can point at this table. */
  tourTarget?: string;
}) {
  return (
    <div className="table-scroll" data-tour={tourTarget}>
      <table className="table">
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className={column.numeric ? 'numeric' : undefined}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/** Name + company cell used by lead and call tables. */
export function EntityCell({ initials, name, meta }: { initials: string; name: string; meta?: string }) {
  return (
    <div className="lead-name">
      <div className="lead-avatar" aria-hidden="true">
        {initials}
      </div>
      <div>
        <div>{name}</div>
        {meta ? <div className="lead-meta">{meta}</div> : null}
      </div>
    </div>
  );
}
