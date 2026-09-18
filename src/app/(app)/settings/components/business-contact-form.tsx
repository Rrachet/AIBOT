'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/icons';
import { ApiError } from '@/lib/api/client';
import {
  COUNTRY_CODES,
  EMPTY_BUSINESS_CONTACT,
  type BusinessContact,
} from '@/domain/business-contact';
import { fetchWorkspaceSettings, saveBusinessContact } from '@/lib/workspace';

/**
 * Business contact settings.
 *
 * Six fields a business already publishes about itself, saved so that
 * connecting a calling or WhatsApp provider later has something to be
 * configured from. Nothing here dials, sends or verifies anything, and the
 * helper text says so rather than implying a number typed in this form is a
 * number anybody can reach.
 *
 * Every field is optional and may be cleared. Save is disabled until something
 * has actually changed, so the only time it can be pressed is the one time
 * pressing it does something — same rule as the workspace name above it.
 */

type Field = keyof BusinessContact;

const LABELS: Record<Field, string> = {
  businessName: 'Business name',
  businessPhone: 'Business phone number',
  whatsappNumber: 'WhatsApp Business number',
  whatsappDisplayName: 'WhatsApp display name',
  defaultCountryCode: 'Default country code',
  businessEmail: 'Business email',
};

const HINTS: Partial<Record<Field, string>> = {
  businessName: 'The name the agent gives on a call. Often your workspace name, but not always.',
  businessPhone: 'The number a call would come from once a provider is connected.',
  whatsappNumber: 'The number follow-up messages would be sent from.',
  whatsappDisplayName: 'What somebody would see the message is from.',
  defaultCountryCode: 'Used when a number is entered without one.',
  businessEmail: 'Optional. Somewhere a reply could be sent.',
};

type LoadState =
  | { phase: 'loading' }
  | { phase: 'ready' }
  | { phase: 'error'; message: string };

/** Empty string in the inputs, null on the wire. */
function toForm(contact: BusinessContact): Record<Field, string> {
  return {
    businessName: contact.businessName ?? '',
    businessPhone: contact.businessPhone ?? '',
    whatsappNumber: contact.whatsappNumber ?? '',
    whatsappDisplayName: contact.whatsappDisplayName ?? '',
    defaultCountryCode: contact.defaultCountryCode ?? '',
    businessEmail: contact.businessEmail ?? '',
  };
}

function toContact(form: Record<Field, string>): BusinessContact {
  const value = (field: Field) => (form[field].trim() === '' ? null : form[field].trim());
  return {
    businessName: value('businessName'),
    businessPhone: value('businessPhone'),
    whatsappNumber: value('whatsappNumber'),
    whatsappDisplayName: value('whatsappDisplayName'),
    defaultCountryCode: value('defaultCountryCode'),
    businessEmail: value('businessEmail'),
  };
}

export function BusinessContactForm() {
  const [state, setState] = useState<LoadState>({ phase: 'loading' });
  const [form, setForm] = useState<Record<Field, string>>(toForm(EMPTY_BUSINESS_CONTACT));
  const [savedForm, setSavedForm] = useState<Record<Field, string>>(toForm(EMPTY_BUSINESS_CONTACT));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({});
  const [saved, setSaved] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();

    void fetchWorkspaceSettings(controller.signal)
      .then((settings) => {
        if (controller.signal.aborted) return;
        const next = toForm(settings.businessContact);
        setForm(next);
        setSavedForm(next);
        setState({ phase: 'ready' });
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;
        const apiError = caught instanceof ApiError ? caught : null;
        setState({
          phase: 'error',
          message: apiError?.message ?? 'We could not reach the server.',
        });
      });

    return () => {
      mounted.current = false;
      controller.abort();
    };
  }, []);

  const dirty =
    state.phase === 'ready' &&
    (Object.keys(form) as Field[]).some((field) => form[field].trim() !== savedForm[field].trim());

  const update = (field: Field, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setError(null);
    setSaved(false);
  };

  const save = async () => {
    if (!dirty) return;
    setBusy(true);
    setError(null);
    setFieldErrors({});
    setSaved(false);

    try {
      const settings = await saveBusinessContact(toContact(form));
      if (!mounted.current) return;
      const next = toForm(settings.businessContact);
      setForm(next);
      setSavedForm(next);
      setSaved(true);
    } catch (caught) {
      if (!mounted.current) return;
      const apiError = caught instanceof ApiError ? caught : null;
      const fields = apiError?.fieldErrors ?? {};
      setFieldErrors(fields as Partial<Record<Field, string>>);
      // A per-field message is shown against its field; anything else needs
      // saying once at the bottom, where the button the person just pressed is.
      setError(
        Object.keys(fields).length > 0
          ? null
          : (apiError?.message ?? 'We could not save your business details.')
      );
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  if (state.phase === 'error') {
    return (
      <p className="form-alert" role="alert">
        {state.message}
      </p>
    );
  }

  const loading = state.phase === 'loading';

  const textField = (field: Field, extra: { type?: string; autoComplete?: string; max: number }) => (
    <label className="field" key={field}>
      <span className="field-label">{LABELS[field]}</span>
      <input
        className="field-input"
        name={field}
        type={extra.type ?? 'text'}
        value={form[field]}
        disabled={loading}
        maxLength={extra.max}
        autoComplete={extra.autoComplete}
        aria-invalid={fieldErrors[field] ? true : undefined}
        onChange={(event) => update(field, event.target.value)}
      />
      {HINTS[field] ? <span className="field-hint">{HINTS[field]}</span> : null}
      {fieldErrors[field] ? (
        <span className="field-error" role="alert">
          {fieldErrors[field]}
        </span>
      ) : null}
    </label>
  );

  return (
    <form
      className="form-grid"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <p className="settings-note">
        These details will be used later for outbound calling and WhatsApp configuration. Nothing
        here connects a provider, dials a number or sends a message.
      </p>

      {textField('businessName', { max: 120, autoComplete: 'organization' })}
      {textField('businessPhone', { max: 32, type: 'tel', autoComplete: 'tel' })}
      {textField('whatsappNumber', { max: 32, type: 'tel' })}
      {textField('whatsappDisplayName', { max: 60 })}

      <label className="field">
        <span className="field-label">{LABELS.defaultCountryCode}</span>
        <select
          className="field-input field-select"
          name="defaultCountryCode"
          value={form.defaultCountryCode}
          disabled={loading}
          aria-invalid={fieldErrors.defaultCountryCode ? true : undefined}
          onChange={(event) => update('defaultCountryCode', event.target.value)}
        >
          <option value="">Not set</option>
          {COUNTRY_CODES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.label}
            </option>
          ))}
        </select>
        <span className="field-hint">{HINTS.defaultCountryCode}</span>
        {fieldErrors.defaultCountryCode ? (
          <span className="field-error" role="alert">
            {fieldErrors.defaultCountryCode}
          </span>
        ) : null}
      </label>

      {textField('businessEmail', { max: 200, type: 'email', autoComplete: 'email' })}

      {error ? (
        <p className="form-alert" role="alert">
          {error}
        </p>
      ) : null}

      <div className="form-actions">
        <button type="submit" className="primary-button" disabled={!dirty || busy}>
          {busy ? 'Saving…' : 'Save changes'}
        </button>
        {saved && !dirty ? (
          <span className="form-saved" role="status">
            <Icon name="check" size={14} />
            Saved
          </span>
        ) : null}
      </div>
    </form>
  );
}
