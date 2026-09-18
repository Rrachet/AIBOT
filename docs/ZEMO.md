# Zemo

Zemo is the product guide: the small character on the rim of the page that
explains AIBOT, runs the tour, and says what to do next. This describes what it
is allowed to know, what it is allowed to do, and where each of those is
enforced.

## 1. The shape

```
ZemoInput  ->  ZemoIntent  ->  ZemoAction  ->  the application
(what a person did)   (what it meant)   (what may be offered)
```

Each arrow is a module boundary, and the middle one is the interesting one.
Intent recognition today is word matching (`DemoZemoProvider`), because this
build pays for no AI provider. Replacing it with a model means writing one more
class against `ZemoProvider` — the answers, the actions and the widget do not
move, and the set of things Zemo can offer to do stays the same closed list.

`ZemoInput.source` is `keyboard | suggestion | voice | system`. Nothing in this
build listens to anything; the value exists so that adding a microphone is one
more case rather than a second pipeline beside this one.

| File | What lives there |
| --- | --- |
| `zemo-context.ts` | The page model: every route Zemo may speak about |
| `zemo-intent.ts` | Input, intent, action, and the action allow-list |
| `zemo-voice.ts` | Everything Zemo may say about the voice preview |
| `zemo-provider.ts` | `classify()` then `answer()` — the brain |
| `zemo-widget.tsx` | Presence, restraint, and running an action |
| `zemo-panel.tsx` | The conversation |
| `zemo-aside.tsx` | Zemo's one line inside the preview dialog |

## 2. The page model

`ZEMO_PAGES` is the whole of what Zemo may say about a page. An entry carries
the summary, `why` the page exists, an analogy, key concepts, what it connects
to, common questions, glossary, a nudge, `nextAction` and `tips`. A route with
no entry gets the fallback, which says plainly that there are no notes on it.

This is deliberate. Zemo answering from general knowledge would produce fluent
sentences about features AIBOT does not have, and somebody would buy on one.
Everything is structured rather than spread through conditionals so that adding
a page is adding an entry.

`nextAction` answers "right, what now?" — one thing, not a checklist. `tips` are
the things a colleague mentions in passing: what a number excludes, what does
not live on this page, the mistake everyone makes once.

## 3. What Zemo may do

```ts
type ZemoAction =
  | { kind: 'navigate'; label: string; href: string }
  | { kind: 'start-tour'; label: string }
  | { kind: 'ask'; label: string; question: string };
```

Everything in that union is reversible and harmless. There is no action for
creating, editing, sending, deleting or running anything, and none of them
carries a workspace id, a credential or a request body. An assistant that can
press the buttons can press the wrong one, and the blast radius of "Zemo
misunderstood" has to stay at "Zemo opened the wrong page".

`allowedAction()` checks a navigation target against `ZEMO_ROUTES`, an
allow-list of the application's own routes. It is called twice — once in the
panel before an action is rendered, once in the widget before one is performed —
because "it was validated upstream" is how an action model stops being one.

Being on that list is not permission. Every route is guarded on the server by
`requireUser()`, and following a link Zemo offered is exactly as authorised as
typing it into the address bar. Zemo gains nothing from client state: it holds
no capability, no session and no service key.

## 4. The voice preview

The demo voice preview publishes a typed state — scenario, language, and the
booleans `loading`, `playing`, `speaking`, `paused`, `complete`. Zemo subscribes
with `useVoicePreviewState()`. It does not read the DOM, look for class names or
infer anything from text on screen; if the preview does not publish it, Zemo
does not know it. The payload carries no transcript, no lead and no workspace
data.

`playing` and `speaking` are both needed and are not the same thing. `speaking`
is the browser's voice, and is what decides whether anything may interrupt.
`playing` is the conversation, which alternates between an agent turn being
spoken and a prospect turn sitting on screen — a line driven by `speaking` alone
would change every few seconds through playback.

The preview opens in a modal dialog, so while it is up the rim widget is inert
and unreachable. Zemo therefore says its line from inside the dialog
(`ZemoVoiceAside`): one line, no commentary, nothing at all while a conversation
is being prepared. Once the dialog closes, the widget keeps what was played
(`ZemoHeard`: a scenario and a language, nothing else) so that opening Zemo
straight afterwards picks up the conversation rather than reciting the page.

## 5. Restraint

- A nudge waits `NUDGE_DELAY_MS` before it appears, fires at most once per page
  per session, respects a 90-second global cooldown, and stops entirely once
  the panel has been opened.
- No nudge is scheduled while a voice preview is open, and none fires while a
  field has focus, a dialog is open, or the tab is hidden.
- Zemo never navigates on its own. The one thing it does without a second press
  is run the tour, after being asked for it in words, and it can be left at any
  step.
- The panel is a small panel. There is no full-screen assistant, no persistent
  floating card, no stored chat history, and nothing that covers a control.

## 6. Verification

| Suite | What it covers |
| --- | --- |
| `zemo-copilot.mjs` | 46 checks: the page model, intent routing, the voice lines, the action allow-list |
| `zemo-copilot-ui.mjs` | 23 checks in the browser: the aside through a real playback, restraint, the handover after close |
| `zemo-matrix.mjs` | 20 checks: presence, honesty, themes, mobile, no proactive spam |
| `tour-test.mjs` | 28 checks: the guided tour end to end |

The first runs against the project's own compiled source
(`build-zemo-check.sh`), not a copy of it.
