'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { SectionPage } from '@/components/section-page';
import { Icon } from '@/components/icons';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import type { Agent } from '@/domain/types';
import { ApiError } from '@/lib/api/client';
import { agentInitial, agentSecondaryLine, deleteAgent, fetchAgents, updateAgent } from '@/lib/agents';
import { AgentDialog } from './agent-dialog';

type LoadState =
  | { phase: 'loading' }
  | { phase: 'ready'; agents: Agent[] }
  | { phase: 'error'; title: string; message: string; canRetry: boolean; needsSignIn: boolean };

export function AgentsView() {
  const [state, setState] = useState<LoadState>({ phase: 'loading' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const load = useCallback(async (signal?: AbortSignal) => {
    const requestId = ++requestRef.current;
    setState({ phase: 'loading' });

    try {
      const agents = await fetchAgents(signal);
      if (requestRef.current !== requestId) return;
      setState({ phase: 'ready', agents });
    } catch (error) {
      if (signal?.aborted || requestRef.current !== requestId) return;
      const apiError = error instanceof ApiError ? error : null;

      if (apiError?.isAuthError) {
        setState({
          phase: 'error',
          title: 'Your session has expired',
          message: 'Sign in again to continue working in this workspace.',
          canRetry: false,
          needsSignIn: true,
        });
      } else {
        setState({
          phase: 'error',
          title: apiError?.isWorkspaceError
            ? 'No workspace available'
            : 'We could not load your agents',
          message:
            apiError?.message ??
            'We could not reach the server. Check your connection and try again.',
          canRetry: !apiError?.isConfigError && !apiError?.isWorkspaceError,
          needsSignIn: false,
        });
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const openCreate = useCallback(() => {
    setEditing(null);
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((agent: Agent) => {
    setEditing(agent);
    setDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => setDialogOpen(false), []);

  // Replace in place when editing so the card keeps its position; a new agent
  // goes to the top, matching the newest-first order the API returns.
  const handleSaved = useCallback((saved: Agent) => {
    setDialogOpen(false);
    setState((current) => {
      if (current.phase !== 'ready') return { phase: 'ready', agents: [saved] };
      const exists = current.agents.some((agent) => agent.id === saved.id);
      return {
        phase: 'ready',
        agents: exists
          ? current.agents.map((agent) => (agent.id === saved.id ? saved : agent))
          : [saved, ...current.agents],
      };
    });
  }, []);

  const toggleActive = useCallback(async (agent: Agent) => {
    setBusyId(agent.id);
    setActionError(null);
    try {
      const saved = await updateAgent(agent.id, { active: !agent.active });
      setState((current) =>
        current.phase === 'ready'
          ? {
              phase: 'ready',
              agents: current.agents.map((item) => (item.id === saved.id ? saved : item)),
            }
          : current
      );
    } catch (error) {
      const apiError = error instanceof ApiError ? error : null;
      setActionError(apiError?.message ?? 'We could not update this agent.');
    } finally {
      setBusyId(null);
    }
  }, []);

  const remove = useCallback(async (agent: Agent) => {
    setBusyId(agent.id);
    setActionError(null);
    try {
      await deleteAgent(agent.id);
      setState((current) =>
        current.phase === 'ready'
          ? { phase: 'ready', agents: current.agents.filter((item) => item.id !== agent.id) }
          : current
      );
    } catch (error) {
      const apiError = error instanceof ApiError ? error : null;
      // A campaign holding this agent is the expected refusal, and the message
      // from the API already says what to do about it.
      setActionError(apiError?.message ?? 'We could not delete this agent.');
    } finally {
      setBusyId(null);
    }
  }, []);

  const agents = state.phase === 'ready' ? state.agents : [];
  const subtitle =
    state.phase === 'ready'
      ? `${agents.length} ${agents.length === 1 ? 'agent' : 'agents'} in this workspace`
      : 'Create the voice agents that represent your business on a call.';

  return (
    <SectionPage
      eyebrow="AI workforce"
      title="AI Agents"
      subtitle={subtitle}
      actions={
        <button type="button" className="primary-button" onClick={openCreate}>
          <Icon name="plus" size={15} /> Create agent
        </button>
      }
    >
      {actionError ? (
        <p className="form-alert" role="alert">
          {actionError}
        </p>
      ) : null}

      {state.phase === 'loading' ? (
        <section className="grid-3" aria-label="Loading agents">
          {[0, 1, 2].map((index) => (
            <Card key={index} className="agent-card" aria-hidden="true">
              <div className="agent-head">
                <span className="agent-avatar skeleton-block" />
              </div>
              <span className="skeleton" style={{ width: 140, marginTop: 14 }} />
              <span className="skeleton" style={{ width: 96, marginTop: 8 }} />
              <span className="skeleton" style={{ width: '100%', marginTop: 16 }} />
            </Card>
          ))}
        </section>
      ) : null}

      {state.phase === 'error' ? (
        <Card>
          <EmptyState
            icon="alert"
            title={state.title}
            description={state.message}
            actions={
              state.needsSignIn ? (
                <a className="primary-button" href="/login?next=/agents">
                  Sign in again
                </a>
              ) : state.canRetry ? (
                <button type="button" className="secondary-button" onClick={() => void load()}>
                  Try again
                </button>
              ) : null
            }
          />
        </Card>
      ) : null}

      {state.phase === 'ready' && agents.length === 0 ? (
        <Card>
          <EmptyState
            icon="bot"
            title="No agents yet"
            description="An agent is the script AIBOT follows on a call: who it is, what it wants, and the facts it can rely on."
            actions={
              <button type="button" className="primary-button" onClick={openCreate}>
                <Icon name="plus" size={15} /> Create your first agent
              </button>
            }
          />
        </Card>
      ) : null}

      {state.phase === 'ready' && agents.length > 0 ? (
        <section className="grid-3" aria-label="Agents">
          {agents.map((agent) => {
            const secondary = agentSecondaryLine(agent);
            const busy = busyId === agent.id;

            return (
              <Card key={agent.id} className="agent-card" tourTarget="agent-card">
                <div className="agent-head">
                  <span className="agent-avatar" aria-hidden="true">
                    {agentInitial(agent)}
                  </span>
                  <span className={`badge ${agent.active ? 'green' : 'gray'}`}>
                    {agent.active ? 'Active' : 'Paused'}
                  </span>
                </div>
                <h2 className="agent-name">
                  <Link href={`/agents/${agent.id}`}>{agent.name}</Link>
                </h2>
                {secondary ? <p className="agent-role">{secondary}</p> : null}

                {/* The job, then the manner. An agent is a colleague you brief,
                    so the card reads as the brief rather than as a record. */}
                {agent.purpose?.trim() ? (
                  <p className="agent-purpose">
                    <span>Job</span>
                    {agent.purpose.trim()}
                  </p>
                ) : null}

                {agent.instructions?.trim() ? (
                  <blockquote className="agent-excerpt">{agent.instructions.trim()}</blockquote>
                ) : (
                  <p className="agent-excerpt agent-excerpt-empty">
                    No instructions yet — the agent will not know what to say.
                  </p>
                )}

                <div className="agent-actions">
                  <Link className="primary-button" href={`/agents/${agent.id}`}>
                    <Icon name="phone" size={15} /> Demo call
                  </Link>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => openEdit(agent)}
                    disabled={busy}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => void toggleActive(agent)}
                    disabled={busy}
                  >
                    {agent.active ? 'Pause' : 'Activate'}
                  </button>
                  <button
                    type="button"
                    className="ghost-button danger"
                    onClick={() => void remove(agent)}
                    disabled={busy}
                  >
                    Delete
                  </button>
                </div>
              </Card>
            );
          })}

          <button type="button" className="card agent-card agent-card-new" onClick={openCreate}>
            <span className="quick-icon" aria-hidden="true">
              <Icon name="plus" size={18} />
            </span>
            <strong>Create an agent</strong>
            <span>Set a goal, tone and business context in a few steps.</span>
          </button>
        </section>
      ) : null}

      <AgentDialog open={dialogOpen} agent={editing} onClose={closeDialog} onSaved={handleSaved} />
    </SectionPage>
  );
}
