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

## 5. Automated verification

Two suites, both run against the project's own compiled source.

**Pure modules** — transcript parsing, text preparation, chunking, plan
building, the demo provider. 37 checks, including that Hinglish and Devanagari
survive verbatim, that plan ids are stable, that a plan is deterministic, and
that nothing in the planning path touches a browser API.

**Browser modules** — voice discovery and `SpeechSession`, in Chromium against a
stubbed speech engine. 30 checks covering exact matches, every fallback rung,
late-arriving voices, the full state machine, cancel, pause, resume, two
overlapping requests, disposal, chunking, and each error code.

The engine is stubbed because the real one cannot answer these questions here:
**headless Chromium exposes `speechSynthesis` and reports zero voices**, so it
produces no audio and no voice metadata. The one thing the real engine can be
asked is what it does when it has nothing to speak with, and that is checked
directly (it refuses at the first utterance, and is reported as `NO_VOICE`).

## 6. What still needs a person

Audio cannot be heard in CI, so these are checked by hand in a real browser on a
machine that has Indian voices installed.

Step 1 ships no control, so the first check — does this machine have the voices
at all — is run from the developer console on any page of the app:

```js
speechSynthesis.getVoices().map((v) => `${v.name} ${v.lang}`).filter((v) => /-IN$/i.test(v));
```

The rest are run through the preview control once step 2 adds one.

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

Nothing in this document should be read as a claim that audio has been heard in
CI. It has not.

## 7. Cost

None. The demo provider contacts nothing: no telephony, no speech service, no
model. The voices are the ones already installed on the viewer's own machine,
and no text leaves the browser to be synthesised.

## 8. Capability

The preview is gated on the `liveVoicePreview` workspace capability
(`src/domain/capabilities.ts`, resolved in `src/server/capabilities.ts` from
`LIVE_VOICE_PREVIEW_WORKSPACE_IDS`). Deny by default: an unconfigured
deployment grants it to nobody. It is keyed on workspace id rather than on an
email or a workspace name, because a name is editable from Settings and would
let a workspace grant itself the capability.

A capability decides what is **shown**, never what is **allowed**. Anything it
unlocks is checked again on the server where it is acted on.
