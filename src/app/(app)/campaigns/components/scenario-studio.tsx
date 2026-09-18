'use client';

import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@/components/icons';
import { StatusBadge } from '@/components/ui/badge';
import {
  clearVoicePreviewState,
  publishVoicePreviewState,
} from '@/components/speech/voice-preview-state';
import type { ConversationPhase } from '@/components/speech/use-voice-conversation';
import {
  PREVIEW_SCENARIO_HINT,
  PREVIEW_SCENARIO_LABEL,
  PREVIEW_SCENARIOS,
  type PreviewScenario,
} from '@/domain/voice-scenarios';
import type { CallOutcome } from '@/domain/types';
import { CALL_OUTCOME_DISPLAY } from '@/lib/status';
import { fetchVoicePreview, type VoicePreviewConversation } from '@/lib/campaigns';
import { ApiError } from '@/lib/api/client';
import {
  SPEECH_REGISTER_LABEL,
  SPEECH_REGISTERS,
  type SpeechRegister,
} from '@/lib/speech/speech-types';
import { ZemoVoiceAside } from '@/components/zemo/zemo-aside';
import { VoicePreview } from './voice-preview';

/**
 * "Let's try the agent."
 *
 * A salesperson sits with a prospect, picks the objection that prospect keeps
 * raising, picks the language they would actually be called in, and presses
 * play. That is the whole feature, and everything here exists to make those
 * three actions cost nothing.
 *
 * Costing nothing is meant literally. Changing a chip fetches a conversation
 * and writes nothing at all — no call, no lead, no membership, no follow-up, no
 * movement in any figure the customer looks at. Someone can flick through all
 * six in front of a client and leave their workspace exactly as it was.
 *
 * The conversation is the hero. The chips are deliberately quiet: small, low
 * contrast until chosen, and out of the way once a conversation is on screen.
 * They are the thing you touch for two seconds at the start, not the thing
 * anyone is meant to look at.
 */

export function ScenarioStudio({
  campaignId,
  scenario,
  language,
  onScenario,
  onLanguage,
}: {
  campaignId: string;
  /**
   * The choice is owned by the dialog rather than by this panel, because the
   * same two values also decide the conversation a real test call holds. One
   * selector, one meaning — otherwise the preview and the call it is supposed
   * to preview could quietly be about different things.
   */
  scenario: PreviewScenario;
  language: SpeechRegister;
  onScenario: (scenario: PreviewScenario) => void;
  onLanguage: (language: SpeechRegister) => void;
}) {
  const [conversation, setConversation] = useState<VoicePreviewConversation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<ConversationPhase>('idle');

  /**
   * Fetched once per choice, then left alone.
   *
   * Replay must say exactly what was said the first time, so the conversation
   * is state rather than something derived per render — and the effect below
   * only reruns when the choice actually changes.
   */
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    void fetchVoicePreview(campaignId, { scenario, language }, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setConversation(result);
        setLoading(false);
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;
        // An aborted request is not a failure; it is the previous choice being
        // overtaken by the current one.
        if (caught instanceof DOMException && caught.name === 'AbortError') return;
        setError(
          caught instanceof ApiError
            ? caught.message
            : 'That conversation could not be prepared. Please try again.'
        );
        setConversation(null);
        setLoading(false);
      });

    return () => controller.abort();
  }, [campaignId, scenario, language]);

  // Announced for Zemo, which reads it through `useVoicePreviewState()` — both
  // the line it says beside the preview here, and the answers it gives in its
  // own panel once the dialog is closed again. Published rather than passed;
  // `voice-preview-state.ts` says why.
  useEffect(() => {
    publishVoicePreviewState({
      open: true,
      scenario,
      language,
      loading,
      playing: phase === 'ai' || phase === 'prospect',
      speaking: phase === 'ai',
      paused: phase === 'paused',
      complete: phase === 'complete',
    });
  }, [scenario, language, phase, loading]);

  // Closing the dialog unmounts this, and the preview is then not open. A
  // scenario key left behind would have Zemo talking about a conversation
  // nobody is looking at.
  useEffect(() => clearVoicePreviewState, []);

  const onPhase = useCallback((next: ConversationPhase) => setPhase(next), []);

  return (
    <section className="scenario-studio" aria-label="Try a scenario">
      <div className="studio-chips">
        <fieldset className="studio-group">
          <legend>Try a scenario</legend>
          <p className="studio-lead">Choose how you want to demo the AI.</p>
          <div className="studio-options">
            {PREVIEW_SCENARIOS.map((option) => (
              <label
                key={option}
                className={`studio-chip${scenario === option ? ' is-selected' : ''}`}
                title={PREVIEW_SCENARIO_HINT[option]}
              >
                <input
                  type="radio"
                  name="preview-scenario"
                  value={option}
                  checked={scenario === option}
                  onChange={() => onScenario(option)}
                />
                <span>{PREVIEW_SCENARIO_LABEL[option]}</span>
              </label>
            ))}
          </div>
          <p className="studio-hint">{PREVIEW_SCENARIO_HINT[scenario]}</p>
        </fieldset>

        <fieldset className="studio-group">
          <legend>Language</legend>
          <div className="studio-options">
            {SPEECH_REGISTERS.map((option) => (
              <label
                key={option}
                className={`studio-chip${language === option ? ' is-selected' : ''}`}
              >
                <input
                  type="radio"
                  name="preview-language"
                  value={option}
                  checked={language === option}
                  onChange={() => onLanguage(option)}
                />
                <span>{SPEECH_REGISTER_LABEL[option]}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <ZemoVoiceAside />

      {error ? (
        <p className="form-alert" role="alert">
          {error}
        </p>
      ) : null}

      {conversation?.transcript ? (
        <Conversation
          key={`${conversation.scenario}:${conversation.language}`}
          conversation={conversation}
          onPhase={onPhase}
        />
      ) : loading ? (
        <p className="studio-loading" role="status">
          Preparing the conversation…
        </p>
      ) : null}
    </section>
  );
}

/**
 * One prepared conversation.
 *
 * Keyed on the choice that produced it, so switching scenario mounts a new one
 * rather than pouring a new transcript into a player that is mid-sentence.
 */
function Conversation({
  conversation,
  onPhase,
}: {
  conversation: VoicePreviewConversation;
  onPhase: (phase: ConversationPhase) => void;
}) {
  // What this conversation settled on, shown under it rather than over it: the
  // point of the demonstration is the call, and the outcome is the footnote
  // that makes it land.
  const outcome = conversation.outcome as CallOutcome | null;

  return (
    <div
      className="studio-conversation"
      // Names what is on screen right now. A conversation arrives a moment
      // after the chip is pressed, and without this there is nothing to tell
      // the new one from the one it replaced — not for a reader watching it
      // switch, and not for anything checking that it did.
      data-conversation={`${conversation.scenario}:${conversation.language}`}
    >
      <VoicePreview
        transcript={conversation.transcript}
        register={conversation.language}
        onPhase={onPhase}
        showTranscript
      />

      <div className="studio-outcome">
        <span className="studio-outcome-label">This call would be recorded as</span>
        {outcome ? <StatusBadge status={CALL_OUTCOME_DISPLAY[outcome]} /> : null}
        {conversation.nextAction ? (
          <p className="studio-next">
            <Icon name="arrow" size={13} />
            {conversation.nextAction}
          </p>
        ) : null}
        <p className="studio-footnote">
          Nothing here has been saved. This conversation was generated to be listened to — no call,
          no lead and no follow-up was created, and no figure in this workspace moved.
        </p>
      </div>
    </div>
  );
}
