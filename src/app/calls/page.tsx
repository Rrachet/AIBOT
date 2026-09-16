import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/require-user';
import { CallsView } from './components/calls-view';

export const metadata: Metadata = { title: 'Calls' };

export default async function CallsPage() {
  await requireUser('/calls');
  return <CallsView />;
}
