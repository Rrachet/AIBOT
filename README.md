# AIBOT

AI-powered lead calling and WhatsApp follow-up platform.

## Product direction

AIBOT starts with a deliberately manual MVP:

`Manual / CSV / Excel lead -> lead queue -> AI phone call -> call outcome -> WhatsApp follow-up`

Future lead sources (Meta Lead Ads, website forms, CRMs) will enter the same normalized lead pipeline.

## Architecture principles

- Multi-tenant by workspace from day one.
- Provider-agnostic voice, messaging, and AI integrations.
- Domain logic is separated from provider adapters and UI.
- Calls and follow-ups are represented as durable records/events, not UI state.
- No fake successful calls or messages when an external provider is unavailable.
- V1 exposes only the functionality needed for manual lead operations.

## Authentication

AIBOT uses Supabase Auth through `@supabase/ssr`. The session lives in cookies
and is refreshed by `src/proxy.ts`; no token is ever written to `localStorage`.

One way in, one kind of account:

- **Sign up** — name, workspace name, email, password, confirm password, then a
  confirmation link emailed to that address.
- **Sign in** — email and password only. A confirmed account never sees the
  confirmation step again.

There is no social sign-in and no code to type. Supabase owns confirmation end
to end: AIBOT never generates, stores or compares a token.

### Registration flow

1. `/login` posts the signup form to `signup` in `src/app/login/actions.ts`,
   which calls `supabase.auth.signUp()` with `full_name` and `workspace_name`
   in `options.data`, and `options.emailRedirectTo` pointing at
   `/auth/callback`.
2. With email confirmation on, `signUp()` returns **no session**. The action
   redirects to `/login?message=check_email`.
3. The emailed link goes to Supabase, which verifies the address and then sends
   the browser to `/auth/callback?code=...`.
4. `src/app/auth/callback/route.ts` calls
   `supabase.auth.exchangeCodeForSession(code)`. That exchange is what
   establishes the session, so an unconfirmed address can never reach the app.
5. The user lands on `/` (or a validated `next` path — see `safeNextPath` in
   `src/lib/auth/redirect.ts`).

Without `emailRedirectTo` the link would land on the dashboard with an
unexchanged code in the URL and bounce straight back to `/login`. The origin
comes from `NEXT_PUBLIC_SITE_URL` when set, and otherwise from the request, so
localhost and preview deployments work with no configuration.

**The link must be opened in the browser that started the signup.** The
exchange uses the PKCE verifier stored as a cookie by `signUp()`; a link opened
on another device fails at the exchange rather than signing anyone in, and the
message on `/login` says so.

Two edges worth knowing, because both are silent in the raw API:

- **Already registered.** With confirmations on, Supabase does not reveal that an
  address exists — it returns a user with an empty `identities` array instead of
  an error. The signup action treats that shape as "email already registered".
- **Unconfirmed sign-in.** A password sign-in for an unconfirmed account fails
  with an "Email not confirmed" error, so the login action says exactly that
  instead of claiming the credentials are wrong.

`src/app/auth/confirm/route.ts` is the other shape of email link: a
`token_hash` that it verifies directly. It predates this flow and stays for
email templates built that way, and for any future recovery or email-change
link. The signup path does not use it.

### What to configure in Supabase

Nothing about email delivery belongs in this repository. No SMTP credential and
no provider name is read by application code.

**1. Authentication → Providers → Email**

- Enable *Email*.
- Enable *Confirm email*. With it off, `signUp()` returns a session immediately
  and the user goes straight to the dashboard with no link to click.

**2. Authentication → Email Templates → Confirm signup**

The default template — `{{ .ConfirmationURL }}` — is what this flow expects. It
sends the user to Supabase, which verifies the address and then redirects to the
`emailRedirectTo` above with a one-time code.

**3. Authentication → URL Configuration**

| Field | Value |
| --- | --- |
| Site URL | your production origin, e.g. `https://aibot.example.com` |
| Redirect URLs | `http://localhost:3000/auth/callback`, `https://<your-domain>/auth/callback`, and for Vercel previews `https://*-<your-team>.vercel.app/auth/callback` |

A redirect target that is not listed here is refused by Supabase and the user
comes back to `/login` with an error. Add every origin the app is served from.

**4. Project Settings → Authentication → SMTP**

The built-in sender is rate-limited and meant for development. Point Supabase at
a real SMTP provider before anyone outside the team signs up.

### Workspaces

Workspace creation belongs to the `on_auth_user_created_workspace` trigger,
which fires once per new `auth.users` row and reads `workspace_name` from the
signup metadata. Application code never creates a workspace, so a signup gets
exactly one however many times the link is opened.

## UI layer (Phase 1)

The interface is built and reviewable before any backend exists. No page calls a
network, and nothing is faked as connected.

### Structure

```text
src/
  app/                  routes (server components) + globals.css
    leads/components/   route-local client components
  components/
    app-shell.tsx       sidebar, topbar, mobile drawer  (client)
    section-page.tsx    standard page layout            (server)
    icons.tsx           typed icon set -> IconName
    ui/                 Card, StatCard, Badge, DataTable, EmptyState
  config/navigation.ts  single source of truth for nav + breadcrumb
  lib/status.ts         domain status -> label + badge tone
  lib/demo-data.ts      PLACEHOLDER SAMPLE DATA - delete in Phase 3
  domain/types.ts       shared domain types
  server/providers/     provider boundaries (voice today)
```

### Conventions

- **Navigation is derived, never declared.** `AppShell` resolves the active item
  from `usePathname()` against `config/navigation.ts`. Pages do not say which nav
  entry they belong to, so the two cannot drift apart.
- **Status colour comes from the domain.** Views read `LEAD_STATUS_DISPLAY`,
  `CALL_STATUS_DISPLAY` and `CALL_OUTCOME_DISPLAY` in `lib/status.ts`, keyed by the
  unions in `domain/types.ts`. Adding a status to a union fails the type-check
  until it is given a label and tone. Never hard-code a status string in a view.
- **Pages stay server components.** Interactivity is pushed into small client
  components (`app-shell.tsx`, `leads/components/leads-table.tsx`).
- **Styling is plain CSS** in `app/globals.css`, organised into numbered sections
  with design tokens on `:root`. There is no CSS framework, and none is needed.
  Every text token meets WCAG AA on its surface; the smallest rendered text is 11px.
- **Empty states are product-facing.** They say what the area does and how to fill
  it. They never mention implementation status or internal phases.

### Sample data

`src/lib/demo-data.ts` exists only so the interface can be designed and reviewed
before Phase 3. It is static, clearly marked, and surfaced in the topbar as a
"Sample data" pill so it is never mistaken for live workspace data.

When Supabase lands, replace each import with a workspace-scoped query and delete
the file. A clean `npm run typecheck` afterwards proves no view still depends on it.

### Not yet wired

Leads is connected: Add lead and Import CSV or Excel both go through
`/api/leads`. The rest render as real UI but perform no action until their phase
lands: page-level buttons (Create agent, New campaign, Export report), topbar
search and notifications, and the workspace switcher. Controls that will
stay unavailable for a while are explicitly `disabled` with a reason beside them
(Connect WhatsApp, Save changes) rather than silently doing nothing.

### Tooling note

There is no ESLint setup. `next lint` was removed in Next.js 16, so the old
`lint` script was deleted rather than left failing. Adding ESLint's flat config
(`eslint` + `eslint-config-next`) is a reasonable Phase 2 task.

## Deployment

The app is a stock Next.js project: Vercel needs no `vercel.json` and no build
overrides. What it does need is configuration, in this order.

**1. Apply the database schema.** Nothing works before this — the workspace
bootstrap trigger and every RLS policy live here. Run the files in
`supabase/migrations/` in filename order, either with `supabase db push` or by
pasting each one into the Supabase SQL editor.

**2. Set the environment variables** in Vercel (Project → Settings →
Environment Variables), for Production, Preview and Development:

| Variable | Where it comes from |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the publishable (anon) key from the same page |
| `NEXT_PUBLIC_SITE_URL` | optional; your production origin |

Those two required values are the only configuration the app reads. The secret
key is deliberately not one of them: no server route uses it, because every
query runs as the signed-in user so RLS applies.

`NEXT_PUBLIC_*` values are inlined into the bundle **at build time**, so set
them before the first deploy and redeploy after changing one — editing the
variable alone does not change a build that already shipped.

**3. Import the repository** at vercel.com/new. Framework and build command are
detected; leave them alone.

**4. Point Supabase at the deployed origin** — Authentication → URL
Configuration — as described under **What to configure in Supabase** above. The
callback URL must be on the Redirect URLs allow-list or Supabase silently
redirects confirmation links to the Site URL instead, and signup appears to
hang with no error.

A deployment that is missing step 2 does not crash: `/login` explains that the
server is not configured, and every protected route and API route refuses
rather than rendering signed-in chrome to an anonymous visitor.

## Planned stack

- Next.js + TypeScript
- Supabase PostgreSQL + Auth
- Vercel for application hosting
- Provider adapters for telephony, WhatsApp, and AI

See `docs/ARCHITECTURE.md` and `supabase/migrations/0001_initial_schema.sql`.
