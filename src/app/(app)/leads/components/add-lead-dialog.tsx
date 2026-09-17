'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Icon } from '@/components/icons';
import type { Lead, LeadSource } from '@/domain/types';
import { LEAD_SOURCES, LEAD_SOURCE_LABEL, LeadApiError, createLead } from '@/lib/leads';

interface FormValues {
  name: string;
  phone: string;
  email: string;
  company: string;
  source: LeadSource;
}

type FieldErrors = Partial<Record<keyof FormValues, string>>;

const EMPTY_FORM: FormValues = { name: '', phone: '', email: '', company: '', source: 'MANUAL' };
const FIELDS = ['name', 'phone', 'email', 'company', 'source'] as const;

/** Mirrors the server's rules so the user gets feedback before a round-trip. */
function validate(values: FormValues): FieldErrors {
  const errors: FieldErrors = {};

  const phone = values.phone.trim();
  if (!phone) errors.phone = 'A phone number is required to call this lead.';
  else if (phone.length < 5) errors.phone = 'Enter a complete phone number.';

  const email = values.email.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address.';

  return errors;
}

/**
 * Add lead form in a native <dialog>, which provides focus containment,
 * Escape-to-close and an inert backdrop without a hand-rolled modal.
 */
export function AddLeadDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (lead: Lead) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  // Clear on close rather than on open, so a reopened dialog is already empty
  // instead of rendering the previous values for a frame.
  useEffect(() => {
    if (open) return;
    setValues(EMPTY_FORM);
    setErrors({});
    setFormError(null);
  }, [open]);

  const update = <K extends keyof FormValues>(field: K, value: FormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const nextErrors = validate(values);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      onCreated(await createLead(values));
    } catch (error) {
      if (error instanceof LeadApiError) {
        // Show per-field messages the API returned; keep anything else as a banner.
        const fieldErrors: FieldErrors = {};
        for (const field of FIELDS) {
          const message = error.fieldErrors[field];
          if (message) fieldErrors[field] = message;
        }
        setErrors(fieldErrors);
        setFormError(Object.keys(fieldErrors).length > 0 ? null : error.message);
      } else {
        setFormError('We could not reach the server. Check your connection and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <dialog ref={dialogRef} className="lead-dialog" aria-labelledby="add-lead-title" onClose={onClose}>
      <div className="lead-dialog-head">
        <div>
          <h2 id="add-lead-title">Add lead</h2>
          <p>This lead joins your workspace and can be called straight away.</p>
        </div>
        <button type="button" className="icon-button" aria-label="Close" onClick={onClose}>
          <Icon name="close" size={16} />
        </button>
      </div>

      <form className="form-grid" onSubmit={handleSubmit} noValidate>
        {formError ? (
          <div className="form-alert" role="alert">
            {formError}
          </div>
        ) : null}

        <label className="field">
          <span className="field-label">Name</span>
          <input
            className="field-input"
            name="name"
            type="text"
            value={values.name}
            placeholder="Rahul Sharma"
            autoComplete="name"
            onChange={(event) => update('name', event.target.value)}
          />
        </label>

        <label className="field">
          <span className="field-label">Phone</span>
          <input
            className="field-input"
            name="phone"
            type="tel"
            value={values.phone}
            placeholder="+91 98765 43210"
            autoComplete="tel"
            required
            aria-invalid={errors.phone ? true : undefined}
            aria-describedby={errors.phone ? 'add-lead-phone-error' : undefined}
            onChange={(event) => update('phone', event.target.value)}
          />
          {errors.phone ? (
            <span className="field-error" id="add-lead-phone-error">
              {errors.phone}
            </span>
          ) : null}
        </label>

        <label className="field">
          <span className="field-label">Email</span>
          <input
            className="field-input"
            name="email"
            type="email"
            value={values.email}
            placeholder="rahul@company.com"
            autoComplete="email"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'add-lead-email-error' : undefined}
            onChange={(event) => update('email', event.target.value)}
          />
          {errors.email ? (
            <span className="field-error" id="add-lead-email-error">
              {errors.email}
            </span>
          ) : null}
        </label>

        <label className="field">
          <span className="field-label">Company</span>
          <input
            className="field-input"
            name="company"
            type="text"
            value={values.company}
            placeholder="Acme Technologies"
            autoComplete="organization"
            onChange={(event) => update('company', event.target.value)}
          />
        </label>

        <label className="field">
          <span className="field-label">Source</span>
          <select
            className="field-input field-select"
            name="source"
            value={values.source}
            onChange={(event) => update('source', event.target.value as LeadSource)}
          >
            {LEAD_SOURCES.map((source) => (
              <option key={source} value={source}>
                {LEAD_SOURCE_LABEL[source]}
              </option>
            ))}
          </select>
        </label>

        <div className="lead-dialog-actions">
          <button type="button" className="secondary-button" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? 'Saving…' : 'Add lead'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
