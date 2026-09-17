import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/require-user';
import { CampaignsView } from './components/campaigns-view';

export const metadata: Metadata = { title: 'Campaigns' };

export default async function CampaignsPage() {
  await requireUser('/campaigns');
  return <CampaignsView />;
}
