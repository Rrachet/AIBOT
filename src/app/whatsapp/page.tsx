import type { Metadata } from 'next';
import { SectionPage } from '@/components/section-page';
import { Icon } from '@/components/icons';
import { Card, CardHeader } from '@/components/ui/card';
import { requireUser } from '@/lib/auth/require-user';

export const metadata: Metadata = { title: 'WhatsApp' };

export default async function WhatsAppPage() {
  await requireUser('/whatsapp');

  return (
    <SectionPage
      eyebrow="Follow-up channel"
      title="WhatsApp"
      subtitle="Turn missed calls into conversations without losing context."
    >
      <Card>
        <div className="integration">
          <span className="integration-icon" aria-hidden="true">
            <Icon name="message" size={22} />
          </span>
          <div className="integration-copy">
            <div className="integration-title">
              <h2>WhatsApp Business</h2>
              <span className="badge gray">Not connected</span>
            </div>
            <p>
              Connect WhatsApp later to automatically follow up with leads who don&apos;t answer a
              call. Nothing is sent until an official WhatsApp Business account is connected to this
              workspace.
            </p>
            <div className="empty-actions" style={{ justifyContent: 'flex-start' }}>
              <button type="button" className="primary-button" disabled>
                Connect WhatsApp
              </button>
              <span className="field-hint" style={{ marginTop: 0, alignSelf: 'center' }}>
                Available in a later phase
              </span>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="How follow-up will work"
          subtitle="The sequence AIBOT runs once WhatsApp is connected"
        />
        <ol className="steps card-body">
          <li>
            <span className="steps-index">1</span>
            <span>A call finishes with no answer.</span>
          </li>
          <li>
            <span className="steps-index">2</span>
            <span>AIBOT waits for a configurable delay before following up.</span>
          </li>
          <li>
            <span className="steps-index">3</span>
            <span>
              An approved WhatsApp message template is sent to the lead, with their name and the
              reason for the call.
            </span>
          </li>
          <li>
            <span className="steps-index">4</span>
            <span>Replies land back on the lead, and the lead status moves to follow-up.</span>
          </li>
        </ol>
      </Card>

      <Card>
        <CardHeader title="Before you connect" subtitle="What WhatsApp requires from your business" />
        <div className="card-body">
          <ul className="notes">
            <li>
              An official WhatsApp Business account, verified against your business.
            </li>
            <li>
              Pre-approved message templates. WhatsApp does not allow free-form messages to someone
              who has not messaged you in the last 24 hours, so the first follow-up must use a
              template.
            </li>
            <li>A dedicated phone number that is not already registered to WhatsApp.</li>
          </ul>
        </div>
      </Card>
    </SectionPage>
  );
}
