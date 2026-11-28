# 22: The app says `answers`

Parent: [P03 spec](../spec.md). Turns on tickets 20, 21, 23 and 24, which the app already holds but which waited for the main server.
Status: ready-for-human
Blocked by: the user's check on his phone in the preview build. P05 tickets 73, 74, 76 and 78 (#703, #710, #727) are in `snunow/all/26.11.28-6`, and P05 ticket 79 (#735) in `snunow/all/26.11.28-8`. P03 ticket 23 (#729) is merged.

Native files: none. Releases: an app OTA update, after the main server's Release with P05 ticket 79.

## What changes

- **The app says `answers`** (`api/capabilities.ts`). Every chat request carries it, and the main server then gives one answer per request with its key, the steps naming them by key, the keys withdrawn, and the plan chosen by key. The steps on screen and their answers' conditions go back with each follow-up (`context.answers`, `context.steps`, ticket 20). Each step shows its own answer (ticket 21), its own top card (ticket 23), and its answer's colour on the map (ticket 24).
- **A step withdrawn while another stays leaves the screen** (`withoutWithdrawn` in `features/assistant/conversation-answers.ts`, `withdrawnAfter` in `scene-bubbles.ts`, `useStepAnswer`):
  - Example: lunch and dinner as steps, then "저녁은 다다음주 월요일로". The request ends with none, and the reply draws nothing of its own.
  - With one step left, the main server sends no steps again. The scene then stays, so the app takes off the steps and answers whose keys a later reply withdrew. Lunch stays, chosen, with its time card, and the next request tells lunch alone.
  - With two or more left, the main server gives the steps again.
  - With none left, it says `clears` (P05 ticket 79), as for one answer on screen ("내일 점심", then "다다음주 월요일 점심").

## Acceptance criteria

- [x] Every request says `answers`. (Integration tests, the 26 files that check `SENT_CAPABILITIES`, run locally, since PR CI does not run the app's integration files.)
- [x] "아침 7시에 도서관 갔다가 점심":
  - ① the study place from 07:00 and ② lunch, each with its own answer in the time card;
  - lunch's plan browsed is kept while the study is chosen;
  - a follow-up tells both answers and the steps.

  (Integration test, `answer-steps-study-lunch`.)
- [x] "점심이랑 저녁 짜줘" and "관정에 있다가 저녁" as before, now on the real declaration. (Integration tests: `answer-steps-own-answers`, `answer-steps-context`, `answer-step-top-card`, `answer-steps-live`, `answer-booking-on-map`, `answer-study-seat`, `answer-sheet-high-steps`, `answer-steps-gold`, `answer-frame-steps` and `answer-top-stops`.)
- [x] A step withdrawn with one left: dinner's step leaves, lunch stays chosen, and the next request tells lunch alone. These failed before the change. With none left, both steps leave. (Integration test, `answer-steps-withdrawn`; unit test, `features/conversation-answers`.)
- [x] One answer on screen: a reply that names it among what leaves and says `clears` takes it off (A); one that names only the request that ended keeps it (B). (Integration test, `answer-clears`.)
- [x] The mock answers a meal asked for a day out of reach as the main server does, so the emulator shows both. (Unit test, `api/mock-out-of-reach`.)
- [ ] The user's check on his phone in the preview build.

## Open points

- With one step left, the steps card stays with that one step, under the refusal's words, rather than turning back into the single answer's screen. This is the smallest change that keeps its answer chosen. The phone check decides whether it reads right.

## Comments

### Agent usage (2026-11-28)

- Agent time: about 50 minutes, an estimate. That is 48 minutes from the session's transcript, 01:31 to 02:40 UTC, which covers the build, the tests and the emulator screens; and a few minutes listing what had to be true first, before P05 ticket 79. It counts gaps under five minutes and leaves out time spent waiting for a person.
- Tokens, 01:31 to 02:40 UTC: input 58,882,833, of which 58,697,251 were cache reads, 185,308 cache writes and 274 uncached. Output 73,511. No subagents.
