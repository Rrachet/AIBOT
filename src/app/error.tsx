'use client';

import { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

/**
 * Route-level error boundary. Renders standalone chrome rather than the app
 * shell, because a shell-level failure would otherwise re-throw here.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="content" id="main-content">
      <div className="page-head">
        <div>
          <div className="eyebrow">Something went wrong</div>
          <h1 className="page-title">Unexpected error</h1>
          <p className="subtitle">This view failed to load. Trying again usually resolves it.</p>
        </div>
      </div>
      <Card>
        <EmptyState
          icon="alert"
          title="This page could not be displayed"
          description="If the problem continues, refresh the page or return to your workspace overview."
          actions={
            <>
              <button type="button" className="primary-button" onClick={reset}>
                Try again
              </button>
              <a className="secondary-button" href="/">
                Back to overview
              </a>
            </>
          }
        />
      </Card>
    </main>
  );
}
