'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Icon } from '@/components/icons';
import type { Agent, Campaign } from '@/domain/types';
import { ApiError } from '@/lib/api/client';
import { EMPTY_CAMPAIGN, createCampaign, type CampaignInput } from '@/lib/campaigns';

type FieldErrors = Partial<Record<keyof CampaignInput, string>>;

/**
 * Create-campaign form. Leads are attached afterwards on the campaign page,
 * so this dialog only asks for what a campaign cannot exist without.
 */
export function CampaignDialog({
  open,
  agents,
  onClose,
  onCreated,
}: {
  open: boolean;
  agents: Agent[];
  onClose: () => void;
  onCreated: (campaign: Campaign) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [values, setValues] = useState<CampaignInput>(EMPTY_CAMPAIGN);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const activeAgents = agents.filter((agent) => agent.active);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // Preselect the only sensible choice when there is exactly one.
    setValues({ ...EMPTY_CAMPAIGN, agentId: activeAgents.length === 1 ? activeAgents[0]!.id : '' });
    setErrors({});
    setFormError(null);
    // activeAgents is derived from `agents`; depending on it directly would
    // rebuild the array every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, agents]);

  const update = <K extends keyof CampaignInput>(field: K, value: CampaignInput[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const nextErrors: FieldErrors = {};
    if (!values.name.trim()) nextErrors.name = 'Give the campaign a name.';
    if (!values.agentId) nextErrors.agentId = 'Choose the agent that will make these calls.';
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      onCreated(await createCampaign(values));
    } catch (error) {
      const apiError = error instanceof ApiError ? error : null;
      setFormError(apiError?.message ?? 'We could not create this campaign. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <dialog ref={dialogRef} className="lead-dialog agent-dialog" onClose={onClose}>
      <div className="lead-dialog-head">
        <div>
          <h2>New campaign</h2>
          <p>Pick the agent that will call, then attach leads on the next screen.</p>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
          <Icon name="close" size={16} />
        </button>
      </div>

      <form className="agent-form" onSubmit={handleSubmit} noValidate>
        {formError ? (
          <p className="form-alert" role="alert">
            {formError}
          </p>
        ) : null}

        <div className="field">
          <label className="field-label" htmlFor="campaign-name">
            Campaign name
          </label>
          <input
            id="campaign-name"
            className="field-input"
            value={values.name}
            onChange={(event) => update('name', event.target.value)}
            placeholder="Gachibowli enquiries — March"
            aria-invalid={errors.name ? 'true' : undefined}
            maxLength={160}
            required
          />
          {errors.name ? <span className="field-error">{errors.name}</span> : null}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="campaign-agent">
            AI agent
          </label>
          {activeAgents.length === 0 ? (
            <p className="field-hint">
              No active agents yet. Create one on the AI Agents page first — a campaign cannot run
              without it.
            </p>
          ) : (
            <select
              id="campaign-agent"
              className="field-input field-select"
              value={values.agentId}
              onChange={(event) => update('agentId', event.target.value)}
              aria-invalid={errors.agentId ? 'true' : undefined}
            >
              <option value="">Choose an agent…</option>
              {activeAgents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                  {agent.companyName ? ` · ${agent.companyName}` : ''}
                </option>
              ))}
            </select>
          )}
          {errors.agentId ? <span className="field-error">{errors.agentId}</span> : null}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="campaign-attempts">
            Maximum attempts per lead
          </label>
          <input
            id="campaign-attempts"
            className="field-input"
            type="number"
            min={1}
            max={10}
            value={values.maxAttempts}
            onChange={(event) => update('maxAttempts', Number(event.target.value) || 1)}
          />
          <span className="field-hint">How many times to retry a lead that does not answer.</span>
        </div>

        <label className="agent-toggle">
          <input
            type="checkbox"
            checked={values.whatsappFallbackEnabled}
            onChange={(event) => update('whatsappFallbackEnabled', event.target.checked)}
          />
          <span>
            <strong>WhatsApp follow-up</strong>
            <span>Schedule a message when a lead does not answer or asks to be contacted later.</span>
          </span>
        </label>

        {values.whatsappFallbackEnabled ? (
          <div className="field">
            <label className="field-label" htmlFor="campaign-delay">
              Follow-up delay (minutes)
            </label>
            <input
              id="campaign-delay"
              className="field-input"
              type="number"
              min={0}
              max={10080}
              value={values.whatsappFallbackDelayMinutes}
              onChange={(event) =>
                update('whatsappFallbackDelayMinutes', Number(event.target.value) || 0)
              }
            />
          </div>
        ) : null}

        <div className="lead-dialog-actions">
          <button type="button" className="secondary-button" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="submit"
            className="primary-button"
            disabled={submitting || activeAgents.length === 0}
          >
            {submitting ? 'Creating…' : 'Create campaign'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
