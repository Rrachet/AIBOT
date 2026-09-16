import { requireUser } from '@/lib/auth/require-user';
import { DashboardView } from '../components/dashboard-view';

function greetingName(metadata: Record<string, unknown>): string | null {
  const candidate = metadata.full_name ?? metadata.name;
  if (typeof candidate !== 'string') return null;
  const first = candidate.trim().split(/\s+/)[0];
  return first ? first : null;
}

export default async function DashboardPage() {
  const user = await requireUser('/dashboard');
  return <DashboardView greetingName={greetingName(user.user_metadata ?? {})} />;
}
