import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/require-user';
import { AgentsView } from './components/agents-view';

export const metadata: Metadata = { title: 'AI Agents' };

export default async function AgentsPage() {
  await requireUser('/agents');
  return <AgentsView />;
}
