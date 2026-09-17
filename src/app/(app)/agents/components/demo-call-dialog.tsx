'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/icons';
import { StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { DemoCallTag } from '@/components/ui/demo-tag';
import type { Agent, Lead } from '@/domain/types';
import { DEMO_CONTACT } from '@/domain/demo-contact';
import { ApiError } from '@/lib/api/client';
import { makeDemoCall, type DemoCallResult } from '@/lib/agents';
import { leadDisplayName } from '@/lib/leads';
import { CALL_OUTCOME_DISPLAY, formatDuration } from '@/lib/status';

/**
 * A demo call, from picking who it is to seeing what came of it.
 *
 * The staged progress is presentation only. The call is simulated server-side
 * in one request, and every stage label says "demo" so the sequence is never
 * mistaken for a phone actually ringing somewhere.
 */

type Stage = 'setup' | 'connecting' | 'talking' | 'thinking' | 'done';

/** How long each stage is held before the next, in milliseconds. */
const STAGE_MS: Record<'connecting' | 'talking' | 'thinking', number> = {
  connecting: 1100,
  talking: 1500,
  thinking: 900,
};

const STAGE_COPY: Record<'connecting' | 'talking' | 'thinking', string> = {
  connecting: 'Connecting…',
  talking: 'In conversation…',
  thinking: 'Working out the outcome…',
};

export function DemoCallDialog({
  open,
  agent,
  leads,
  onClose,
}: {
  open: boolean;
  agent: Agent;
  leads: Lead[];
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [stage, setStage] = useState<Stage>('setup');
  const [leadId, setLeadId] = useState<string>('');
  const [result, setResult] = useState<DemoCallResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;

    if (open && !node.open) {
      setStage('setup');
      setResult(null);
      setError(null);
      setLeadId(leads[0]?.id ?? '');
      node.showModal();
    } else if (!open && node.open) {
      node.close();
    }
  }, [open, leads]);

  useEffect(() => clearTimers, [clearTimers]);

  const run = useCallback(async () => {
    clearTimers();
    setError(null);
    setResult(null);
    setStage('connecting');

    // The stages run alongside the request rather than gating it, so a slow
    // response never leaves the screen stuck on "Connecting".
    timers.current.push(setTimeout(() => setStage('talking'), STAGE_MS.connecting));
    timers.current.push(
      setTimeout(() => setStage('thinking'), STAGE_MS.connecting + STAGE_MS.talking)
    );

    const startedAt = Date.now();
    const minimum = STAGE_MS.connecting + STAGE_MS.talking + STAGE_MS.thinking;

    try {
      const outcome = await makeDemoCall(agent.id, leadId || undefined);
      const elapsed = Date.now() - startedAt;
      timers.current.push(
        setTimeout(
          () => {
            setResult(outcome);
            setStage('done');
          },
          Math.max(0, minimum - elapsed)
        )
      );
    } catch (caught) {
      clearTimers();
      const apiError = caught instanceof ApiError ? caught : null;
      setError(apiError?.message ?? 'The demo call could not be completed.');
      setStage('setup');
    }
  }, [agent.id, leadId, clearTimers]);

  const close = useCallback(() => {
    clearTimers();
    onClose();
  }, [clearTimers, onClose]);

  const running = stage === 'connecting' || stage === 'talking' || stage === 'thinking';

  return (
    <dialog ref={dialogRef} className="lead-dialog agent-dialog demo-call-dialog" onCancel={close}>
      <div className="lead-dialog-head">
        <div>
          <DemoCallTag />
          <h2>{stage === 'done' ? 'Call completed' : `Demo call with ${agent.name}`}</h2>
        </div>
        <button type="button" className="icon-button" aria-label="Close" onClick={close}>
          <Icon name="close" size={17} />
        </button>
      </div>

      <div className="demo-call-body">
        {error ? (
          <p className="form-alert" role="alert">
            {error}
          </p>
        ) : null}

        {stage === 'setup' ? (
          <SetupStage
            agent={agent}
            leads={leads}
            leadId={leadId}
            onLeadChange={setLeadId}
          />
        ) : null}

        {running ? <RunningStage agent={agent} stage={stage} /> : null}

        {stage === 'done' && result ? <ResultStage agent={agent} result={result} /> : null}
      </div>

      <div className="lead-dialog-actions">
        {stage === 'setup' ? (
          <>
            <button type="button" className="secondary-button" onClick={close}>
              Cancel
            </button>
            <button type="button" className="primary-button" onClick={() => void run()}>
              <Icon name="phone" size={15} /> Start demo call
            </button>
          </>
        ) : null}

        {running ? (
          <button type="button" className="secondary-button" disabled>
            {STAGE_COPY[stage]}
          </button>
        ) : null}

        {stage === 'done' && result ? (
          <>
            <button type="button" className="secondary-button" onClick={() => void run()}>
              Run another
            </button>
            <Link className="secondary-button" href={`/calls/${result.call.id}`}>
              Open call
            </Link>
            <Link className="primary-button" href="/campaigns">
              <Icon name="megaphone" size={15} /> Create campaign
            </Link>
          </>
        ) : null}
      </div>
    </dialog>
  );
}

function SetupStage({
  agent,
  leads,
  leadId,
  onLeadChange,
}: {
  agent: Agent;
  leads: Lead[];
  leadId: string;
  onLeadChange: (value: string) => void;
}) {
  return (
    <>
      <p className="demo-call-intro">
        {agent.name} will hold a short conversation using the goal, instructions and business
        context you gave it. Nothing is dialled and nobody is contacted — this is a demonstration
        of what a real call would sound like.
      </p>

      <div className="call-parties">
        <div className="call-party">
          <span className="call-party-label">Agent</span>
          <strong>{agent.name}</strong>
          <span>{agent.companyName ?? 'No company set'}</span>
          {!agent.active ? <span className="badge amber">Paused</span> : null}
        </div>
        <span className="call-party-arrow" aria-hidden="true">
          <Icon name="arrow" size={16} />
        </span>
        <div className="call-party">
          <span className="call-party-label">Demo contact</span>
          {leads.length > 0 ? (
            <>
              <label className="field" style={{ width: '100%' }}>
                <span className="visually-hidden">Choose a contact</span>
                <select
                  className="field-input"
                  value={leadId}
                  onChange={(event) => onLeadChange(event.target.value)}
                >
                  {leads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {leadDisplayName(lead)} · {lead.phone}
                    </option>
                  ))}
                </select>
              </label>
              <span>Simulated — this person is not contacted</span>
            </>
          ) : (
            <>
              <strong>{DEMO_CONTACT.name}</strong>
              <span>{DEMO_CONTACT.phone}</span>
              <span>A stand-in contact, added once so the call has someone to reach</span>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function RunningStage({ agent, stage }: { agent: Agent; stage: 'connecting' | 'talking' | 'thinking' }) {
  const order: ('connecting' | 'talking' | 'thinking')[] = ['connecting', 'talking', 'thinking'];
  const current = order.indexOf(stage);

  return (
    <div className="call-running">
      <span className="call-pulse" aria-hidden="true">
        <Icon name="phone" size={22} />
      </span>
      <strong>{STAGE_COPY[stage]}</strong>
      <span className="call-running-meta">{agent.name} is on a demo call</span>
      <ol className="call-stages" aria-label="Demo call progress">
        {order.map((item, index) => (
          <li
            key={item}
            className={index < current ? 'done' : index === current ? 'active' : undefined}
          >
            {index < current ? <Icon name="check" size={12} /> : null}
            {STAGE_COPY[item].replace('…', '')}
          </li>
        ))}
      </ol>
    </div>
  );
}

function ResultStage({ agent, result }: { agent: Agent; result: DemoCallResult }) {
  const { call, contact, followUp } = result;

  return (
    <>
      <div className="call-parties compact">
        <div className="call-party">
          <span className="call-party-label">Agent</span>
          <strong>{agent.name}</strong>
          <span>{agent.companyName ?? '—'}</span>
        </div>
        <span className="call-party-arrow" aria-hidden="true">
          <Icon name="arrow" size={16} />
        </span>
        <div className="call-party">
          <span className="call-party-label">Demo contact</span>
          <strong>{contact.name ?? 'Unnamed contact'}</strong>
          <span>{contact.phone}</span>
        </div>
      </div>

      <dl className="detail-grid">
        <div className="detail-cell">
          <dt className="detail-label">Outcome</dt>
          <dd className="detail-value">
            {call.outcome ? (
              <StatusBadge status={CALL_OUTCOME_DISPLAY[call.outcome]} />
            ) : (
              <span className="muted">Not recorded</span>
            )}
          </dd>
        </div>
        <div className="detail-cell">
          <dt className="detail-label">Duration</dt>
          <dd className="detail-value">
            {call.durationSeconds > 0 ? formatDuration(call.durationSeconds) : '—'}
          </dd>
        </div>
      </dl>

      {call.summary ? (
        <section className="call-section">
          <h3 className="call-section-title">Summary</h3>
          <p className="summary-text">{call.summary}</p>
          {call.nextAction ? (
            <p className="next-action">
              <span className="next-action-label">Next action</span>
              {call.nextAction}
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="call-section">
        <h3 className="call-section-title">Transcript</h3>
        {call.transcript ? (
          <div className="transcript in-dialog">
            {call.transcript
              .split('\n')
              .filter((line) => line.trim().length > 0)
              .map((line, index) => {
                const separator = line.indexOf(': ');
                const speaker = separator > 0 ? line.slice(0, separator) : null;
                const body = separator > 0 ? line.slice(separator + 2) : line;
                const isAgent = speaker?.toLowerCase() === 'agent';
                return (
                  <div
                    key={index}
                    className={`transcript-line ${speaker ? (isAgent ? 'is-agent' : 'is-lead') : 'is-plain'}`}
                  >
                    {speaker ? <span className="transcript-speaker">{speaker}</span> : null}
                    <span className="transcript-text">{body}</span>
                  </div>
                );
              })}
          </div>
        ) : (
          <EmptyState
            icon="phone"
            title="Nobody answered"
            description="The call was not answered, so there was no conversation to record."
          />
        )}
      </section>

      {followUp ? (
        <section className="call-section">
          <h3 className="call-section-title">Follow-up scheduled</h3>
          <p className="call-section-hint">
            A WhatsApp follow-up is waiting on the Follow-ups page, where you can preview and
            simulate sending it.
          </p>
        </section>
      ) : null}
    </>
  );
}
