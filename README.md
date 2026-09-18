# AIBOT

### AI-powered lead conversations, follow-ups and sales workflow

**AIBOT turns a lead list into a structured conversation workflow — from lead intake to AI conversation, outcome, follow-up, WhatsApp and analytics.**

[![Live App](https://img.shields.io/badge/Live%20App-AIBOT-FF6A00?style=flat-square)](https://aibot-amar-proj.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-151515?style=flat-square&logo=next.js)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-151515?style=flat-square&logo=supabase)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-151515?style=flat-square&logo=vercel)](https://vercel.com)

---

## What AIBOT does

AIBOT is built around one continuous workflow:

```text
LEAD → AGENT → CAMPAIGN → CONVERSATION
                         ↓
                    OUTCOME
                         ↓
              FOLLOW-UP → WHATSAPP
                         ↓
                    ANALYTICS
```

The goal is simple:

> **Make repetitive lead conversations operationally manageable without turning the product into a black box.**

---

## ✨ Product

### Lead management
- Manual lead creation
- CSV / Excel import
- Workspace-scoped lead data
- Lead status and activity tracking

### AI agents
Configure how an agent represents the business, including its objective, script, product knowledge and conversation behaviour.

### Campaigns
Connect leads to an agent and a campaign objective, then run the conversation workflow.

### Conversation intelligence
Calls produce durable records including:
- transcript
- outcome
- summary
- next action
- follow-up information

### Follow-ups + WhatsApp
Conversation outcomes feed the follow-up workflow and WhatsApp experience.

### Analytics
Understand movement through the funnel rather than treating calls as isolated events.

---

## 🎙️ Demo Voice

AIBOT includes a capability-gated browser voice preview for the demo workspace.

The preview supports:

- English
- Hindi
- Hinglish
- Normal enquiry
- Interested
- Already have an agency
- Not interested
- Send me details
- Too expensive

The architecture is:

```text
Existing Conversation Engine
          ↓
       Transcript
          ↓
      Speech Plan
          ↓
    Browser Speech
```

There is **one conversation source of truth**.

The voice layer does not create calls, leads, follow-ups or analytics records. Replay replays the same generated conversation.

---

## 🤖 Zemo

**Zemo is AIBOT's contextual product copilot.**

Rather than behaving like a generic chatbot, Zemo understands product context.

```text
ZemoInput
    ↓
ZemoIntent
    ↓
ZemoAction
    ↓
Application
```

Zemo currently understands:

- current page
- useful next action
- contextual tips
- voice-preview state
- safe navigation
- interactive product tour

The intent layer is deliberately separated from answering so an LLM can be introduced later without replacing the product's action model.

---

## 🏗️ Architecture

### Application

- Next.js App Router
- TypeScript
- React
- Supabase
- PostgreSQL
- Vercel

### Authentication

- Email/password authentication
- Email confirmation
- PKCE callback flow
- Secure server-side session handling
- Workspace-aware authorization

### Multi-tenancy

Every workspace owns its product data.

Authorization is enforced server-side and through PostgreSQL RLS.

Client-side workspace identifiers are never treated as authorization.

### Provider abstraction

Voice, messaging and AI integrations are kept behind provider boundaries.

This allows future integrations without making the domain layer dependent on a particular vendor.

---

## 🔐 Security principles

- Workspace isolation through RLS
- Authenticated API access
- Server-side authorization
- Capability flags resolved server-side
- No service-role key in the application
- No credentials stored in browser state
- Preview features produce no unintended durable records
- Zemo currently exposes only safe, allow-listed actions

---

## 📊 Verification

Recent voice and Zemo work has been regression-tested extensively.

Highlights include:

- **3,024 transcript regression comparisons**
- Scenario and language matrices
- Browser speech tests
- Recorded PCM audio verification
- Test Call regression
- Capability-gating tests
- Zemo tests
- Interactive tour tests
- Responsive layout checks
- Production builds and typechecks
- Full page-load sweeps
- Console-error and overflow checks

The project treats regression coverage as part of the product architecture, not an afterthought.

---

## 🗂️ Repository structure

```text
src/
├── app/                 # App Router pages + API routes
├── components/         # Product UI, Zemo and shared components
├── domain/              # Shared domain models
├── lib/                 # Client/server utilities
└── server/              # Demo engines and provider boundaries

supabase/
└── migrations/          # Database schema + RLS migrations

docs/
├── ARCHITECTURE.md
├── SPEECH.md
└── ZEMO.md
```

---

## 🚀 Current status

### Working

- Authentication
- Workspace model
- Lead management
- Lead import
- Agents
- Campaigns
- Calls
- Follow-ups
- WhatsApp workflow
- Analytics
- Zemo
- Interactive product tour
- Demo voice scenarios
- Browser voice preview
- Business contact configuration
- Light / dark themes

### Next

- Calling provider integration
- WhatsApp provider integration
- Production-grade speech providers
- Voice-enabled Zemo
- LLM-powered Zemo reasoning
- Confirmation-based product actions

---

## Product philosophy

AIBOT is intentionally being built as a **real product system**, not a collection of AI demos.

> **The AI should improve the workflow — not become the workflow.**

Conversations, outcomes, permissions, data and actions remain explicit and testable.

---

## Author

**Amarnath Mishra**

Product Builder · Product Analyst · Full-Stack Engineer

[GitHub](https://github.com/Rrachet) · [LinkedIn](https://in.linkedin.com/in/amarnath-mishra) · [AIBOT](https://aibot-amar-proj.vercel.app)
