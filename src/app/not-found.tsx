import Link from 'next/link';
import { SectionPage } from '@/components/section-page';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

export default function NotFound() {
  return (
    <SectionPage
      eyebrow="404"
      title="Page not found"
      subtitle="That page does not exist in this workspace."
    >
      <Card>
        <EmptyState
          icon="search"
          title="We couldn't find that page"
          description="The link may be out of date, or the page may have moved. Head back to your workspace overview to continue."
          actions={
            <Link className="primary-button" href="/">
              Back to overview
            </Link>
          }
        />
      </Card>
    </SectionPage>
  );
}
