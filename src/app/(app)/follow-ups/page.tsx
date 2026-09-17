import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/require-user';
import { FollowUpsView } from './components/follow-ups-view';

export const metadata: Metadata = { title: 'Follow-ups' };

export default async function FollowUpsPage() {
  await requireUser('/follow-ups');
  return <FollowUpsView />;
}
