import type { Metadata } from 'next';
import Link from 'next/link';
import { login } from './actions';
import { AUTH_MESSAGES } from './messages';
import { AuthLayout } from '@/components/marketing/auth-layout';
import { safeNextPath } from '@/lib/auth/redirect';
import { missingSupabaseEnv, visibleSupabaseEnvNames } from '@/lib/supabase/env';

export const metadata: Metadata = {
  title: 'Sign in — AIBOT',
  description: 'Sign in to your AIBOT workspace.',
  robots: { index: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const error = typeof params.error === 'string' ? AUTH_MESSAGES[params.error] : undefined;

  // Which of the two cases this is, said plainly. A deployment can be missing
  // its configuration, or be serving a build made before the configuration
  // existed — the remedies differ and the generic message fits both. Names
  // only; no value is ever rendered.
  const missing = params.error === 'configuration_error' ? missingSupabaseEnv() : null;
  const configDetail =
    missing === null
      ? undefined
      : missing.length > 0
        ? `Not set on this server: ${missing.join(' and ')}. Supabase names visible here: ${
            visibleSupabaseEnvNames().join(', ') || 'none'
          }.`
        : 'This page can read the configuration, so the request was refused by an older build. Redeploy without the build cache.';

  const message = typeof params.message === 'string' ? AUTH_MESSAGES[params.message] : undefined;
  const next = safeNextPath(params.next);

  return (
    <AuthLayout
      headline="Your leads are already waiting."
      title="Welcome back"
      subtitle="Sign in to your workspace."
      footer={
        <>
          Don&rsquo;t have an account? <Link href="/signup">Create your workspace</Link>
        </>
      }
    >
      {error ? (
        <div className="auth-alert" role="alert">
          {error}
          {configDetail ? <span className="auth-alert-detail">{configDetail}</span> : null}
        </div>
      ) : null}
      {message ? <div className="auth-alert auth-alert-success">{message}</div> : null}

      <form className="auth-form" action={login}>
        <input type="hidden" name="next" value={next} />

        <label className="field">
          <span className="field-label">Email</span>
          <input
            className="field-input"
            name="email"
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            required
          />
        </label>

        <label className="field">
          <span className="field-label">Password</span>
          <input
            className="field-input"
            name="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </label>

        <button type="submit" className="primary-button auth-submit">
          Sign in
        </button>
      </form>
    </AuthLayout>
  );
}
