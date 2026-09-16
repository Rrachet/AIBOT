import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/require-user';
import { DashboardView } from '../components/dashboard-view';

/**
 * The name comes from `user_metadata.full_name`, which signup collects. When
 * an account has none there is nothing to greet by — deriving one from the
 * email address would be inventing a name the person never gave us.
 */
function greetingName(metadata: Record<string, unknown>): string | null {
  const candidate = metadata.full_name ?? metadata.name;
  if (typeof candidate !== 'string') return null;
  const first = candidate.trim().split(/\s+/)[0];
  return first ? first : null;
}

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const user = await requireUser('/dashboard');
  return <DashboardView greetingName={greetingName(user.user_metadata ?? {})} />;
}
