'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/icons';
import { StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { DemoCallTag } from '@/components/ui/demo-tag';
import type { Campaign } from '@/domain/types';
import { CALL_OBJECTIVE_LABEL } from '@/domain/ai-config';
import { ApiError } from '@/lib/api/client';
import { runTestCall, type TestCallResult } from '@/lib/campaigns';
import { CALL_OUTCOME_DISPLAY, formatDuration } from '@/lib/status';
import type { CallOutcome } from '@/domain/types';
import { useCapabilities } from '@/components/workspace-context';
import { readTranscript } from '@/lib/speech/speech-script';
import { type SpeechRegister } from '@/lib/speech/speech-types';
import { DEFAULT_PREVIEW_SCENARIO, type PreviewScenario } from '@/domain/voice-scenarios';
import { ScenarioStudio } from './scenario-studio';
import { VoicePreview } from './voice-preview';

/**
 * A test call against the campaign's configuration.
 *
 * The number is typed by the user and shown back to them, because a test is
 * only meaningful if you can see who it was aimed at — but nothing is dialled
 * and the label says so at every stage. Nobody is contacted, no lead's status
 * changes, and the result is kept out of this campaign's figures.
 *
 * A workspace with the live voice preview capability gets two extra things: a
 * language to hold the call in, and the option to hear the result read aloud by
 * the browser. Neither changes what a test call is or what it records — the
 * language reaches the one transcript builder, and the preview reads back the
 * transcript that was stored. Every other workspace sees exactly the dialog it
 * saw before, and the server refuses both if asked anyway.
 */

type Stage = 'setup' | 'running' | 'done';

const STAGE_MS = { connecting: 1100, talking: 1500, thinking: 900 } as const;
const STAGE_COPY = ['Connecting…', 'In conversation…', 'Working out the outcome…'] as const;

export function TestCallDialog({
  open,
  campaign,
  onClose,
}: {
  open: boolean;
  campaign: Campaign;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [stage, setStage] = useState<Stage>('setup');
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState<TestCallResult | null>(null);
  const [language, setLanguage] = useState<SpeechRegister>('ENGLISH');
  const [scenario, setScenario] = useState<PreviewScenario>(DEFAULT_PREVIEW_SCENARIO);
  const [activeTurn, setActiveTurn] = useState<string | null>(null);
  const { liveVoicePreview } = useCapabilities();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
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
      setFieldErrors({});
      setActiveTurn(null);
      node.showModal();
    } else if (!open && node.open) {
      node.close();
    }
  }, [open]);

  useEffect(() => clearTimers, [clearTimers]);

  const run = useCallback(async () => {
    clearTimers();
    setError(null);
    setFieldErrors({});
    setResult(null);
    setStage('running');
    setStep(0);

    timers.current.push(setTimeout(() => setStep(1), STAGE_MS.connecting));
    timers.current.push(setTimeout(() => setStep(2), STAGE_MS.connecting + STAGE_MS.talking));

    const startedAt = Date.now();
    const minimum = STAGE_MS.connecting + STAGE_MS.talking + STAGE_MS.thinking;

    try {
      const outcome = await runTestCall(campaign.id, {
        name: name.trim(),
        phone: phone.trim(),
        // Only ever sent by a workspace that has the capability. The server
        // checks it again regardless, because a control the browser can see is
        // not a permission.
        // Sent only by a workspace that has the capability, and checked again
        // on the server regardless — a control the browser can see is not a
        // permission. The same two choices drive the preview above, so the call
        // holds the conversation the demonstration just played.
        ...(liveVoicePreview ? { language, scenario } : {}),
      });
      const elapsed = Date.now() - startedAt;
      timers.current.push(
        setTimeout(() => {
          setResult(outcome);
          setStage('done');
        }, Math.max(0, minimum - elapsed))
      );
    } catch (caught) {
      clearTimers();
      const apiError = caught instanceof ApiError ? caught : null;
      setFieldErrors(apiError?.fieldErrors ?? {});
      setError(
        Object.keys(apiError?.fieldErrors ?? {}).length > 0
          ? null
          : apiError?.message ?? 'The test call could not be completed.'
      );
      setStage('setup');
    }
  }, [campaign.id, name, phone, language, scenario, liveVoicePreview, clearTimers]);

  const close = useCallback(() => {
    clearTimers();
    onClose();
  }, [clearTimers, onClose]);

  const config = campaign.aiCallConfig;
  const canStart = name.trim().length > 0 && phone.trim().length >= 6;

  return (
    <dialog ref={dialogRef} className="lead-dialog agent-dialog demo-call-dialog" onCancel={close}>
      <div className="lead-dialog-head">
        <div>
          <DemoCallTag />
          <h2>{stage === 'done' ? 'Test call completed' : 'Test this campaign'}</h2>
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
          <>
            <p className="demo-call-intro">
              {campaign.agentName ?? 'This agent'} will hold a conversation using{' '}
              <strong>{campaign.name}</strong>&rsquo;s product, script and questions. Nothing is
              dialled — the number below is only shown so you can see who the test was aimed at.
            </p>

            <div className="call-parties">
              <div className="call-party">
                <span className="call-party-label">Agent &amp; campaign</span>
                <strong>{campaign.agentName ?? 'No agent'}</strong>
                <span>{campaign.name}</span>
                {config.callObjective ? (
                  <span className="badge purple">{CALL_OBJECTIVE_LABEL[config.callObjective]}</span>
                ) : null}
              </div>
              <span className="call-party-arrow" aria-hidden="true">
                <Icon name="arrow" size={16} />
              </span>
              <div className="call-party">
                <span className="call-party-label">Test contact — not contacted</span>
                <label className="field" style={{ width: '100%' }}>
                  <span className="visually-hidden">Name</span>
                  <input
                    className="field-input"
                    placeholder="Rajesh Kumar"
                    maxLength={80}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </label>
                {fieldErrors.name ? <span className="field-error">{fieldErrors.name}</span> : null}
                <label className="field" style={{ width: '100%' }}>
                  <span className="visually-hidden">Phone number</span>
                  <input
                    className="field-input"
                    placeholder="+91 90000 00000"
                    maxLength={24}
                    inputMode="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                  />
                </label>
                {fieldErrors.phone ? <span className="field-error">{fieldErrors.phone}</span> : null}
              </div>
            </div>

            {/* `open` as well as the capability: a closed dialog keeps its
                children mounted, and a preview that is still mounted is still
                fetching conversations and still telling Zemo it is on screen
                when nobody can see it. */}
            {liveVoicePreview && open ? (
              <ScenarioStudio
                campaignId={campaign.id}
                scenario={scenario}
                language={language}
                onScenario={setScenario}
                onLanguage={setLanguage}
              />
            ) : null}
          </>
        ) : null}

        {stage === 'running' ? (
          <div className="call-running">
            <span className="call-pulse" aria-hidden="true">
              <Icon name="phone" size={22} />
            </span>
            <strong>{STAGE_COPY[step]}</strong>
            <span className="call-running-meta">
              Simulated call — {name || 'your test contact'} is not being dialled
            </span>
            <ol className="call-stages" aria-label="Test call progress">
              {STAGE_COPY.map((copy, index) => (
                <li
                  key={copy}
                  className={index < step ? 'done' : index === step ? 'active' : undefined}
                >
                  {index < step ? <Icon name="check" size={12} /> : null}
                  {copy.replace('…', '')}
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        {stage === 'done' && result ? (
          <TestResult
            result={result}
            campaign={campaign}
            voicePreview={liveVoicePreview}
            activeTurn={activeTurn}
            onActiveTurn={setActiveTurn}
          />
        ) : null}
      </div>

      <div className="lead-dialog-actions">
        {stage === 'setup' ? (
          <>
            <button type="button" className="secondary-button" onClick={close}>
              Cancel
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => void run()}
              disabled={!canStart}
            >
              <Icon name="phone" size={15} /> Start test call
            </button>
          </>
        ) : null}

        {stage === 'running' ? (
          <button type="button" className="secondary-button" disabled>
            {STAGE_COPY[step]}
          </button>
        ) : null}

        {stage === 'done' && result ? (
          <>
            <button type="button" className="secondary-button" onClick={() => void run()}>
              Run another
            </button>
            <Link className="secondary-button" href={`/calls/${result.callId}`}>
              Open call
            </Link>
            <button type="button" className="primary-button" onClick={close}>
              Done
            </button>
          </>
        ) : null}
      </div>
    </dialog>
  );
}

function TestResult({
  result,
  campaign,
  voicePreview,
  activeTurn,
  onActiveTurn,
}: {
  result: TestCallResult;
  campaign: Campaign;
  /** Whether this workspace may hear the call read aloud. */
  voicePreview: boolean;
  /** Id of the line being spoken, so the transcript can show which one. */
  activeTurn: string | null;
  onActiveTurn: (id: string | null) => void;
}) {
  return (
    <>
      <p className="demo-call-intro">
        This was a simulated call against <strong>{campaign.name}</strong>. It is not counted in the
        campaign&rsquo;s figures and no lead&rsquo;s status changed.
      </p>

      <div className="call-parties compact">
        <div className="call-party">
          <span className="call-party-label">Agent</span>
          <strong>{campaign.agentName ?? 'No agent'}</strong>
          <span>{campaign.name}</span>
        </div>
        <span className="call-party-arrow" aria-hidden="true">
          <Icon name="arrow" size={16} />
        </span>
        <div className="call-party">
          <span className="call-party-label">Test contact — not contacted</span>
          <strong>{result.contact.name}</strong>
          <span>{result.contact.phone}</span>
        </div>
      </div>

      <dl className="detail-grid">
        <div className="detail-cell">
          <dt className="detail-label">Outcome</dt>
          <dd className="detail-value">
            {result.outcome ? (
              <StatusBadge status={CALL_OUTCOME_DISPLAY[result.outcome as CallOutcome]} />
            ) : (
              <span className="muted">Not recorded</span>
            )}
          </dd>
        </div>
        <div className="detail-cell">
          <dt className="detail-label">Duration</dt>
          <dd className="detail-value">
            {result.durationSeconds > 0 ? formatDuration(result.durationSeconds) : '—'}
          </dd>
        </div>
      </dl>

      {result.summary ? (
        <section className="call-section">
          <h3 className="call-section-title">Summary</h3>
          <p className="summary-text">{result.summary}</p>
          {result.nextAction ? (
            <p className="next-action">
              <span className="next-action-label">Next action</span>
              {result.nextAction}
            </p>
          ) : null}
        </section>
      ) : null}

      {voicePreview && result.transcript ? (
        <VoicePreview
          transcript={result.transcript}
          register={result.language}
          onActiveTurn={onActiveTurn}
        />
      ) : null}

      <section className="call-section">
        <h3 className="call-section-title">Transcript</h3>
        {result.transcript ? (
          <div className="transcript in-dialog">
            {/* Read with the same parser the speech plan is built from, so the
                line highlighted here is the line being spoken rather than one
                that happens to sit at the same index. */}
            {readTranscript(result.transcript).map((line, index) => {
              const id = `line-${index}`;
              const isAgent = line.speaker === 'AGENT';
              return (
                <div
                  key={id}
                  className={`transcript-line ${isAgent ? 'is-agent' : 'is-lead'}${
                    activeTurn === id ? ' is-speaking' : ''
                  }`}
                >
                  <span className="transcript-speaker">{isAgent ? 'Agent' : 'Lead'}</span>
                  <span className="transcript-text">{line.text}</span>
                  {activeTurn === id && isAgent ? (
                    <span className="transcript-speaking" aria-label="Speaking now">
                      <span className="voice-dot" aria-hidden="true" />
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon="phone"
            title="Nobody answered"
            description="This run simulated an unanswered call, so there was no conversation to record."
          />
        )}
      </section>
    </>
  );
}
