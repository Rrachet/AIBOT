import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/require-user';
import { CampaignDetailView } from '../components/campaign-detail';

export const metadata: Metadata = { title: 'Campaign' };

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(`/campaigns/${id}`);
  return <CampaignDetailView campaignId={id} />;
}
