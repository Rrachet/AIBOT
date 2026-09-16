'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { SectionPage } from '@/components/section-page';
import { Icon } from '@/components/icons';
import { Card, CardHeader } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import type { CampaignMember, Lead } from '@/domain/types';
import { ApiError } from '@/lib/api/client';
import { fetchLeads } from '@/lib/leads';
import {
  attachLeads,
  fetchCampaign,
  saveAiCallConfig,
  startCampaign,
  stopCampaign,
  type CampaignDetail,
} from '@/lib/campaigns';
import { readiness, type AiCallConfig } from '@/domain/ai-config';
import { CAMPAIGN_STATUS_DISPLAY, LEAD_STATUS_DISPLAY } from '@/lib/status';
import { AttachLeadsDialog } from './attach-leads-dialog';
import { AiConfigForm } from './ai-config-form';
import { ReadinessPanel } from './readiness-panel';
import { TestCallDialog } from './test-call-dialog';

const MEMBER_COLUMNS = [
  { key: 'lead', header: 'Lead' },
  { key: 'phone', header: 'Phone' },
  { key: 'status', header: 'Status' },
  { key: 'attempts', header: 'Attempts', numeric: true },
] as const;

type LoadState =
  | { phase: 'loading' }
  | { phase: 'ready'; detail: CampaignDetail; leads: Lead[] }
  | { phase: 'error'; title: string; message: string; notFound: boolean };

export function CampaignDetailView({ campaignId }: { campaignId: string }) {
  const [state, setState] = useState<LoadState>({ phase: 'loading' });
  const [attachOpen, setAttachOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  // The form is edited locally and saved explicitly, so a half-typed script is
  // never written to the campaign.
  const [draft, setDraft] = useState<AiCallConfig | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      const requestId = ++requestRef.current;
      setState({ phase: 'loading' });

      try {
        const [detail, leads] = await Promise.all([
          fetchCampaign(campaignId, signal),
          fetchLeads(signal),
        ]);
        if (requestRef.current !== requestId) return;
        setDraft(detail.campaign.aiCallConfig);
        setState({ phase: 'ready', detail, leads });
      } catch (error) {
        if (signal?.aborted || requestRef.current !== requestId) return;
        const apiError = error instanceof ApiError ? error : null;
        setState({
          phase: 'error',
          title: apiError?.status === 404 ? 'Campaign not found' : 'We could not load this campaign',
          message:
            apiError?.status === 404
              ? 'It may have been deleted, or it belongs to another workspace.'
              : apiError?.message ?? 'We could not reach the server.',
          notFound: apiError?.status === 404,
        });
      }
    },
    [campaignId]
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const handleAttached = useCallback(
    async (result: { attached: number; skipped: number }) => {
      setAttachOpen(false);
      setNotice(
        result.skipped > 0
          ? `${result.attached} added, ${result.skipped} already on this campaign.`
          : `${result.attached} ${result.attached === 1 ? 'lead' : 'leads'} added.`
      );
      await load();
    },
    [load]
  );

  const saveConfig = useCallback(async () => {
    if (!draft) return;
    setSavingConfig(true);
    setActionError(null);
    setNotice(null);
    try {
      const saved = await saveAiCallConfig(campaignId, draft);
      setDraft(saved.aiCallConfig);
      setState((current) =>
        current.phase === 'ready'
          ? { ...current, detail: { ...current.detail, campaign: saved } }
          : current
      );
      setNotice('Configuration saved.');
    } catch (error) {
      const apiError = error instanceof ApiError ? error : null;
      setActionError(apiError?.message ?? 'We could not save this configuration.');
    } finally {
      setSavingConfig(false);
    }
  }, [campaignId, draft]);

  const transition = useCallback(
    async (action: 'start' | 'stop') => {
      setBusy(true);
      setActionError(null);
      setNotice(null);
      try {
        await (action === 'start' ? startCampaign(campaignId) : stopCampaign(campaignId));
        await load();
      } catch (error) {
        const apiError = error instanceof ApiError ? error : null;
        // The API refuses with a reason — no agent, paused agent, no leads —
        // and that reason is what the user needs to act on.
        setActionError(apiError?.message ?? `We could not ${action} this campaign.`);
      } finally {
        setBusy(false);
      }
    },
    [campaignId, load]
  );

  if (state.phase === 'loading') {
    return (
      <SectionPage eyebrow="Outbound engine" title="Campaign" subtitle="Loading…">
        <Card>
          <div className="card-body">
            <span className="skeleton" style={{ width: 220 }} />
            <span className="skeleton" style={{ width: 160, marginTop: 10 }} />
          </div>
        </Card>
      </SectionPage>
    );
  }

  if (state.phase === 'error') {
    return (
      <SectionPage eyebrow="Outbound engine" title="Campaign" subtitle="">
        <Card>
          <EmptyState
            icon="alert"
            title={state.title}
            description={state.message}
            actions={
              state.notFound ? (
                <Link className="primary-button" href="/campaigns">
                  Back to campaigns
                </Link>
              ) : (
                <button type="button" className="secondary-button" onClick={() => void load()}>
                  Try again
                </button>
              )
            }
          />
        </Card>
      </SectionPage>
    );
  }

  const { campaign, members, callCount } = state.detail;
  const display = CAMPAIGN_STATUS_DISPLAY[campaign.status];
  const running = campaign.status === 'RUNNING';
  const readinessItems = readiness({
    hasAgent: Boolean(campaign.agentId),
    // The detail response embeds the agent, so an agent that was paused after
    // the campaign was built still shows as a blocker.
    agentActive: state.detail.agentActive,
    config: draft ?? campaign.aiCallConfig,
    leadCount: members.length,
  });

  const attachedIds = new Set(members.map((member) => member.leadId));
  const available = state.leads.filter((lead) => !attachedIds.has(lead.id));

  return (
    <SectionPage
      eyebrow="Outbound engine"
      title={campaign.name}
      subtitle={campaign.agentName ? `Agent: ${campaign.agentName}` : 'No agent assigned'}
      actions={
        <>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setAttachOpen(true)}
            disabled={busy}
          >
            <Icon name="plus" size={15} /> Add leads
          </button>
          <button type="button" className="secondary-button" onClick={() => setTestOpen(true)}>
            <Icon name="phone" size={15} /> Test call
          </button>
        </>
      }
    >
      {actionError ? (
        <p className="form-alert" role="alert">
          {actionError}
        </p>
      ) : null}
      {notice ? <p className="form-notice">{notice}</p> : null}

      <ReadinessPanel
        items={readinessItems}
        onTestCall={() => setTestOpen(true)}
        onStart={() => void transition(running ? 'stop' : 'start')}
        starting={busy}
        running={running}
      />

      <Card>
        <CardHeader
          title="Campaign"
          subtitle="Settings this campaign runs with"
          action={<span className={`badge ${display.tone}`}>{display.label}</span>}
        />
        <dl className="breakdown">
          <div className="breakdown-cell">
            <dt className="breakdown-label">Leads</dt>
            <dd className="breakdown-value">{members.length}</dd>
          </div>
          <div className="breakdown-cell">
            <dt className="breakdown-label">Calls</dt>
            <dd className="breakdown-value">{callCount}</dd>
          </div>
          <div className="breakdown-cell">
            <dt className="breakdown-label">Max attempts</dt>
            <dd className="breakdown-value">{campaign.maxAttempts}</dd>
          </div>
          <div className="breakdown-cell">
            <dt className="breakdown-label">WhatsApp follow-up</dt>
            <dd className="breakdown-value">
              {campaign.whatsappFallbackEnabled
                ? `After ${campaign.whatsappFallbackDelayMinutes} min`
                : 'Off'}
            </dd>
          </div>
        </dl>
      </Card>

      <Card>
        <CardHeader
          title="Leads in this campaign"
          subtitle={
            members.length === 0
              ? 'Attach the people this campaign should call'
              : `${members.length} ${members.length === 1 ? 'lead' : 'leads'}`
          }
        />
        {members.length === 0 ? (
          <EmptyState
            icon="users"
            title="No leads attached"
            description="A campaign needs at least one lead before it can start."
            actions={
              <button type="button" className="primary-button" onClick={() => setAttachOpen(true)}>
                <Icon name="plus" size={15} /> Add leads
              </button>
            }
          />
        ) : (
          <DataTable columns={MEMBER_COLUMNS} caption="Leads attached to this campaign">
            {members.map((member) => (
              <MemberRow key={member.leadId} member={member} />
            ))}
          </DataTable>
        )}
      </Card>

      {draft ? (
        <AiConfigForm
          value={draft}
          campaignId={campaignId}
          saving={savingConfig}
          onChange={setDraft}
          onSave={() => void saveConfig()}
        />
      ) : null}

      <TestCallDialog open={testOpen} campaign={campaign} onClose={() => setTestOpen(false)} />

      <AttachLeadsDialog
        open={attachOpen}
        campaignId={campaignId}
        leads={available}
        onClose={() => setAttachOpen(false)}
        onAttached={handleAttached}
      />
    </SectionPage>
  );
}

function MemberRow({ member }: { member: CampaignMember }) {
  const status = LEAD_STATUS_DISPLAY[member.status];
  return (
    <tr>
      <td>
        <div className="lead-name">
          <span>
            <strong>{member.name?.trim() || 'Unnamed lead'}</strong>
            {member.company ? <span className="lead-sub">{member.company}</span> : null}
          </span>
        </div>
      </td>
      <td className="numeric">{member.phone}</td>
      <td>
        <span className={`badge ${status.tone}`}>{status.label}</span>
      </td>
      <td className="numeric">{member.attempts}</td>
    </tr>
  );
}
