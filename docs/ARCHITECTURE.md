# AIBOT Architecture

## 1. Core model

AIBOT is a multi-tenant application. Every business owns a `workspace`; operational data belongs to exactly one workspace.

```text
User -> Workspace -> Leads -> Campaigns -> Calls
                         |                 |
                         +-> Activities   +-> AI Agent
                         |
                         +-> Follow-ups -> Messages (future)
```

## 2. Lead lifecycle

```text
NEW -> QUEUED -> CALLING -> CONTACTED
                         |-> NO_ANSWER -> FOLLOW_UP
                         |-> FAILED
CONTACTED -> QUALIFIED / NOT_INTERESTED / FOLLOW_UP / COMPLETED
```

Lead ingestion is source-neutral. V1 implements manual and file imports; future adapters can implement Meta, website, or CRM ingestion without changing the lead domain.

## 3. Calling boundary

The application owns the call lifecycle and business records. A provider adapter owns telephony details.

```text
CallingService
  -> VoiceProvider.initiateCall()
  -> webhook/event normalization
  -> Call record update
  -> Lead outcome update
```

The adapter interface must never leak provider-specific objects into the domain layer.

## 4. AI boundary

The agent configuration is stored by AIBOT. Runtime execution is provider-independent.

```text
Agent config + lead context + conversation
                  -> AgentRuntime
                  -> AI provider
                  -> normalized response/tool action
```

## 5. Follow-up boundary

A no-answer call creates a follow-up intent. A future WhatsApp adapter executes it. This keeps scheduling/business rules independent of WhatsApp APIs.

```text
Call outcome NO_ANSWER
        -> FollowUpService
        -> pending follow-up
        -> WhatsAppProvider (future)
```

## 6. API conventions

- Authenticate every application route.
- Resolve the active workspace server-side; never trust a workspace ID supplied by the browser without authorization checks.
- Validate request payloads with Zod.
- Return normalized domain responses rather than provider payloads.
- Idempotent webhook processing is required.
- Never store provider secrets in database rows unless explicitly encrypted and required.

## 7. Multi-tenancy

All tenant-owned tables contain `workspace_id` and are protected with Supabase Row Level Security. The server may use the service role only in tightly scoped trusted code paths; browser clients use the anon/publishable key and RLS.

## 8. Event strategy

The database is the source of truth. Important lifecycle changes should be represented by durable activity records. We can introduce a dedicated queue/outbox later when volume requires it; V1 should not add infrastructure that is not needed.

## 9. V1 boundaries

Build now:

- authentication/workspace foundation
- manual leads
- CSV/Excel import pipeline
- lead list/detail/status
- AI agent configuration
- campaigns
- call records
- provider interface and one real provider integration once credentials are available

Do not build yet:

- Meta Lead Ads
- automated WhatsApp agent
- workflow canvas
- billing
- advanced analytics
- CRM integrations

The schema deliberately has room for these future capabilities.
