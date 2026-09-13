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

## Planned stack

- Next.js + TypeScript
- Supabase PostgreSQL + Auth
- Vercel for application hosting
- Provider adapters for telephony, WhatsApp, and AI

See `docs/ARCHITECTURE.md` and `supabase/migrations/0001_initial_schema.sql`.
