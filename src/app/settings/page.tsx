import type { Metadata } from 'next';
import { SectionPage } from '@/components/section-page';
import { Card, CardHeader } from '@/components/ui/card';
import { WORKSPACE } from '@/lib/demo-data';

export const metadata: Metadata = { title: 'Settings' };

/**
 * Only the Workspace section is exposed. Team, AI, Calling, WhatsApp and
 * Integrations are added here as each one is actually implemented — an empty
 * settings tab is worse than no tab.
 */
export default function SettingsPage() {
  return (
    <SectionPage
      eyebrow="Workspace"
      title="Settings"
      subtitle="Manage your workspace details."
    >
      <Card>
        <CardHeader title="Workspace" subtitle="Basic information for your AIBOT account" />
        <div className="card-body">
          <div className="form-grid">
            <label className="field">
              <span className="field-label">Workspace name</span>
              <input
                className="field-input"
                name="workspaceName"
                defaultValue={WORKSPACE.name}
                autoComplete="organization"
              />
            </label>

            <label className="field">
              <span className="field-label">Business description</span>
              <textarea
                className="field-textarea"
                name="businessDescription"
                defaultValue="AI-powered lead engagement"
              />
              <span className="field-hint">
                Your AI agents use this as background context on a call.
              </span>
            </label>

            <div className="form-actions">
              <button type="button" className="primary-button" disabled>
                Save changes
              </button>
              <span className="field-hint" style={{ marginTop: 0 }}>
                Saving is enabled once this workspace is connected to a database.
              </span>
            </div>
          </div>
        </div>
      </Card>
    </SectionPage>
  );
}
