import type { Metadata } from 'next';
import Link from 'next/link';
import { signup } from '../login/actions';
import { AUTH_MESSAGES } from '../login/messages';
import { AuthLayout } from '@/components/marketing/auth-layout';

export const metadata: Metadata = {
  title: 'Create your workspace — AIBOT',
  description: 'Create an AIBOT workspace and build your first AI calling campaign.',
  robots: { index: false },
};

/**
 * Signup.
 *
 * Posts to the same server action the old combined screen used, so the
 * Supabase confirmation-email flow and the workspace bootstrap trigger are
 * untouched — this is a new surface on existing plumbing, not a new mechanism.
 */
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const error = typeof params.error === 'string' ? AUTH_MESSAGES[params.error] : undefined;
  const message = typeof params.message === 'string' ? AUTH_MESSAGES[params.message] : undefined;

  return (
    <AuthLayout
      headline="Start working your leads."
      title="Create your workspace"
      subtitle="Set up your workspace and build your first AI sales workflow."
      footer={
        <>
          Already have an account? <Link href="/login">Sign in</Link>
        </>
      }
    >
      {error ? (
        <div className="auth-alert" role="alert">
          {error}
        </div>
      ) : null}
      {message ? <div className="auth-alert auth-alert-success">{message}</div> : null}

      <form className="auth-form" action={signup}>
        <label className="field">
          <span className="field-label">Your name</span>
          <input
            className="field-input"
            name="fullName"
            type="text"
            placeholder="Priya Sharma"
            autoComplete="name"
            maxLength={120}
            required
          />
        </label>

        <label className="field">
          <span className="field-label">Workspace</span>
          <input
            className="field-input"
            name="workspaceName"
            type="text"
            placeholder="Skyline Homes"
            autoComplete="organization"
            maxLength={120}
            required
          />
          <span className="field-hint">Usually your company name. You can change it later.</span>
        </label>

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
            placeholder="At least 8 characters"
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            required
          />
        </label>

        <label className="field">
          <span className="field-label">Confirm password</span>
          <input
            className="field-input"
            name="confirm"
            type="password"
            placeholder="Repeat your password"
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            required
          />
        </label>

        <button type="submit" className="primary-button auth-submit">
          Create workspace
        </button>

        <p className="auth-footnote">
          We email a confirmation link. Click it to activate your workspace and sign in.
        </p>
      </form>
    </AuthLayout>
  );
}
