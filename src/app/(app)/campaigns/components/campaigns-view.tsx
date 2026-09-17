'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { SectionPage } from '@/components/section-page';
import { Icon } from '@/components/icons';
import { Card, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import type { Agent, Campaign } from '@/domain/types';
import { ApiError } from '@/lib/api/client';
import { fetchAgents } from '@/lib/agents';
import { fetchCampaigns } from '@/lib/campaigns';
import { CAMPAIGN_STATUS_DISPLAY } from '@/lib/status';
import { CampaignDialog } from './campaign-dialog';

type LoadState =
  | { phase: 'loading' }
  | { phase: 'ready'; campaigns: Campaign[]; agents: Agent[] }
  | { phase: 'error'; title: string; message: string; needsSignIn: boolean };

export function CampaignsView() {
  const [state, setState] = useState<LoadState>({ phase: 'loading' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const requestRef = useRef(0);

  const load = useCallback(async (signal?: AbortSignal) => {
    const requestId = ++requestRef.current;
    setState({ phase: 'loading' });

    try {
      // Agents are needed to create a campaign, so both are fetched together
      // rather than making the dialog load on open.
      const [campaigns, agents] = await Promise.all([fetchCampaigns(signal), fetchAgents(signal)]);
      if (requestRef.current !== requestId) return;
      setState({ phase: 'ready', campaigns, agents });
    } catch (error) {
      if (signal?.aborted || requestRef.current !== requestId) return;
      const apiError = error instanceof ApiError ? error : null;
      setState({
        phase: 'error',
        title: apiError?.isAuthError ? 'Your session has expired' : 'We could not load your campaigns',
        message:
          apiError?.isAuthError
            ? 'Sign in again to continue working in this workspace.'
            : apiError?.message ?? 'We could not reach the server. Check your connection.',
        needsSignIn: Boolean(apiError?.isAuthError),
      });
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const handleCreated = useCallback((campaign: Campaign) => {
    setDialogOpen(false);
    setState((current) =>
      current.phase === 'ready'
        ? { ...current, campaigns: [campaign, ...current.campaigns] }
        : current
    );
  }, []);

  const campaigns = state.phase === 'ready' ? state.campaigns : [];
  const agents = state.phase === 'ready' ? state.agents : [];

  return (
    <SectionPage
      eyebrow="Outbound engine"
      title="Campaigns"
      subtitle="Choose a lead list and put your AI agent to work."
      actions={
        <button
          type="button"
          className="primary-button"
          data-tour="campaigns-new"
          onClick={() => setDialogOpen(true)}
          disabled={state.phase !== 'ready'}
        >
          <Icon name="plus" size={15} /> New campaign
        </button>
      }
    >
      {state.phase === 'loading' ? (
        <Card>
          <div className="card-body">
            <span className="skeleton" style={{ width: 220 }} />
            <span className="skeleton" style={{ width: 160, marginTop: 10 }} />
          </div>
        </Card>
      ) : null}

      {state.phase === 'error' ? (
        <Card>
          <EmptyState
            icon="alert"
            title={state.title}
            description={state.message}
            actions={
              state.needsSignIn ? (
                <a className="primary-button" href="/login?next=/campaigns">
                  Sign in again
                </a>
              ) : (
                <button type="button" className="secondary-button" onClick={() => void load()}>
                  Try again
                </button>
              )
            }
          />
        </Card>
      ) : null}

      {state.phase === 'ready' && campaigns.length === 0 ? (
        <Card>
          <EmptyState
            icon="megaphone"
            title="No campaigns yet"
            description={
              agents.some((agent) => agent.active)
                ? 'A campaign pairs an agent with a list of leads, then calls them.'
                : 'Create an AI agent first — a campaign needs one to make calls.'
            }
            actions={
              agents.some((agent) => agent.active) ? (
                <button type="button" className="primary-button" onClick={() => setDialogOpen(true)}>
                  <Icon name="plus" size={15} /> Create a campaign
                </button>
              ) : (
                <Link className="primary-button" href="/agents">
                  Create an agent
                </Link>
              )
            }
          />
        </Card>
      ) : null}

      {campaigns.map((campaign) => {
        const display = CAMPAIGN_STATUS_DISPLAY[campaign.status];
        return (
          <Card key={campaign.id} tourTarget="campaign-row">
            <CardHeader
              title={campaign.name}
              subtitle={campaign.agentName ?? 'No agent assigned'}
              action={
                <div className="page-head-actions">
                  <span className={`badge ${display.tone}`}>{display.label}</span>
                  <Link className="card-link" href={`/campaigns/${campaign.id}`}>
                    Open
                  </Link>
                </div>
              }
            />
            <dl className="breakdown">
              <div className="breakdown-cell">
                <dt className="breakdown-label">Max attempts</dt>
                <dd className="breakdown-value">{campaign.maxAttempts}</dd>
              </div>
              <div className="breakdown-cell">
                <dt className="breakdown-label">WhatsApp follow-up</dt>
                <dd className="breakdown-value">
                  {campaign.whatsappFallbackEnabled ? 'On' : 'Off'}
                </dd>
              </div>
              <div className="breakdown-cell">
                <dt className="breakdown-label">Follow-up delay</dt>
                <dd className="breakdown-value">
                  {campaign.whatsappFallbackEnabled
                    ? `${campaign.whatsappFallbackDelayMinutes} min`
                    : '—'}
                </dd>
              </div>
            </dl>
          </Card>
        );
      })}

      <CampaignDialog
        open={dialogOpen}
        agents={agents}
        onClose={() => setDialogOpen(false)}
        onCreated={handleCreated}
      />
    </SectionPage>
  );
}
