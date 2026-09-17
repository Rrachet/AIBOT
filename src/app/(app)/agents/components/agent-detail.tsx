'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { SectionPage } from '@/components/section-page';
import { Icon } from '@/components/icons';
import { Card, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/badge';
import { DemoCallTag } from '@/components/ui/demo-tag';
import { DataTable } from '@/components/ui/data-table';
import type { Agent, Call, Lead } from '@/domain/types';
import { ApiError } from '@/lib/api/client';
import { fetchAgent } from '@/lib/agents';
import { fetchLeads } from '@/lib/leads';
import { callLeadName, fetchCalls } from '@/lib/calls';
import { formatAbsoluteTime, formatRelativeTime } from '@/lib/format';
import { CALL_OUTCOME_DISPLAY, formatDuration } from '@/lib/status';
import { AgentDialog } from './agent-dialog';
import { DemoCallDialog } from './demo-call-dialog';

const CALL_COLUMNS = [
  { key: 'contact', header: 'Contact' },
  { key: 'when', header: 'When' },
  { key: 'duration', header: 'Duration', numeric: true },
  { key: 'outcome', header: 'Outcome' },
] as const;

/** How many of this agent's recent calls the page lists. */
const RECENT_CALLS = 8;

type LoadState =
  | { phase: 'loading' }
  | { phase: 'ready'; agent: Agent; leads: Lead[]; calls: Call[] }
  | { phase: 'error'; title: string; message: string; notFound: boolean };

export function AgentDetailView({ agentId }: { agentId: string }) {
  const [state, setState] = useState<LoadState>({ phase: 'loading' });
  const [editOpen, setEditOpen] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const requestRef = useRef(0);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      const requestId = ++requestRef.current;
      setState({ phase: 'loading' });

      try {
        const [agent, leads, calls] = await Promise.all([
          fetchAgent(agentId, signal),
          fetchLeads(signal),
          fetchCalls({ signal }),
        ]);
        if (requestRef.current !== requestId) return;
        setState({
          phase: 'ready',
          agent,
          leads,
          calls: calls.filter((call) => call.agentId === agentId).slice(0, RECENT_CALLS),
        });
      } catch (error) {
        if (signal?.aborted || requestRef.current !== requestId) return;
        const apiError = error instanceof ApiError ? error : null;
        setState({
          phase: 'error',
          title: apiError?.status === 404 ? 'Agent not found' : 'We could not load this agent',
          message:
            apiError?.status === 404
              ? 'It may have been deleted, or it belongs to another workspace.'
              : apiError?.message ?? 'We could not reach the server.',
          notFound: apiError?.status === 404,
        });
      }
    },
    [agentId]
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const handleSaved = useCallback((saved: Agent) => {
    setEditOpen(false);
    setState((current) => (current.phase === 'ready' ? { ...current, agent: saved } : current));
  }, []);

  // A demo call writes a call row, so the list under it is stale once the
  // dialog closes.
  const handleCallClosed = useCallback(() => {
    setCallOpen(false);
    void load();
  }, [load]);

  if (state.phase === 'loading') {
    return (
      <SectionPage eyebrow="AI workforce" title="Agent" subtitle="Loading…">
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
      <SectionPage eyebrow="AI workforce" title="Agent" subtitle="">
        <Card>
          <EmptyState
            icon="alert"
            title={state.title}
            description={state.message}
            actions={
              state.notFound ? (
                <Link className="primary-button" href="/agents">
                  Back to agents
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

  const { agent, leads, calls } = state;

  return (
    <SectionPage
      eyebrow="AI workforce"
      title={agent.name}
      subtitle={agent.companyName ? `Calling on behalf of ${agent.companyName}` : 'No company set'}
      actions={
        <>
          <Link className="secondary-button" href="/agents">
            All agents
          </Link>
          <button type="button" className="secondary-button" onClick={() => setEditOpen(true)}>
            Edit
          </button>
          <button type="button" className="primary-button" onClick={() => setCallOpen(true)}>
            <Icon name="phone" size={15} /> Make demo call
          </button>
        </>
      }
    >
      <Card>
        <CardHeader
          title="Hear this agent first"
          subtitle="A short simulated conversation, using this agent's own goal, instructions and business context"
          action={<DemoCallTag />}
        />
        <div className="card-body demo-call-cta">
          <p>
            Nothing is dialled and nobody is contacted. It is the quickest way to check the agent
            says what you want before you point it at a list of real people.
          </p>
          <button type="button" className="primary-button" onClick={() => setCallOpen(true)}>
            <Icon name="phone" size={15} /> Make demo call
          </button>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Agent"
          subtitle="How this agent introduces itself"
          action={
            <span className={`badge ${agent.active ? 'green' : 'gray'}`}>
              {agent.active ? 'Active' : 'Paused'}
            </span>
          }
        />
        <dl className="detail-grid">
          <div className="detail-cell">
            <dt className="detail-label">Name</dt>
            <dd className="detail-value">{agent.name}</dd>
          </div>
          <div className="detail-cell">
            <dt className="detail-label">Company</dt>
            <dd className="detail-value">
              {agent.companyName ?? <span className="muted">Not set</span>}
            </dd>
          </div>
          <div className="detail-cell">
            <dt className="detail-label">Voice</dt>
            <dd className="detail-value">
              {agent.voiceProvider || agent.voiceId ? (
                [agent.voiceProvider, agent.voiceId].filter(Boolean).join(' · ')
              ) : (
                <span className="muted">Chosen when a voice provider is connected</span>
              )}
            </dd>
          </div>
          <div className="detail-cell">
            <dt className="detail-label">Calls made</dt>
            <dd className="detail-value">{calls.length.toLocaleString()}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <CardHeader title="Goal" subtitle="What this agent is trying to achieve on a call" />
        <div className="card-body">
          {agent.purpose?.trim() ? (
            <p className="prose-text">{agent.purpose.trim()}</p>
          ) : (
            <p className="prose-text muted">
              No goal set. The agent will still hold a conversation, but nothing steers what it is
              trying to get out of it.
            </p>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Instructions"
          subtitle="What the agent should ask about — this shapes the questions it puts on a call"
        />
        <div className="card-body">
          {agent.instructions?.trim() ? (
            <p className="prose-text">{agent.instructions.trim()}</p>
          ) : (
            <p className="prose-text muted">
              No instructions yet. Add them and the agent will work through them on the call.
            </p>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Business context"
          subtitle="The facts this agent may rely on — this is what it says out loud"
        />
        <div className="card-body">
          {agent.businessContext?.trim() ? (
            <p className="prose-text">{agent.businessContext.trim()}</p>
          ) : (
            <p className="prose-text muted">
              No context yet, so the agent has nothing concrete to offer. Add what you sell, where,
              and at what price.
            </p>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Recent calls"
          subtitle={
            calls.length === 0
              ? 'Nothing yet — a demo call is the quickest way to see one'
              : `The last ${calls.length} ${calls.length === 1 ? 'call' : 'calls'} this agent made`
          }
          action={
            calls.length > 0 ? (
              <Link href="/calls" className="card-link">
                View all
              </Link>
            ) : undefined
          }
        />
        {calls.length === 0 ? (
          <EmptyState
            icon="phone"
            title="This agent has not called anyone"
            description="Make a demo call to see how it handles a conversation, then build a campaign around it."
            actions={
              <button type="button" className="primary-button" onClick={() => setCallOpen(true)}>
                <Icon name="phone" size={15} /> Make demo call
              </button>
            }
          />
        ) : (
          <DataTable columns={CALL_COLUMNS} caption="Recent calls by this agent">
            {calls.map((call) => (
              <tr key={call.id}>
                <td>
                  <Link href={`/calls/${call.id}`} className="row-link">
                    <span className="lead-name">
                      <span>
                        <strong>{callLeadName(call)}</strong>
                        <span className="lead-sub">{call.phoneNumber}</span>
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="muted" title={formatAbsoluteTime(call.createdAt)}>
                  {formatRelativeTime(call.createdAt)}
                </td>
                <td className="muted numeric">
                  {call.durationSeconds > 0 ? formatDuration(call.durationSeconds) : '—'}
                </td>
                <td>
                  <span className="cell-stack">
                    {call.outcome ? (
                      <StatusBadge status={CALL_OUTCOME_DISPLAY[call.outcome]} />
                    ) : (
                      <span className="muted">—</span>
                    )}
                    {call.simulated ? <DemoCallTag /> : null}
                  </span>
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </Card>

      <AgentDialog
        open={editOpen}
        agent={agent}
        onClose={() => setEditOpen(false)}
        onSaved={handleSaved}
      />
      <DemoCallDialog open={callOpen} agent={agent} leads={leads} onClose={handleCallClosed} />
    </SectionPage>
  );
}
