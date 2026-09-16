'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { SectionPage } from '@/components/section-page';
import { Card, CardHeader } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { ApiError } from '@/lib/api/client';
import { fetchSummary, formatRate, type AnalyticsSummary } from '@/lib/analytics';
import { CAMPAIGN_STATUS_DISPLAY, formatDuration } from '@/lib/status';
import type { CampaignStatus } from '@/domain/types';

const AGENT_COLUMNS = [
  { key: 'agent', header: 'Agent' },
  { key: 'calls', header: 'Calls', numeric: true },
  { key: 'connect', header: 'Answer rate', numeric: true },
  { key: 'qualification', header: 'Qualification rate', numeric: true },
  { key: 'duration', header: 'Avg. duration', numeric: true },
] as const;

const CAMPAIGN_COLUMNS = [
  { key: 'campaign', header: 'Campaign' },
  { key: 'status', header: 'Status' },
  { key: 'leads', header: 'Leads', numeric: true },
  { key: 'called', header: 'Called', numeric: true },
  { key: 'qualified', header: 'Qualified', numeric: true },
  { key: 'followUp', header: 'Follow-up', numeric: true },
  { key: 'notInterested', header: 'Not interested', numeric: true },
] as const;

type LoadState =
  | { phase: 'loading' }
  | { phase: 'ready'; summary: AnalyticsSummary }
  | { phase: 'error'; message: string };

export function AnalyticsView() {
  const [state, setState] = useState<LoadState>({ phase: 'loading' });
  const requestRef = useRef(0);

  const load = useCallback(async (signal?: AbortSignal) => {
    const requestId = ++requestRef.current;
    setState({ phase: 'loading' });

    try {
      const summary = await fetchSummary(signal);
      if (requestRef.current !== requestId) return;
      setState({ phase: 'ready', summary });
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

  if (state.phase === 'loading') {
    return (
      <SectionPage eyebrow="Performance" title="Analytics" subtitle="Loading your figures…">
        <section className="stat-grid" aria-label="Outreach performance">
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

  if (state.phase === 'error') {
    return (
      <SectionPage eyebrow="Performance" title="Analytics" subtitle="">
        <Card>
          <EmptyState
            icon="alert"
            title="We could not load your figures"
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

  const { summary } = state;
  const { calls, leads, followUps, coverage } = summary;

  const qualified = calls.byOutcome.QUALIFIED ?? 0;
  const followUpOutcome = calls.byOutcome.FOLLOW_UP ?? 0;
  const notInterested = calls.byOutcome.NOT_INTERESTED ?? 0;
  const completed = calls.byStatus.COMPLETED ?? 0;
  const noAnswer = calls.byStatus.NO_ANSWER ?? 0;
  const pendingFollowUps = followUps.byStatus.PENDING ?? 0;
  const sentFollowUps = followUps.byStatus.SENT ?? 0;

  const truncated = coverage.callsTruncated || coverage.leadsTruncated || coverage.followUpsTruncated;

  if (calls.total === 0) {
    return (
      <SectionPage
        eyebrow="Performance"
        title="Analytics"
        subtitle="Understand how your AI outreach turns leads into conversations."
      >
        <Card>
          <EmptyState
            icon="chart"
            title="No calls to measure yet"
            description="Run a campaign and this page fills in from its results. Nothing here is estimated — every figure is counted from your own records."
            actions={
              <Link className="primary-button" href="/campaigns">
                Go to campaigns
              </Link>
            }
          />
        </Card>
      </SectionPage>
    );
  }

  return (
    <SectionPage
      eyebrow="Performance"
      title="Analytics"
      subtitle="Understand how your AI outreach turns leads into conversations."
    >
      {calls.simulated > 0 ? (
        <p className="demo-banner" role="note">
          <strong>Demo mode.</strong>{' '}
          {calls.simulated === calls.total
            ? 'Every call counted here was'
            : `${calls.simulated.toLocaleString()} of ${calls.total.toLocaleString()} calls counted here were`}{' '}
          simulated by AIBOT. The arithmetic is real and runs over real rows — but the conversations
          behind it never reached a phone.
        </p>
      ) : null}

      {truncated ? (
        <p className="demo-banner" role="note">
          <strong>Partial breakdown.</strong> The totals below are exact, but the rates and the
          per-agent and per-campaign tables are computed from the most recent{' '}
          {coverage.sampleLimit.toLocaleString()} records.
        </p>
      ) : null}

      <section className="stat-grid" aria-label="Outreach performance">
        <StatCard
          label="Calls placed"
          value={calls.total.toLocaleString()}
          meta={`${completed.toLocaleString()} completed · ${noAnswer.toLocaleString()} no answer`}
          icon="phone"
        />
        <StatCard
          label="Answer rate"
          value={formatRate(calls.answered, calls.total)}
          meta={`${calls.answered.toLocaleString()} of ${calls.total.toLocaleString()} answered`}
          icon="link"
        />
        <StatCard
          label="Qualification rate"
          value={formatRate(qualified, calls.answered)}
          meta={
            calls.answered > 0
              ? `${qualified.toLocaleString()} of ${calls.answered.toLocaleString()} answered calls`
              : 'No answered calls yet'
          }
          icon="target"
        />
        <StatCard
          label="Avg. call length"
          value={calls.avgDurationSeconds > 0 ? formatDuration(calls.avgDurationSeconds) : '—'}
          meta="Across answered calls"
          icon="clock"
        />
      </section>

      <Card>
        <CardHeader
          title="Outcomes"
          subtitle="What every call in this workspace led to — percentages are of all calls, not of answered ones"
        />
        <dl className="detail-grid">
          <Fact label="Total leads" value={leads.total.toLocaleString()} />
          <Fact label="Calls" value={calls.total.toLocaleString()} />
          <Fact label="Completed" value={completed.toLocaleString()} />
          <Fact label="No answer" value={noAnswer.toLocaleString()} />
          <Fact
            label="Qualified"
            value={`${qualified.toLocaleString()} (${formatRate(qualified, calls.total)})`}
          />
          <Fact
            label="Follow-up"
            value={`${followUpOutcome.toLocaleString()} (${formatRate(followUpOutcome, calls.total)})`}
          />
          <Fact
            label="Not interested"
            value={`${notInterested.toLocaleString()} (${formatRate(notInterested, calls.total)})`}
          />
          <Fact
            label="Follow-ups"
            value={`${sentFollowUps.toLocaleString()} sent · ${pendingFollowUps.toLocaleString()} pending`}
          />
        </dl>
      </Card>

      <Card>
        <CardHeader
          title="Campaign performance"
          subtitle="How each campaign converted the leads attached to it"
        />
        {summary.campaignPerformance.length === 0 ? (
          <EmptyState
            icon="megaphone"
            title="No campaigns yet"
            description="Build a campaign and its results appear here."
          />
        ) : (
          <DataTable columns={CAMPAIGN_COLUMNS} caption="Performance by campaign">
            {summary.campaignPerformance.map((row) => {
              const display = CAMPAIGN_STATUS_DISPLAY[row.status as CampaignStatus] ?? {
                label: row.status,
                tone: 'gray' as const,
              };
              return (
                <tr key={row.campaignId}>
                  <td style={{ fontWeight: 600 }}>
                    <Link href={`/campaigns/${row.campaignId}`}>{row.name}</Link>
                  </td>
                  <td>
                    <span className={`badge ${display.tone}`}>{display.label}</span>
                  </td>
                  <td className="numeric">{row.leads.toLocaleString()}</td>
                  <td className="numeric">{row.attempted.toLocaleString()}</td>
                  <td className="numeric">{row.qualified.toLocaleString()}</td>
                  <td className="numeric">{row.followUp.toLocaleString()}</td>
                  <td className="numeric">{row.notInterested.toLocaleString()}</td>
                </tr>
              );
            })}
          </DataTable>
        )}
      </Card>

      <Card>
        <CardHeader title="Agent performance" subtitle="How each agent is converting conversations" />
        {summary.agentPerformance.length === 0 ? (
          <EmptyState
            icon="bot"
            title="No agents yet"
            description="Create an agent and its results appear here."
          />
        ) : (
          <DataTable columns={AGENT_COLUMNS} caption="Performance by agent">
            {summary.agentPerformance.map((row) => (
              <tr key={row.agentId}>
                <td style={{ fontWeight: 600 }}>{row.agentName}</td>
                <td className="numeric">{row.calls.toLocaleString()}</td>
                <td className="numeric">{formatRate(row.answered, row.calls)}</td>
                <td className="numeric">{formatRate(row.qualified, row.answered)}</td>
                <td className="numeric">
                  {row.avgDurationSeconds > 0 ? formatDuration(row.avgDurationSeconds) : '—'}
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </Card>
    </SectionPage>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-cell">
      <dt className="detail-label">{label}</dt>
      <dd className="detail-value">{value}</dd>
    </div>
  );
}
