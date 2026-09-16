'use client';

import { useMemo, useState } from 'react';
import { Icon } from '@/components/icons';
import { CardHeader } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { DataTable, EntityCell } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { LEAD_STATUS_DISPLAY, initials } from '@/lib/status';
import { LEAD_SOURCE_LABEL, leadDisplayName, leadSecondaryLine } from '@/lib/leads';
import { formatAbsoluteTime, formatRelativeTime } from '@/lib/format';
import type { Lead, LeadStatus } from '@/domain/types';

const COLUMNS = [
  { key: 'lead', header: 'Lead' },
  { key: 'phone', header: 'Phone' },
  { key: 'source', header: 'Source' },
  { key: 'status', header: 'Status' },
  { key: 'updated', header: 'Updated' },
] as const;

/** Status filters offered in the toolbar, in pipeline order. */
const FILTERS: readonly (LeadStatus | 'ALL')[] = [
  'ALL',
  'NEW',
  'CALLING',
  'QUALIFIED',
  'NO_ANSWER',
  'FOLLOW_UP',
];

/**
 * Lead list with search and status filtering.
 *
 * Filtering runs over the rows this component is given. Once lists outgrow a
 * single API page, the same controls can drive server-side query parameters
 * without changing the presentation.
 */
export function LeadsTable({
  leads,
  subtitle,
  onAddLead,
}: {
  leads: readonly Lead[];
  subtitle: string;
  onAddLead: () => void;
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<LeadStatus | 'ALL'>('ALL');

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return leads.filter((lead) => {
      if (status !== 'ALL' && lead.status !== status) return false;
      if (!needle) return true;
      const haystack = [lead.name, lead.company, lead.email].filter(Boolean).join(' ').toLowerCase();
      return (
        haystack.includes(needle) ||
        lead.phone.replace(/\s/g, '').includes(needle.replace(/\s/g, ''))
      );
    });
  }, [leads, query, status]);

  const isFiltered = query.trim() !== '' || status !== 'ALL';

  return (
    <div className="card">
      <CardHeader
        title="All leads"
        subtitle={subtitle}
        action={
          <div className="toolbar">
            <label className="search-field">
              <span className="visually-hidden">Search leads</span>
              <Icon name="search" size={15} />
              <input
                type="search"
                value={query}
                placeholder="Search name, company, phone"
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <label className="select-field">
              <span className="visually-hidden">Filter by status</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as LeadStatus | 'ALL')}
              >
                {FILTERS.map((value) => (
                  <option key={value} value={value}>
                    {value === 'ALL' ? 'All statuses' : LEAD_STATUS_DISPLAY[value].label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        }
      />

      {leads.length === 0 ? (
        <EmptyState
          icon="users"
          title="No leads yet"
          description="Add your first lead to start calling, or import a list once file upload is available."
          actions={
            <button type="button" className="primary-button" onClick={onAddLead}>
              <Icon name="plus" size={15} />
              Add lead
            </button>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon="search"
          title="No leads match your filters"
          description="Try a different search term, or clear the status filter to see every lead in this workspace."
          actions={
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setQuery('');
                setStatus('ALL');
              }}
            >
              Clear filters
            </button>
          }
        />
      ) : (
        <>
          <DataTable columns={COLUMNS} caption="Leads in this workspace">
            {visible.map((lead) => (
              <tr key={lead.id}>
                <td>
                  <EntityCell
                    initials={initials(leadDisplayName(lead))}
                    name={leadDisplayName(lead)}
                    meta={leadSecondaryLine(lead)}
                  />
                </td>
                <td className="muted numeric">{lead.phone}</td>
                <td>
                  <span className="badge gray">{LEAD_SOURCE_LABEL[lead.source]}</span>
                </td>
                <td>
                  <StatusBadge status={LEAD_STATUS_DISPLAY[lead.status]} />
                </td>
                <td className="muted" title={formatAbsoluteTime(lead.updatedAt)}>
                  {formatRelativeTime(lead.updatedAt)}
                </td>
              </tr>
            ))}
          </DataTable>
          <div className="table-foot">
            <span>
              Showing {visible.length} of {leads.length}
              {isFiltered ? ' matching leads' : leads.length === 1 ? ' lead' : ' leads'}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
