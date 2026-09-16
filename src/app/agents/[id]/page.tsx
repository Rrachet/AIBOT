import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/require-user';
import { AgentDetailView } from '../components/agent-detail';

export const metadata: Metadata = { title: 'Agent' };

export default async function AgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(`/agents/${id}`);
  return <AgentDetailView agentId={id} />;
}
