'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Icon } from '@/components/icons';
import type { Agent } from '@/domain/types';
import { ApiError } from '@/lib/api/client';
import { EMPTY_AGENT, createAgent, updateAgent, type AgentInput } from '@/lib/agents';

type FieldErrors = Partial<Record<keyof AgentInput, string>>;

function validate(values: AgentInput): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.name.trim()) errors.name = 'Give the agent a name.';
  return errors;
}

function toInput(agent: Agent): AgentInput {
  return {
    name: agent.name,
    companyName: agent.companyName ?? '',
    purpose: agent.purpose ?? '',
    instructions: agent.instructions ?? '',
    businessContext: agent.businessContext ?? '',
    active: agent.active,
  };
}

/**
 * Create and edit form for an agent, in a native <dialog> so focus containment,
 * Escape-to-close and an inert backdrop come from the platform.
 *
 * The same component serves both modes: `agent` present means edit.
 */
export function AgentDialog({
  open,
  agent,
  onClose,
  onSaved,
}: {
  open: boolean;
  agent: Agent | null;
  onClose: () => void;
  onSaved: (agent: Agent) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [values, setValues] = useState<AgentInput>(EMPTY_AGENT);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  // Load on open so an edit shows the agent's values; reset on close so a
  // reopened dialog never flashes the previous agent.
  useEffect(() => {
    if (open) {
      setValues(agent ? toInput(agent) : EMPTY_AGENT);
      setErrors({});
      setFormError(null);
    }
  }, [open, agent]);

  const update = <K extends keyof AgentInput>(field: K, value: AgentInput[K]) => {
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
      const saved = agent ? await updateAgent(agent.id, values) : await createAgent(values);
      onSaved(saved);
    } catch (error) {
      const apiError = error instanceof ApiError ? error : null;
      if (apiError && Object.keys(apiError.fieldErrors).length > 0) {
        setErrors(apiError.fieldErrors as FieldErrors);
      }
      setFormError(apiError?.message ?? 'We could not save this agent. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const title = agent ? 'Edit agent' : 'Create an agent';

  return (
    <dialog ref={dialogRef} className="lead-dialog agent-dialog" onClose={onClose}>
      <div className="lead-dialog-head">
        <div>
          <h2>{title}</h2>
          <p>What the agent says, and the facts it is allowed to rely on.</p>
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
          <label className="field-label" htmlFor="agent-name">
            Agent name
          </label>
          <input
            id="agent-name"
            className="field-input"
            value={values.name}
            onChange={(event) => update('name', event.target.value)}
            placeholder="Priya from Sales"
            aria-invalid={errors.name ? 'true' : undefined}
            maxLength={120}
            required
          />
          {errors.name ? <span className="field-error">{errors.name}</span> : null}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="agent-company">
            Company name
          </label>
          <input
            id="agent-company"
            className="field-input"
            value={values.companyName}
            onChange={(event) => update('companyName', event.target.value)}
            placeholder="Skyline Homes"
            maxLength={200}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="agent-purpose">
            Purpose
          </label>
          <input
            id="agent-purpose"
            className="field-input"
            value={values.purpose}
            onChange={(event) => update('purpose', event.target.value)}
            placeholder="Qualify buyers for site visits"
            maxLength={500}
          />
          <span className="field-hint">What a successful call achieves, in one sentence.</span>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="agent-instructions">
            Instructions
          </label>
          <textarea
            id="agent-instructions"
            className="field-textarea"
            value={values.instructions}
            onChange={(event) => update('instructions', event.target.value)}
            placeholder="Be warm and brief. Ask which area they are considering, their budget, and when they could visit."
            rows={4}
            maxLength={10000}
          />
          <span className="field-hint">Tone, the questions to ask, and when to stop.</span>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="agent-context">
            Business context
          </label>
          <textarea
            id="agent-context"
            className="field-textarea"
            value={values.businessContext}
            onChange={(event) => update('businessContext', event.target.value)}
            placeholder="We sell 2BHK and 3BHK apartments in Gachibowli and Kondapur, priced 65L to 1.2Cr."
            rows={3}
            maxLength={10000}
          />
          <span className="field-hint">The product facts the agent may rely on.</span>
        </div>

        <label className="agent-toggle">
          <input
            type="checkbox"
            checked={values.active}
            onChange={(event) => update('active', event.target.checked)}
          />
          <span>
            <strong>Active</strong>
            <span>Only active agents can be assigned to a campaign.</span>
          </span>
        </label>

        <div className="lead-dialog-actions">
          <button type="button" className="secondary-button" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? 'Saving…' : agent ? 'Save changes' : 'Create agent'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
