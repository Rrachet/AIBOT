'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/icons';
import type { Lead } from '@/domain/types';
import { ApiError } from '@/lib/api/client';
import { attachLeads, type AttachResult } from '@/lib/campaigns';
import { leadDisplayName, leadSecondaryLine } from '@/lib/leads';

/**
 * Lead picker for a campaign.
 *
 * Only leads not already attached are offered, so the list shrinks as they are
 * added and re-adding the same person is not something the user can attempt by
 * accident. The server still treats a repeat as a skip.
 */
export function AttachLeadsDialog({
  open,
  campaignId,
  leads,
  onClose,
  onAttached,
}: {
  open: boolean;
  campaignId: string;
  leads: Lead[];
  onClose: () => void;
  onAttached: (result: AttachResult) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (open) return;
    setSelected(new Set());
    setQuery('');
    setFormError(null);
  }, [open]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return leads;
    return leads.filter((lead) =>
      [lead.name, lead.phone, lead.company, lead.email]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(needle))
    );
  }, [leads, query]);

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allVisibleSelected = visible.length > 0 && visible.every((lead) => selected.has(lead.id));

  const toggleAll = () => {
    setSelected((current) => {
      const next = new Set(current);
      if (allVisibleSelected) visible.forEach((lead) => next.delete(lead.id));
      else visible.forEach((lead) => next.add(lead.id));
      return next;
    });
  };

  async function submit() {
    if (submitting || selected.size === 0) return;
    setSubmitting(true);
    setFormError(null);
    try {
      onAttached(await attachLeads(campaignId, [...selected]));
    } catch (error) {
      const apiError = error instanceof ApiError ? error : null;
      setFormError(apiError?.message ?? 'We could not attach these leads. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <dialog ref={dialogRef} className="lead-dialog attach-dialog" onClose={onClose}>
      <div className="lead-dialog-head">
        <div>
          <h2>Add leads</h2>
          <p>Choose who this campaign should call.</p>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
          <Icon name="close" size={16} />
        </button>
      </div>

      {formError ? (
        <p className="form-alert" role="alert">
          {formError}
        </p>
      ) : null}

      {leads.length === 0 ? (
        <p className="field-hint">
          Every lead in this workspace is already on this campaign. Import or add more on the Leads
          page.
        </p>
      ) : (
        <>
          <div className="field">
            <label className="field-label" htmlFor="attach-search">
              Search
            </label>
            <input
              id="attach-search"
              className="field-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name, phone or company"
            />
          </div>

          <div className="attach-toolbar">
            <button type="button" className="ghost-button" onClick={toggleAll} disabled={visible.length === 0}>
              {allVisibleSelected ? 'Clear selection' : 'Select all'}
            </button>
            <span className="attach-count">{selected.size} selected</span>
          </div>

          <ul className="attach-list">
            {visible.map((lead) => {
              const secondary = leadSecondaryLine(lead);
              return (
                <li key={lead.id}>
                  <label className="attach-row">
                    <input
                      type="checkbox"
                      checked={selected.has(lead.id)}
                      onChange={() => toggle(lead.id)}
                    />
                    <span>
                      <strong>{leadDisplayName(lead)}</strong>
                      <span className="attach-sub">
                        {lead.phone}
                        {secondary ? ` · ${secondary}` : ''}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
            {visible.length === 0 ? <li className="attach-empty">No leads match that search.</li> : null}
          </ul>
        </>
      )}

      <div className="lead-dialog-actions">
        <button type="button" className="secondary-button" onClick={onClose} disabled={submitting}>
          Cancel
        </button>
        <button
          type="button"
          className="primary-button"
          onClick={() => void submit()}
          disabled={submitting || selected.size === 0}
        >
          {submitting ? 'Adding…' : `Add ${selected.size || ''}`.trim()}
        </button>
      </div>
    </dialog>
  );
}
