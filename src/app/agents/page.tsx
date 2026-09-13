import type { Metadata } from 'next';
import { SectionPage } from '@/components/section-page';
import { Icon } from '@/components/icons';
import { Card, CardHeader } from '@/components/ui/card';
import { DEMO_AGENTS } from '@/lib/demo-data';
import { requireUser } from '@/lib/auth/require-user';

export const metadata: Metadata = { title: 'AI Agents' };

export default async function AgentsPage() {
  await requireUser('/agents');

  return (
    <SectionPage
      eyebrow="AI workforce"
      title="AI Agents"
      subtitle="Create the voice agents that represent your business on a call."
      actions={
        <button type="button" className="primary-button">
          <Icon name="plus" size={15} /> Create agent
        </button>
      }
    >
      <section className="grid-3" aria-label="Agents">
        {DEMO_AGENTS.map((agent) => (
          <Card key={agent.id} className="agent-card">
            <div className="agent-head">
              <span className="agent-avatar" aria-hidden="true">
                {agent.name[0]}
              </span>
              <span className={`badge ${agent.active ? 'green' : 'gray'}`}>
                {agent.active ? 'Active' : 'Paused'}
              </span>
            </div>
            <h2 className="agent-name">{agent.name}</h2>
            <p className="agent-role">
              {agent.role} · {agent.company}
            </p>
            <dl className="agent-meta">
              <div>
                <dt>Voice</dt>
                <dd>{agent.voice}</dd>
              </div>
              <div>
                <dt>Language</dt>
                <dd>{agent.language}</dd>
              </div>
              <div>
                <dt>Calls handled</dt>
                <dd className="numeric">{agent.callsHandled.toLocaleString()}</dd>
              </div>
            </dl>
            <div className="agent-actions">
              <button type="button" className="secondary-button">
                Edit agent
              </button>
            </div>
          </Card>
        ))}

        {/* Creation affordance sits alongside existing agents. */}
        <button type="button" className="card agent-card agent-card-new">
          <span className="quick-icon" aria-hidden="true">
            <Icon name="plus" size={18} />
          </span>
          <strong>Create an agent</strong>
          <span>Set a goal, tone, voice and business context in a few steps.</span>
        </button>
      </section>

      <Card>
        <CardHeader
          title="What an agent needs"
          subtitle="The configuration AIBOT uses to run a conversation"
        />
        <ol className="steps card-body">
          <li>
            <span className="steps-index">1</span>
            <span>
              <strong>Identity</strong> — the agent&apos;s name and the company it represents.
            </span>
          </li>
          <li>
            <span className="steps-index">2</span>
            <span>
              <strong>Purpose</strong> — what a successful call achieves, in one sentence.
            </span>
          </li>
          <li>
            <span className="steps-index">3</span>
            <span>
              <strong>Instructions</strong> — tone, the questions to ask, and when to hand off to a
              human.
            </span>
          </li>
          <li>
            <span className="steps-index">4</span>
            <span>
              <strong>Business context</strong> — the product facts the agent may rely on.
            </span>
          </li>
          <li>
            <span className="steps-index">5</span>
            <span>
              <strong>Voice</strong> — selected once a voice provider is connected.
            </span>
          </li>
        </ol>
      </Card>
    </SectionPage>
  );
}
