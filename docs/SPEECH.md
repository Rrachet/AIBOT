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
| `src/domain/voice-scenarios.ts`          | The six conversations a salesperson can choose to show.      |
| `src/app/api/campaigns/[id]/voice-preview/route.ts` | Generates one to listen to. Writes nothing.       |
| `src/app/(app)/campaigns/components/scenario-studio.tsx` | The chips, and the conversation under them.  |
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

## 5. Scenarios

Six, chosen rather than dealt:

| Chip | Key | What the agent demonstrates |
| ---- | --- | --------------------------- |
| Normal enquiry | `DISCOVERY` | Finds out how they work today, proposes a next step. |
| Interested | `INTERESTED` | Qualifies a keen buyer and agrees a time. |
| Already have an agency | `HAS_AGENCY` | Asks whether they are happy. Never attacks the incumbent. |
| Not interested | `NOT_INTERESTED` | Takes no for an answer, first time. |
| Send me details | `SEND_DETAILS` | Finds out what to send before sending anything. |
| Too expensive | `TOO_EXPENSIVE` | Works out what the objection is. Offers no discount, invents no price. |

Those behaviours are asserted, not assumed: the language suite checks that the
agency objection contains "are you happy" and no comparison against the
incumbent, that the price objection contains no percentage, no currency and no
discount, and that a refusal is accepted without a second attempt.

**The four new keys are never dealt.** `PATTERN` in `scenarios.ts` — what a
campaign run deals from — still holds only the original four, so the mix a
business sees is exactly the mix it saw before this feature existed. A test
compares 3,024 transcripts built both ways and 120 scenario deals to keep it
so.

The wording for each lives in the phrasebook alongside everything else, written
out turn by turn rather than assembled from variants: a rehearsed demonstration
should say what it said yesterday. It is deliberately industry-neutral — what
the business actually sells arrives from the agent's own configuration and is
spoken in the opening pitch, so lines that named an industry would contradict
the pitch two turns above them.

## 6. Hear AI Live

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
before, and a request that asks for another language, another scenario, or the
preview endpoint itself is refused with `CAPABILITY_REQUIRED` — the check is on
the server, against the workspace `requireAuth` resolved from the session.

`src/components/speech/voice-preview-state.ts` publishes the current scenario,
language and playback state on a `CustomEvent` for Zemo to use in a later step.
Nothing is persisted and nothing leaves the page: the payload is a scenario key,
a language and three booleans.

### Changing a scenario writes nothing

`GET /api/campaigns/[id]/voice-preview?scenario=…&language=…` runs the campaign's
real configuration through the same generator a test call uses and returns the
conversation. It creates no call, no lead, no membership, no follow-up and no
activity, and moves no figure — a salesperson can flick through all six in front
of a client and leave the workspace exactly as it was. A suite plays all
eighteen scenario-and-language combinations and then compares a full snapshot of
calls, leads, follow-ups, campaign membership, activity and analytics against
the one taken before.

It is deterministic: the seed is `voice-preview:<campaign>:<scenario>:<language>`
and nothing else, so the same choice always produces the same conversation, and
Replay plays the one on screen rather than fetching another.

Pressing **Start test call** afterwards runs the same chosen conversation for
real and records it, which is the one path that does write.

## 7. Automated verification

Two suites, both run against the project's own compiled source.

**Pure modules** — transcript parsing, text preparation, chunking, plan
building, the demo provider. 37 checks, including that Hinglish and Devanagari
survive verbatim, that plan ids are stable, that a plan is deterministic, and
that nothing in the planning path touches a browser API.

**Browser modules** — voice discovery and `SpeechSession`, in Chromium against a
stubbed speech engine. 30 checks covering exact matches, every fallback rung,
late-arriving voices, the full state machine, cancel, pause, resume, two
overlapping requests, disposal, chunking, and each error code.

**Languages and scenarios** — 23 checks that a language change alters the words
and nothing else: same turn order, same facts, Devanagari only in Hindi,
Hinglish never transliterated, the user's own words untouched, every language
defining every phrase, every chosen scenario building in every language with
turns that alternate and end on the agent, and the four behavioural claims
above.

**The scenario studio, in the real application** — 18 checks against a stubbed
engine installed before React mounts: all eighteen scenario-and-language
combinations played end to end with the spoken words matched against the screen
and the prospect never voiced, a full workspace snapshot unchanged afterwards,
replay identical, pause, resume, stop, a double press not doubling the voice,
switching scenario mid-sentence stopping the speech, closing the dialog stopping
the speech, the state published for Zemo carrying nothing private, a missing
voice reported rather than hidden, and a chosen scenario reaching the call that
is actually run.

**The stored test call** — 11 more checks that the other half still works: the
preview offered on a completed call, nothing spoken before the press, the stored
transcript marking the turn being played, every agent line spoken and no
prospect line, replay identical and creating no call.

**Capability gating** — 8 checks with the capability off: no preview, no chips,
the transcript intact, and `CAPABILITY_REQUIRED` from the test call for a
language, from the test call for a scenario, and from the preview endpoint
itself; a spoofed `x-workspace-id` gets `WORKSPACE_FORBIDDEN`, never the
capability.

**Layout** — 96 checks at 375, 390, 414 and 1280 in both themes.

The engine is stubbed because the real one cannot answer these questions here:
**headless Chromium exposes `speechSynthesis` and reports zero voices**, so it
produces no audio and no voice metadata. The one thing the real engine can be
asked is what it does when it has nothing to speak with, and that is checked
directly (it refuses at the first utterance, and is reported as `NO_VOICE`).

## 8. Real-browser verification

Done on 18 September 2026, on the Linux development machine, with **recorded
audio**: Chromium's own `speechSynthesis`, no stub, output routed to a
PulseAudio null sink whose monitor was recorded and measured. "It spoke" is a
measurement here, not a claim.

| Check | Result |
| ----- | ------ |
| English spoken aloud | 51.7s recorded, RMS 4458, 62% of windows voiced |
| Hindi spoken aloud | 61.8s recorded, RMS 4649, 57% voiced |
| Hinglish spoken aloud | 56.8s recorded, RMS 4760, 61% voiced |
| Replay identical | 51.73s then 51.77s, RMS 4458 then 4457 |
| Scenario changes the call | 51.73s vs 51.26s for a different scenario |
| Stop silences the browser | speech, then RMS **0** for the two seconds after Stop |
| Console errors | none |

### What this machine actually has

Chromium reported **13,362 voices**, all from espeak-ng by way of
speech-dispatcher. Relevant to AIBOT:

- **`hi` — "Hindi espeak-ng"**, and around a hundred variants of it. Hindi, but
  tagged with no region.
- **No `en-IN` at all.** The closest is `en-US` / `en-GB`.

So both languages fall back, and the interface says so — which is the behaviour
this feature was built around:

> Using Hindi espeak-ng (hi) — the closest this browser has to Hindi (hi-IN).
> It may not sound the way an Indian caller would.

> Using English (America) espeak-ng (en-US) — the closest this browser has to
> Indian English (en-IN). It may not sound the way an Indian caller would.

### Two things the real browser caught

Both were wording that only a real engine could expose, and both are fixed:

1. **Chromium on Linux speaks while reporting no voices.** On a cold page
   `getVoices()` returns an empty array and only fills in once the
   speech-dispatcher connection has been used — yet `speak()` works and audio
   comes out. The old note read *"This browser reports no speech voices, so
   nothing can be read aloud here"*, which the speakers contradict. It now says
   only what is known: the browser does not name its voices, so an Indian one
   cannot be promised.

2. **A voice tagged `hi` is a Hindi voice.** The same-language note read *"This
   browser has no Hindi voice"* over a voice named "Hindi espeak-ng". It no
   longer asserts an absence it cannot know; it names what is being used and
   what is uncertain about it.

### Running it again on Linux

Two things are needed, neither of them by default:

```sh
apt-get install -y speech-dispatcher espeak-ng pulseaudio pulseaudio-utils
# speechd.conf: AudioOutputMethod "pulse", AddModule "espeak-ng", DefaultModule espeak-ng
```

```sh
chromium --enable-speech-dispatcher     # off by default; without it, speak()
                                        # fails with `synthesis-failed`
```

And if driving it with Playwright, drop `--mute-audio` from the default
arguments — it is passed automatically, and every audio check will otherwise
pass on silence.

**macOS and Windows need none of this.** They ship Indian English and Hindi
voices, so the fallback notes above should not appear at all there — which is
the one thing this machine cannot verify.

### Still unverified anywhere

Whether the speech is *pleasant*. espeak-ng is a formant synthesiser: it is
intelligible and unmistakably robotic. Nothing here establishes that a real
prospect would enjoy listening to it on a Mac, and the manual list below is
still worth a pass on a machine with proper Indian voices.

| # | Check |
| - | ----- |
| 1 | An `en-IN` voice is present, and an English line sounds Indian. |
| 2 | An `hi-IN` voice is present, and a Devanagari line is read as Hindi. |
| 3 | A Hinglish line read by the `en-IN` voice is intelligible. |
| 4 | Pause stops mid-sentence; resume continues from the same place. |
| 5 | Pressing play twice quickly plays the second request only. |
| 6 | Navigating away mid-sentence stops the speech. |
| 7 | Each of the six scenarios sounds like the objection it names. |
| 8 | The voice is good enough to put in front of a paying client. |

Check what a machine has from the developer console on any page of the app:

```js
speechSynthesis.getVoices().map((v) => `${v.name} ${v.lang}`).filter((v) => /-IN$/i.test(v));
```

## 9. Cost

None. The demo provider contacts nothing: no telephony, no speech service, no
model. The voices are the ones already installed on the viewer's own machine,
and no text leaves the browser to be synthesised.

## 10. Capability

The preview is gated on the `liveVoicePreview` workspace capability
(`src/domain/capabilities.ts`, resolved in `src/server/capabilities.ts` from
`LIVE_VOICE_PREVIEW_WORKSPACE_IDS`). Deny by default: an unconfigured
deployment grants it to nobody. It is keyed on workspace id rather than on an
email or a workspace name, because a name is editable from Settings and would
let a workspace grant itself the capability.

A capability decides what is **shown**, never what is **allowed**. Anything it
unlocks is checked again on the server where it is acted on.
