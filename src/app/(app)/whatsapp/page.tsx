import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/require-user';
import { WhatsAppView } from './components/whatsapp-view';

export const metadata: Metadata = { title: 'WhatsApp' };

export default async function WhatsAppPage() {
  await requireUser('/whatsapp');
  return <WhatsAppView />;
}
