'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { SectionPage } from '@/components/section-page';
import { Icon, type IconName } from '@/components/icons';
import { Card, CardHeader } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/badge';
import { DataTable, EntityCell } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import type { Lead } from '@/domain/types';
import { ApiError } from '@/lib/api/client';
import {
  fetchActivity,
  fetchSummary,
  type ActivityEvent,
  type AnalyticsSummary,
  type CampaignPerformance,
} from '@/lib/analytics';
import { fetchLeads, leadDisplayName, leadSecondaryLine } from '@/lib/leads';
import { formatRelativeTime, formatAbsoluteTime } from '@/lib/format';
import {
  CALL_OUTCOME_DISPLAY,
  CAMPAIGN_STATUS_DISPLAY,
  LEAD_STATUS_DISPLAY,
  activityDisplay,
  initials,
} from '@/lib/status';
import type { CallOutcome, CampaignStatus } from '@/domain/types';

const LEAD_COLUMNS = [
  { key: 'lead', header: 'Lead' },
  { key: 'status', header: 'Status' },
  { key: 'updated', header: 'Updated' },
] as const;

/** How many recent leads the dashboard shows. */
const RECENT_LEADS = 5;

type LoadState =
  | { phase: 'loading' }
  | { phase: 'ready'; summary: AnalyticsSummary; leads: Lead[]; activity: ActivityEvent[] }
  | { phase: 'error'; message: string };

export function DashboardView({ greetingName }: { greetingName: string | null }) {
  const [state, setState] = useState<LoadState>({ phase: 'loading' });
  const requestRef = useRef(0);

  const load = useCallback(async (signal?: AbortSignal) => {
    const requestId = ++requestRef.current;
    setState({ phase: 'loading' });

    try {
      const [summary, leads, activity] = await Promise.all([
        fetchSummary(signal),
        fetchLeads(signal),
        fetchActivity(8, signal),
      ]);
      if (requestRef.current !== requestId) return;
      setState({ phase: 'ready', summary, leads, activity });
    } catch (error) {
      if (signal?.aborted || requestRef.current !== requestId) return;
      const apiError = error instanceof ApiError ? error : null;
      setState({ phase: 'error', message: apiError?.message ?? 'We could not reach the server.' });
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  // The name is whatever the account actually carries. When signup did not
  // collect one there is nothing to greet by, and a name invented from an
  // email address would be worse than none.
  const title = greetingName ? `Welcome back, ${greetingName}.` : 'Welcome back.';

  if (state.phase === 'error') {
    return (
      <SectionPage eyebrow="Command center" title={title} subtitle="">
        <Card>
          <EmptyState
            icon="alert"
            title="We could not load your workspace"
            description={state.message}
            actions={
              <button type="button" className="secondary-button" onClick={() => void load()}>
                Try again
              </button>
            }
          />
        </Card>
      </SectionPage>
    );
  }

  if (state.phase === 'loading') {
    return (
      <SectionPage eyebrow="Command center" title={title} subtitle="Loading your workspace…">
        <section className="stat-grid" aria-label="Workspace summary">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="card stat-card">
              <span className="skeleton" style={{ width: 90 }} />
              <span className="skeleton" style={{ width: 60, height: 26, marginTop: 12 }} />
            </div>
          ))}
        </section>
      </SectionPage>
    );
  }

  const { summary, leads, activity } = state;
  const steps = setupSteps(summary);
  const outstanding = steps.filter((step) => !step.done);
  const attention = attentionItems(summary);
  const recentLeads = leads.slice(0, RECENT_LEADS);

  const qualified = summary.leads.byStatus.QUALIFIED ?? 0;
  const noAnswer = summary.calls.byStatus.NO_ANSWER ?? 0;
  const pendingFollowUps = summary.followUps.byStatus.PENDING ?? 0;
  const sentFollowUps = summary.followUps.byStatus.SENT ?? 0;

  return (
    <SectionPage
      eyebrow="Command center"
      title={title}
      subtitle="Here's what's happening with your leads today."
      actions={
        <Link className="primary-button" href="/leads">
          <Icon name="plus" size={15} /> Add leads
        </Link>
      }
    >
      {summary.calls.simulated > 0 ? (
        <p className="demo-banner" role="note">
          <strong>Demo mode.</strong>{' '}
          {summary.calls.simulated === summary.calls.total
            ? `All ${summary.calls.total.toLocaleString()} calls below were`
            : `${summary.calls.simulated.toLocaleString()} of ${summary.calls.total.toLocaleString()} calls below were`}{' '}
          simulated by AIBOT. The figures are real counts of real records — no phone number was
          dialled and no telephony provider is connected.
        </p>
      ) : null}

      {outstanding.length > 0 ? (
        <Card>
          <CardHeader
            title="Finish setting up your workspace"
            subtitle={`Next: ${outstanding[0]!.title.toLowerCase()}`}
            action={
              <div className="checklist-progress">
                <span className="progress-track">
                  <span
                    className="progress-fill"
                    style={{ width: `${Math.round(((steps.length - outstanding.length) / steps.length) * 100)}%` }}
                    role="progressbar"
                    aria-valuenow={steps.length - outstanding.length}
                    aria-valuemin={0}
                    aria-valuemax={steps.length}
                    aria-label="Workspace setup progress"
                  />
                </span>
                {steps.length - outstanding.length} of {steps.length}
              </div>
            }
          />
          <div className="checklist">
            {steps.map((step, index) => (
              <div key={step.id} className={`checklist-item${step.done ? ' done' : ''}`}>
                <span className={`checklist-marker${step.done ? ' done' : ''}`}>
                  {step.done ? <Icon name="check" size={13} /> : index + 1}
                </span>
                <span className="checklist-copy">
                  <strong>{step.title}</strong>
                  <span>{step.detail}</span>
                </span>
                {step.done ? (
                  <span className="badge green">Done</span>
                ) : (
                  <Link className="secondary-button" href={step.href}>
                    {step.actionLabel}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <section className="stat-grid" aria-label="Workspace summary">
        <StatCard
          label="Total leads"
          value={summary.leads.total.toLocaleString()}
          meta={qualified > 0 ? `${qualified.toLocaleString()} qualified` : 'None qualified yet'}
          icon="users"
        />
        <StatCard
          label="Active campaigns"
          value={summary.campaigns.running.toLocaleString()}
          meta={`${summary.campaigns.total.toLocaleString()} in total`}
          icon="megaphone"
        />
        <StatCard
          label="Calls"
          value={summary.calls.total.toLocaleString()}
          meta={`${summary.calls.answered.toLocaleString()} answered · ${noAnswer.toLocaleString()} no answer`}
          icon="phone"
        />
        <StatCard
          label="Follow-ups"
          value={summary.followUps.total.toLocaleString()}
          meta={`${sentFollowUps.toLocaleString()} sent · ${pendingFollowUps.toLocaleString()} pending`}
          icon="message"
        />
      </section>

      {summary.campaignPerformance.length > 0 ? (
        <Card>
          <CardHeader
            title="Campaign progress"
            subtitle="How far each campaign has worked through its leads"
            action={
              <Link href="/campaigns" className="card-link">
                View all
              </Link>
            }
          />
          <div className="progress-list">
            {summary.campaignPerformance.slice(0, 4).map((campaign) => (
              <CampaignProgress key={campaign.campaignId} campaign={campaign} />
            ))}
          </div>
        </Card>
      ) : null}

      <section className="grid-2">
        <Card>
          <CardHeader
            title="Recent leads"
            subtitle="The latest activity across your lead pipeline"
            action={
              <Link href="/leads" className="card-link">
                View all
              </Link>
            }
          />
          {recentLeads.length === 0 ? (
            <EmptyState
              icon="users"
              title="No leads yet"
              description="Add a lead or import a CSV, and AIBOT can start calling."
              actions={
                <Link className="primary-button" href="/leads">
                  Add leads
                </Link>
              }
            />
          ) : (
            <DataTable columns={LEAD_COLUMNS} caption="Most recently updated leads">
              {recentLeads.map((lead) => {
                const name = leadDisplayName(lead);
                return (
                  <tr key={lead.id}>
                    <td>
                      <EntityCell
                        initials={initials(name)}
                        name={name}
                        meta={leadSecondaryLine(lead)}
                      />
                    </td>
                    <td>
                      <StatusBadge status={LEAD_STATUS_DISPLAY[lead.status]} />
                    </td>
                    <td className="muted" title={formatAbsoluteTime(lead.updatedAt)}>
                      {formatRelativeTime(lead.updatedAt)}
                    </td>
                  </tr>
                );
              })}
            </DataTable>
          )}
        </Card>

        <div className="section-stack">
          <Card>
            <CardHeader title="Needs attention" subtitle="Leads waiting on a decision or a channel" />
            {attention.length === 0 ? (
              <EmptyState
                icon="check"
                title="Nothing waiting"
                description="Every lead has been handled and no follow-up is outstanding."
              />
            ) : (
              <div>
                {attention.map((item) => (
                  <div key={item.id} className="attention-item">
                    <span className={`attention-icon ${item.tone}`}>
                      <Icon name={item.icon} size={15} />
                    </span>
                    <span className="attention-copy">
                      <strong>{item.title}</strong>
                      <span>{item.detail}</span>
                    </span>
                    <Link className="card-link" href={item.href}>
                      {item.actionLabel}
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Recent activity" subtitle="Latest events from your workspace" />
            {activity.length === 0 ? (
              <EmptyState
                icon="clock"
                title="Nothing has happened yet"
                description="Imports, calls and follow-ups all appear here as they happen."
              />
            ) : (
              <div className="activity">
                {activity.map((event) => (
                  <ActivityRow key={event.id} event={event} />
                ))}
              </div>
            )}
          </Card>
        </div>
      </section>
    </SectionPage>
  );
}

function CampaignProgress({ campaign }: { campaign: CampaignPerformance }) {
  const display = CAMPAIGN_STATUS_DISPLAY[campaign.status as CampaignStatus] ?? {
    label: campaign.status,
    tone: 'gray' as const,
  };
  const percent = campaign.leads > 0 ? Math.round((campaign.attempted / campaign.leads) * 100) : 0;

  return (
    <div className="progress-row">
      <div className="progress-head">
        <Link href={`/campaigns/${campaign.campaignId}`} className="progress-name">
          {campaign.name}
        </Link>
        <span className={`badge ${display.tone}`}>{display.label}</span>
      </div>
      <span className="progress-track">
        <span
          className="progress-fill"
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={campaign.attempted}
          aria-valuemin={0}
          aria-valuemax={campaign.leads}
          aria-label={`${campaign.name} progress`}
        />
      </span>
      <div className="progress-meta">
        {campaign.attempted.toLocaleString()} of {campaign.leads.toLocaleString()} leads called
        {campaign.qualified > 0 ? ` · ${campaign.qualified.toLocaleString()} qualified` : ''}
      </div>
    </div>
  );
}

/**
 * One timeline entry.
 *
 * The detail line is built from the fields the writer actually stored for that
 * activity type; where it stored nothing extra, the lead name alone is the
 * whole story and no filler is invented to pad it out.
 */
function ActivityRow({ event }: { event: ActivityEvent }) {
  const display = activityDisplay(event.type);
  const name = event.leadName?.trim() || 'a lead';
  const detail = activityDetail(event, name);

  return (
    <div className="activity-item">
      <div className="activity-dot">
        <Icon name={display.icon} size={14} />
      </div>
      <div className="activity-copy">
        <strong>{display.label}</strong>
        <span>{detail}</span>
      </div>
      <div className="activity-time" title={formatAbsoluteTime(event.createdAt)}>
        {formatRelativeTime(event.createdAt)}
      </div>
    </div>
  );
}

/** The stored fields for this activity, read back as a sentence. */
function activityDetail(event: ActivityEvent, name: string): string {
  const summary = typeof event.data.summary === 'string' ? event.data.summary.trim() : '';
  if (summary) return summary;

  const outcome = typeof event.data.outcome === 'string' ? event.data.outcome : null;
  if (outcome) {
    const label = CALL_OUTCOME_DISPLAY[outcome as CallOutcome]?.label ?? outcome;
    return `${name} — ${label.toLowerCase()}`;
  }

  const channel = typeof event.data.channel === 'string' ? event.data.channel : null;
  if (channel) return `${name} · ${channel === 'WHATSAPP' ? 'WhatsApp' : channel.toLowerCase()}`;

  return name;
}

interface SetupStep {
  id: string;
  title: string;
  detail: string;
  href: string;
  actionLabel: string;
  done: boolean;
}

/**
 * The guided setup, derived from what the workspace actually contains.
 *
 * Every step's `done` is a real count, so the checklist cannot congratulate
 * someone for work they have not done. The last step is running demo calls
 * rather than connecting WhatsApp: connecting a real messaging account is not
 * something this build can complete, and a step that can never be ticked does
 * not belong in a checklist.
 */
function setupSteps(summary: AnalyticsSummary): SetupStep[] {
  return [
    {
      id: 'leads',
      title: 'Add your leads',
      detail: 'Add leads manually or upload a CSV or Excel file.',
      href: '/leads',
      actionLabel: 'Add leads',
      done: summary.leads.total > 0,
    },
    {
      id: 'agent',
      title: 'Create an AI agent',
      detail: 'Give your agent a goal and the context it should talk about.',
      href: '/agents',
      actionLabel: 'Create agent',
      done: summary.agents.total > 0,
    },
    {
      id: 'campaign',
      title: 'Build a campaign',
      detail: 'Pick the leads to call and the agent that calls them.',
      href: '/campaigns',
      actionLabel: 'New campaign',
      done: summary.campaigns.total > 0,
    },
    {
      id: 'calls',
      title: 'Run your first calls',
      detail: 'Start the campaign to see transcripts, outcomes and follow-ups.',
      href: '/campaigns',
      actionLabel: 'Open campaigns',
      done: summary.calls.total > 0,
    },
  ];
}

interface AttentionItem {
  id: string;
  icon: IconName;
  tone: 'amber' | 'purple' | 'gray';
  title: string;
  detail: string;
  actionLabel: string;
  href: string;
}

/**
 * Triage, built only from counts that are actually non-zero.
 *
 * An item is shown because there is something to do about it. A card listing
 * "0 leads did not answer" is noise, and inventing an item to fill the space
 * would send the user to a page with nothing on it.
 */
function attentionItems(summary: AnalyticsSummary): AttentionItem[] {
  const items: AttentionItem[] = [];

  const pending = summary.followUps.byStatus.PENDING ?? 0;
  if (pending > 0) {
    items.push({
      id: 'follow-ups',
      icon: 'message',
      tone: 'amber',
      title: `${pending.toLocaleString()} ${pending === 1 ? 'follow-up is' : 'follow-ups are'} waiting`,
      detail: 'Scheduled after a call, ready to be sent.',
      actionLabel: 'Review',
      href: '/whatsapp',
    });
  }

  const followUpLeads = summary.leads.byStatus.FOLLOW_UP ?? 0;
  if (followUpLeads > 0) {
    items.push({
      id: 'follow-up-leads',
      icon: 'clock',
      tone: 'purple',
      title: `${followUpLeads.toLocaleString()} ${followUpLeads === 1 ? 'lead' : 'leads'} asked to be called back`,
      detail: 'Your agent flagged these for a second conversation.',
      actionLabel: 'View leads',
      href: '/leads',
    });
  }

  const unanswered = summary.leads.byStatus.NO_ANSWER ?? 0;
  if (unanswered > 0) {
    items.push({
      id: 'no-answer',
      icon: 'phone',
      tone: 'gray',
      title: `${unanswered.toLocaleString()} ${unanswered === 1 ? 'lead' : 'leads'} did not answer`,
      detail: 'Try again, or reach them on another channel.',
      actionLabel: 'View leads',
      href: '/leads',
    });
  }

  const draft = summary.campaigns.draft;
  if (draft > 0) {
    items.push({
      id: 'draft',
      icon: 'megaphone',
      tone: 'gray',
      title: `${draft.toLocaleString()} ${draft === 1 ? 'campaign has' : 'campaigns have'} not started`,
      detail: 'They will not call anyone until you start them.',
      actionLabel: 'Open campaigns',
      href: '/campaigns',
    });
  }

  return items;
}
