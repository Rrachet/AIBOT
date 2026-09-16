import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/require-user';
import { AnalyticsView } from './components/analytics-view';

export const metadata: Metadata = { title: 'Analytics' };

export default async function AnalyticsPage() {
  await requireUser('/analytics');
  return <AnalyticsView />;
}
