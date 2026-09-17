import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/require-user';
import { CallDetailView } from '../components/call-detail';

export const metadata: Metadata = { title: 'Call' };

export default async function CallPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(`/calls/${id}`);
  return <CallDetailView callId={id} />;
}
