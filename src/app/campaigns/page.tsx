import type { Metadata } from 'next';
import Link from 'next/link';
import { SectionPage } from '@/components/section-page';
import { Icon } from '@/components/icons';
import { Card, CardHeader } from '@/components/ui/card';
import { DEMO_CAMPAIGNS } from '@/lib/demo-data';
import { requireUser } from '@/lib/auth/require-user';

export const metadata: Metadata = { title: 'Campaigns' };

/** Breakdown cells in the order a campaign progresses. */
const BREAKDOWN_FIELDS = [
  { key: 'total', label: 'Total' },
  { key: 'queued', label: 'Queued' },
  { key: 'calling', label: 'Calling' },
  { key: 'completed', label: 'Completed' },
  { key: 'noAnswer', label: 'No answer' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'followUp', label: 'Follow-up' },
] as const;

export default async function CampaignsPage() {
  await requireUser('/campaigns');

  return (
    <SectionPage
      eyebrow="Outbound engine"
      title="Campaigns"
      subtitle="Choose a lead list and put your AI agent to work."
      actions={
        <button type="button" className="primary-button">
          <Icon name="plus" size={15} /> New campaign
        </button>
      }
    >
      {DEMO_CAMPAIGNS.map((campaign) => (
        <Card key={campaign.id}>
          <CardHeader
            title={campaign.name}
            subtitle={`${campaign.agentName} · ${campaign.startedLabel}`}
            action={
              <div className="page-head-actions">
                <span className={`badge ${campaign.running ? 'purple' : 'gray'}`}>
                  {campaign.running ? 'Running' : 'Paused'}
                </span>
                <Link className="card-link" href="/calls">
                  View calls
                </Link>
              </div>
            }
          />
          <dl className="breakdown">
            {BREAKDOWN_FIELDS.map((field) => (
              <div key={field.key} className="breakdown-cell">
                <dt className="breakdown-label">{field.label}</dt>
                <dd className="breakdown-value">
                  {campaign.breakdown[field.key].toLocaleString()}
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      ))}

      <Card>
        <CardHeader
          title="How a campaign runs"
          subtitle="The steps AIBOT walks through when you start calling"
        />
        <ol className="steps card-body">
          <li>
            <span className="steps-index">1</span>
            <span>
              <strong>Select leads</strong> — filter your list, then choose who to call.
            </span>
          </li>
          <li>
            <span className="steps-index">2</span>
            <span>
              <strong>Select an agent</strong> — the voice agent that runs each conversation.
            </span>
          </li>
          <li>
            <span className="steps-index">3</span>
            <span>
              <strong>Review</strong> — confirm the list size and check for missing phone numbers.
            </span>
          </li>
          <li>
            <span className="steps-index">4</span>
            <span>
              <strong>Call settings</strong> — calling window, concurrency and retry behaviour.
            </span>
          </li>
          <li>
            <span className="steps-index">5</span>
            <span>
              <strong>Start</strong> — leads move to queued, and outcomes land in Calls.
            </span>
          </li>
        </ol>
      </Card>
    </SectionPage>
  );
}
