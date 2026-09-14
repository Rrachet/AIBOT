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

Two ways in, both landing on the same Supabase user:

- **Email and password** — signup, sign-in and email confirmation.
- **Continue with Google** — OAuth via Supabase, using the PKCE flow.

### Google sign-in: what to configure

Nothing about Google goes in this repository. The client ID and secret belong
in the Supabase Dashboard, which is why `.env.example` gains no new variable —
the browser derives its redirect from `window.location.origin`.

**1. Google Cloud Console** — APIs & Services → Credentials → *OAuth client ID*
(Web application):

| Field | Value |
| --- | --- |
| Authorised JavaScript origins | `http://localhost:3000`, plus your production origin |
| Authorised redirect URI | `https://<project-ref>.supabase.co/auth/v1/callback` |

The redirect URI points at **Supabase**, not at AIBOT. Supabase completes the
exchange with Google and then redirects to AIBOT. Copy the generated client ID
and client secret.

**2. Supabase Dashboard → Authentication → Providers → Google**

- Enable the provider.
- Paste the client ID and client secret from step 1.
- Leave *Skip nonce check* off.

**3. Supabase Dashboard → Authentication → URL Configuration**

| Field | Value |
| --- | --- |
| Site URL | your production origin, e.g. `https://aibot.example.com` |
| Redirect URLs | `http://localhost:3000/auth/callback`, `https://<your-domain>/auth/callback`, and for Vercel previews `https://*-<your-team>.vercel.app/auth/callback` |

A redirect URL that is not listed here fails the exchange and the user is
returned to `/login` with an error. Add every origin the app is served from.

### One account per email

Supabase links a Google sign-in to an existing user when the email matches and
is confirmed (Dashboard → Authentication → Providers → *Allow manual linking* /
automatic linking behaviour). AIBOT does not merge accounts itself: there is no
code that looks a user up by email and joins records, because doing so on an
unverified email is how account-takeover bugs happen.

### First Google sign-in

A Google account arrives with no password, so `/auth/set-password` offers to
create one — the account then works with either method. An account that already
has a password never sees that page. The password is passed straight to
`supabase.auth.updateUser()` and is never stored or logged by AIBOT.

### Workspaces

Workspace creation belongs to the `on_auth_user_created_workspace` trigger,
which fires for every new `auth.users` row regardless of how the user signed
up. Application code never creates a workspace, so a Google signup gets exactly
one and a returning Google user gets none.


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

These render as real UI but perform no action until their phase lands: page-level
buttons (Add lead, Import CSV or Excel, Create agent, New campaign, Export report),
topbar search and notifications, and the workspace switcher. Controls that will
stay unavailable for a while are explicitly `disabled` with a reason beside them
(Connect WhatsApp, Save changes) rather than silently doing nothing.

### Tooling note

There is no ESLint setup. `next lint` was removed in Next.js 16, so the old
`lint` script was deleted rather than left failing. Adding ESLint's flat config
(`eslint` + `eslint-config-next`) is a reasonable Phase 2 task.

## Planned stack

- Next.js + TypeScript
- Supabase PostgreSQL + Auth
- Vercel for application hosting
- Provider adapters for telephony, WhatsApp, and AI

See `docs/ARCHITECTURE.md` and `supabase/migrations/0001_initial_schema.sql`.
