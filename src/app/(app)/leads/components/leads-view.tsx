'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SectionPage } from '@/components/section-page';
import { Icon } from '@/components/icons';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import type { Lead } from '@/domain/types';
import { LEADS_PAGE_SIZE, LeadApiError, fetchLeads } from '@/lib/leads';
import { LeadsTable } from './leads-table';
import { AddLeadDialog } from './add-lead-dialog';
import { ImportLeadsDialog } from './import-dialog';
import { LeadsTableSkeleton } from './leads-table-skeleton';

type LoadState =
  | { phase: 'loading' }
  | { phase: 'ready'; leads: Lead[] }
  | { phase: 'error'; title: string; message: string; canRetry: boolean; needsSignIn: boolean };

export function LeadsView() {
  const [state, setState] = useState<LoadState>({ phase: 'loading' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  // Lets an in-flight reload be discarded if another starts or we unmount.
  const requestRef = useRef(0);

  const load = useCallback(async (signal?: AbortSignal) => {
    const requestId = ++requestRef.current;
    setState({ phase: 'loading' });

    try {
      const leads = await fetchLeads(signal);
      if (requestRef.current !== requestId) return;
      setState({ phase: 'ready', leads });
    } catch (error) {
      if (signal?.aborted || requestRef.current !== requestId) return;
      // Each failure needs a different remedy, so they are not collapsed into
      // one generic message: signing in again fixes an expired session but not
      // a workspace or configuration problem.
      const apiError = error instanceof LeadApiError ? error : null;

      if (apiError?.isAuthError) {
        setState({
          phase: 'error',
          title: 'Your session has expired',
          message: 'Sign in again to continue working in this workspace.',
          canRetry: false,
          needsSignIn: true,
        });
      } else if (apiError?.isWorkspaceError) {
        setState({
          phase: 'error',
          title: 'No workspace available',
          message: apiError.message,
          canRetry: false,
          needsSignIn: false,
        });
      } else {
        setState({
          phase: 'error',
          title: apiError?.isConfigError
            ? 'This server is not configured'
            : 'We could not load your leads',
          message:
            apiError?.message ??
            'We could not reach the server. Check your connection and try again.',
          canRetry: !apiError?.isConfigError,
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

  // The list is ordered newest first, so a created lead belongs at the top.
  const handleCreated = useCallback((lead: Lead) => {
    setDialogOpen(false);
    setState((current) =>
      current.phase === 'ready'
        ? { phase: 'ready', leads: [lead, ...current.leads] }
        : { phase: 'ready', leads: [lead] }
    );
  }, []);

  const openDialog = useCallback(() => setDialogOpen(true), []);
  const closeDialog = useCallback(() => setDialogOpen(false), []);
  const openImport = useCallback(() => setImportOpen(true), []);
  const closeImport = useCallback(() => setImportOpen(false), []);

  // An import can add many rows at once, so the list is reloaded from the
  // server rather than patched in place.
  const handleImported = useCallback(() => {
    void load();
  }, [load]);

  let subtitle = 'Loading leads…';
  if (state.phase === 'ready') {
    const count = state.leads.length;
    subtitle =
      count >= LEADS_PAGE_SIZE
        ? `Showing the first ${LEADS_PAGE_SIZE} leads`
        : `${count.toLocaleString()} ${count === 1 ? 'lead' : 'leads'} in this workspace`;
  }

  return (
    <SectionPage
      eyebrow="Pipeline"
      title="Leads"
      subtitle="Manage the people AIBOT should call."
      actions={
        <>
          <button type="button" className="secondary-button" onClick={openImport}>
            <Icon name="upload" size={15} /> Import CSV or Excel
          </button>
          <button type="button" className="primary-button" onClick={openDialog}>
            <Icon name="plus" size={15} /> Add lead
          </button>
        </>
      }
    >
      {state.phase === 'loading' ? <LeadsTableSkeleton /> : null}

      {state.phase === 'error' ? (
        <Card>
          <EmptyState
            icon="alert"
            title={state.title}
            description={state.message}
            actions={
              state.needsSignIn ? (
                <a className="primary-button" href="/login?next=/leads">
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

      {state.phase === 'ready' ? (
        <LeadsTable leads={state.leads} subtitle={subtitle} onAddLead={openDialog} />
      ) : null}

      <AddLeadDialog open={dialogOpen} onClose={closeDialog} onCreated={handleCreated} />
      <ImportLeadsDialog open={importOpen} onClose={closeImport} onImported={handleImported} />
    </SectionPage>
  );
}
