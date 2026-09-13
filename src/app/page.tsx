import Link from 'next/link';
import { requireUser } from '@/lib/auth/require-user';
import { SectionPage } from '@/components/section-page';
import { Icon } from '@/components/icons';
import { Card, CardHeader } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/badge';
import { DataTable, EntityCell } from '@/components/ui/data-table';
import { LEAD_STATUS_DISPLAY, initials } from '@/lib/status';
import {
  DEMO_ACTIVITY,
  DEMO_ATTENTION,
  DEMO_DASHBOARD_METRICS,
  DEMO_LEADS,
  SETUP_STEPS,
  WORKSPACE,
} from '@/lib/demo-data';

const LEAD_COLUMNS = [
  { key: 'lead', header: 'Lead' },
  { key: 'status', header: 'Status' },
  { key: 'updated', header: 'Updated' },
] as const;

export default async function HomePage() {
  await requireUser('/');

  const completedSteps = SETUP_STEPS.filter((step) => step.done).length;
  const setupComplete = completedSteps === SETUP_STEPS.length;
  const nextStep = SETUP_STEPS.find((step) => !step.done);
  const progressPercent = Math.round((completedSteps / SETUP_STEPS.length) * 100);

  return (
    <SectionPage
      eyebrow="Command center"
      title={`Welcome back, ${WORKSPACE.userName}.`}
      subtitle="Here's what's happening with your leads today."
      actions={
        <Link className="primary-button" href="/leads">
          <Icon name="plus" size={15} /> Add leads
        </Link>
      }
    >
      {/* "What should I do next?" — guided setup, hidden once complete. */}
      {!setupComplete ? (
        <Card>
          <CardHeader
            title="Finish setting up your workspace"
            subtitle={nextStep ? `Next: ${nextStep.title.toLowerCase()}` : undefined}
            action={
              <div className="checklist-progress">
                <span className="progress-track">
                  <span
                    className="progress-fill"
                    style={{ width: `${progressPercent}%` }}
                    role="progressbar"
                    aria-valuenow={completedSteps}
                    aria-valuemin={0}
                    aria-valuemax={SETUP_STEPS.length}
                    aria-label="Workspace setup progress"
                  />
                </span>
                {completedSteps} of {SETUP_STEPS.length}
              </div>
            }
          />
          <div className="checklist">
            {SETUP_STEPS.map((step, index) => (
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
        {DEMO_DASHBOARD_METRICS.map((metric) => (
          <StatCard key={metric.label} {...metric} />
        ))}
      </section>

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
          <DataTable columns={LEAD_COLUMNS} caption="Most recently updated leads">
            {DEMO_LEADS.slice(0, 5).map((lead) => (
              <tr key={lead.id}>
                <td>
                  <EntityCell initials={initials(lead.name)} name={lead.name} meta={lead.company} />
                </td>
                <td>
                  <StatusBadge status={LEAD_STATUS_DISPLAY[lead.status]} />
                </td>
                <td className="muted">{lead.updatedLabel}</td>
              </tr>
            ))}
          </DataTable>
        </Card>

        <div className="section-stack">
          {/* "What needs my attention?" */}
          <Card>
            <CardHeader title="Needs attention" subtitle="Leads waiting on a decision or a channel" />
            <div>
              {DEMO_ATTENTION.map((item) => (
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
          </Card>

          <Card>
            <CardHeader
              title="Live activity"
              subtitle="Latest events from your workspace"
              action={<span className="badge green">Live</span>}
            />
            <div className="activity">
              {DEMO_ACTIVITY.map((item) => (
                <div key={item.id} className="activity-item">
                  <div className="activity-dot">
                    <Icon name={item.icon} size={14} />
                  </div>
                  <div className="activity-copy">
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                  </div>
                  <div className="activity-time">{item.timeLabel}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </SectionPage>
  );
}
