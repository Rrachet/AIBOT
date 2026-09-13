import type { Metadata } from 'next';
import { SectionPage } from '@/components/section-page';
import { Icon } from '@/components/icons';
import { LeadsTable } from './components/leads-table';
import { DEMO_LEADS, TOTAL_LEADS } from '@/lib/demo-data';

export const metadata: Metadata = { title: 'Leads' };

export default function LeadsPage() {
  return (
    <SectionPage
      eyebrow="Pipeline"
      title="Leads"
      subtitle="Manage the people AIBOT should call."
      actions={
        <>
          <button type="button" className="secondary-button">
            <Icon name="upload" size={15} /> Import CSV or Excel
          </button>
          <button type="button" className="primary-button">
            <Icon name="plus" size={15} /> Add lead
          </button>
        </>
      }
    >
      <LeadsTable leads={DEMO_LEADS} totalCount={TOTAL_LEADS} />
    </SectionPage>
  );
}
