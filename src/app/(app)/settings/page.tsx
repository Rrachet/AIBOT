import type { Metadata } from 'next';
import { SectionPage } from '@/components/section-page';
import { Card, CardHeader } from '@/components/ui/card';
import { requireUser } from '@/lib/auth/require-user';
import { WorkspaceForm } from './components/workspace-form';
import { BusinessContactForm } from './components/business-contact-form';
import { TourRestart } from './components/tour-restart';

export const metadata: Metadata = { title: 'Settings' };

/**
 * Workspace, business contact, help and what is still missing. Team, AI,
 * Calling and Integrations are added here as each one is actually implemented
 * — an empty settings tab is worse than no tab.
 *
 * Business contact is configuration and nothing more: no provider is connected
 * by filling it in, and the section says so.
 */
export default async function SettingsPage() {
  await requireUser('/settings');

  return (
    <SectionPage eyebrow="Workspace" title="Settings" subtitle="Manage your workspace details.">
      <Card>
        <CardHeader title="Workspace" subtitle="Basic information for your AIBOT account" />
        <div className="card-body">
          <WorkspaceForm />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Business contact"
          subtitle="Who the calls come from, once a provider is connected"
        />
        <div className="card-body">
          <BusinessContactForm />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Help"
          subtitle="Zemo can walk you through the product whenever you like"
        />
        <div className="card-body">
          <p className="settings-note">
            The tour takes about a minute and points at the real screens rather than showing you
            pictures of them. You can leave it at any point with Escape.
          </p>
          <TourRestart />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Providers"
          subtitle="What AIBOT needs before calls and messages leave this workspace"
        />
        <div className="card-body">
          <ul className="notes">
            <li>
              <strong>Telephony.</strong> Calls are simulated end to end today. Connecting a
              provider is what turns a demo call into a dialled one; nothing here is billed by
              AIBOT.
            </li>
            <li>
              <strong>WhatsApp.</strong> Follow-up messages are written, queued and tracked, but
              delivery needs an official WhatsApp Business account.
            </li>
            <li>
              <strong>Agent context.</strong> What an agent says is set on the agent and on each
              campaign, not here — that is where it is read from.
            </li>
          </ul>
        </div>
      </Card>
    </SectionPage>
  );
}
