import type { Metadata } from 'next';
import { LeadsView } from './components/leads-view';
import { requireUser } from '@/lib/auth/require-user';

export const metadata: Metadata = { title: 'Leads' };

export default async function LeadsPage() {
  await requireUser('/leads');

  return <LeadsView />;
}
