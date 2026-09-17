# Speech

How AIBOT reads a call out loud, and what has and has not been proved about it.

## 1. The boundary

```text
Conversation engine  ->  SpeechProvider  ->  DemoSpeechProvider  ->  the browser
                                         ->  (later) a hosted TTS service
```

The conversation engine writes a transcript. It does not know how that
transcript will be voiced and must never find out: no module under
`src/server/demo/` or `src/app/api/` may import a speech API, and nothing under
`src/server/speech/` may touch `window`.

The field that makes the swap work is `delivery`:

| delivery            | meaning                                            |
| ------------------- | -------------------------------------------------- |
| `client-synthesis`  | no audio exists; the browser reads the text itself |
| `audio`             | the provider produced sound, at `audioUrl`         |

Callers branch on `delivery`, never on a provider's name, so a second provider
of either kind is a new file and nothing else.

## 2. The pieces

| File                                    | What it is                                                   |
| --------------------------------------- | ------------------------------------------------------------ |
| `src/lib/speech/speech-types.ts`         | The vocabulary both sides share. No browser API, no vendor.  |
| `src/lib/speech/speech-script.ts`        | Transcript to plan: parsing, text preparation, chunking.     |
| `src/lib/speech/speech-voices.ts`        | Voice discovery, and honesty about what was actually found.  |
| `src/lib/speech/speech-synthesis.ts`     | `SpeechSession`: play, pause, resume, cancel, state, errors. |
| `src/server/speech/speech-provider.ts`   | The contract and the resolver. Server-only.                  |
| `src/server/speech/demo-speech.ts`       | The provider that plans speech and produces no audio.        |
| `src/server/demo/phrasebook.ts`          | The words a demo call is made of, in each language.          |
| `src/components/speech/use-voice-conversation.ts` | Turn-by-turn choreography: who speaks, who is shown. |
| `src/app/(app)/campaigns/components/voice-preview.tsx` | The Hear AI Live panel in the test call dialog. |

## 3. Languages

Two are asked for: `en-IN` and `hi-IN`.

Hinglish is a **register, not a language**. No speech engine has a Hinglish
voice, so a line like

> Hi Rahul, main Frog Studios se call kar raha hoon. Bas ek minute chahiye tha.

is left exactly as the conversation engine wrote it and read by whichever Indian
voice was selected. It is never translated, transliterated or "corrected" to fit
a locale — doing that would change the very thing the preview demonstrates.

An English line is always read as `en-IN` and a Hindi line always as `hi-IN`,
whatever is selected. Only Hinglish follows the selection.

### The conversation carries the language, not the voice

A speech engine handed English text and told to read it in Hindi does not
translate anything: it reads English words with Hindi phonetics. So the language
is a parameter of the **one** transcript builder rather than something applied
afterwards — a Hindi call really is held in Hindi, and the words on screen are
the words spoken.

`src/server/demo/phrasebook.ts` holds the wording for each language. The
structure, the seeding, the scenario and the facts a call settles on are
identical across all three; only the words change. Two consequences worth
knowing:

- **Facts stay English.** The slot agreed, the callback day and the reason for
  declining are what the summary, the next action and the follow-up message are
  written from, and a business reads those in one language however many
  languages it calls in.
- **The user's own words are never rewritten.** A product description or a
  script opening is spliced in exactly as typed, in every language — which is
  also how these calls are really held, with the product named in English.

The English wording is the original wording, character for character, and a test
compares 3,024 transcripts built both ways to keep it that way.

## 4. Voices, and not lying about them

Which voices exist is decided by the operating system. A Mac has Indian English
and Hindi out of the box; a stock Windows install has neither; a Linux box may
have nothing at all. So no voice is named in code — a locale is asked for, and
the closest available thing is taken.

The failure this is written against is silent. **Ask a browser with no Hindi
voice to speak Hindi and it will not refuse**: it reads the Devanagari in an
American accent, fires no error, and leaves the interface free to claim a Hindi
preview was played. `SpeechVoiceChoice.match` is what stops that claim:

| match      | meaning                                                    |
| ---------- | ----------------------------------------------------------- |
| `exact`    | The locale asked for.                                      |
| `language` | Right language, wrong region — `en-GB` for `en-IN`.        |
| `fallback` | Neither. The words will be mispronounced.                  |
| `none`     | The browser has no voices at all.                          |

Every choice carries a `note` written to be shown to a person as-is. Any UI built
on this must show the note whenever `match` is not `exact`.

## 5. Hear AI Live

The preview in the test call dialog reads back the transcript that was stored.
It creates nothing and changes nothing: no second call, no lead status, no
campaign membership, no follow-up, no effect on analytics, and no rewrite of the
transcript, summary or outcome. Replay plays the same conversation again rather
than generating another.

The agent's turns are spoken. The prospect's turns are shown for about as long
as they would take to say, and are **never voiced** — putting words in the mouth
of a person who was never called is exactly what a screen that says "not
contacted" must not do.

Playback starts only from a press of **Hear AI Live**. Nothing speaks because a
page loaded or a dialog opened.

It is gated on `liveVoicePreview`. A workspace without it sees the dialog it saw
before, and a request that asks for another language anyway is refused with
`CAPABILITY_REQUIRED` — the check is on the server, against the workspace
`requireAuth` resolved from the session.

## 6. Automated verification

Two suites, both run against the project's own compiled source.

**Pure modules** — transcript parsing, text preparation, chunking, plan
building, the demo provider. 37 checks, including that Hinglish and Devanagari
survive verbatim, that plan ids are stable, that a plan is deterministic, and
that nothing in the planning path touches a browser API.

**Browser modules** — voice discovery and `SpeechSession`, in Chromium against a
stubbed speech engine. 30 checks covering exact matches, every fallback rung,
late-arriving voices, the full state machine, cancel, pause, resume, two
overlapping requests, disposal, chunking, and each error code.

**Languages** — 15 checks that a language change alters the words and nothing
else: same turn order, same facts, Devanagari only in Hindi, Hinglish never
transliterated, the user's own words untouched, and every language defining
every phrase.

**The preview, in the real application** — 32 checks against a stubbed engine
installed before React mounts: the capability gate both ways, nothing spoken
before the press, transcript synchronisation, pause, resume, stop, replay saying
the same words and creating no call, a double press not doubling the voice,
closing the dialog stopping the speech, each language reaching the right voice
with every spoken word visible on screen, an unanswered call offering nothing to
play, and a graceful failure with the transcript intact. Plus 64 layout checks
at 375, 390, 414 and 1280 in both themes.

The engine is stubbed because the real one cannot answer these questions here:
**headless Chromium exposes `speechSynthesis` and reports zero voices**, so it
produces no audio and no voice metadata. The one thing the real engine can be
asked is what it does when it has nothing to speak with, and that is checked
directly (it refuses at the first utterance, and is reported as `NO_VOICE`).

## 7. What still needs a person

Audio cannot be heard in CI, so these are checked by hand in a real browser on a
machine that has Indian voices installed.

Check what the machine has from the developer console on any page of the app:

```js
speechSynthesis.getVoices().map((v) => `${v.name} ${v.lang}`).filter((v) => /-IN$/i.test(v));
```

Then run the rest through the preview: open a campaign in a workspace with the
capability, press **Test call**, pick a language, run it, and press **Hear AI
Live**.

| # | Check                                                                   |
| - | ----------------------------------------------------------------------- |
| 1 | An `en-IN` voice is present, and an English line sounds Indian.         |
| 2 | An `hi-IN` voice is present, and a Devanagari line is read as Hindi.    |
| 3 | A Hinglish line read by the `en-IN` voice is intelligible.              |
| 4 | Pause stops mid-sentence; resume continues from the same place.         |
| 5 | Cancel stops immediately and leaves nothing queued.                     |
| 6 | Pressing play twice quickly plays the second request only.              |
| 7 | Navigating away mid-sentence stops the speech.                          |
| 8 | On a machine with no Hindi voice, the fallback note is shown and true.  |
| 9 | The prospect's turns are audibly silent while their text is on screen.  |
| 10 | Replay sounds identical to the first play.                            |

Nothing in this document should be read as a claim that audio has been heard in
CI. It has not.

## 8. Cost

None. The demo provider contacts nothing: no telephony, no speech service, no
model. The voices are the ones already installed on the viewer's own machine,
and no text leaves the browser to be synthesised.

## 9. Capability

The preview is gated on the `liveVoicePreview` workspace capability
(`src/domain/capabilities.ts`, resolved in `src/server/capabilities.ts` from
`LIVE_VOICE_PREVIEW_WORKSPACE_IDS`). Deny by default: an unconfigured
deployment grants it to nobody. It is keyed on workspace id rather than on an
email or a workspace name, because a name is editable from Settings and would
let a workspace grant itself the capability.

A capability decides what is **shown**, never what is **allowed**. Anything it
unlocks is checked again on the server where it is acted on.
