# 22: The app says `answers`

Parent: [P03 spec](../spec.md). Turns on tickets 20, 21, 23 and 24, which the app already holds but which waited for the main server.
Status: done (#736, merged as bf4b2979a after the user's check on his phone in the preview build)
Blocked by: nothing. P05 tickets 73, 74, 76 and 78 (#703, #710, #727) are in `snunow/all/26.11.28-6`, and P05 ticket 79 (#735) in `snunow/all/26.11.28-8`. P03 ticket 23 (#729) is merged.

Native files: none. Releases: an app OTA update, after the main server's Release with P05 ticket 79.

## What changes

- **The app says `answers`** (`api/capabilities.ts`). Every chat request carries it, and the main server then gives one answer per request with its key, the steps naming them by key, the keys withdrawn, and the plan chosen by key. The steps on screen and their answers' conditions go back with each follow-up (`context.answers`, `context.steps`, ticket 20). Each step shows its own answer (ticket 21), its own top card (ticket 23), and its answer's colour on the map (ticket 24).
- **A step withdrawn while another stays leaves the screen** (`withoutWithdrawn` in `features/assistant/conversation-answers.ts`, `withdrawnAfter` in `scene-bubbles.ts`, `useStepAnswer`):
  - Example: lunch and dinner as steps, then "저녁은 다다음주 월요일로". The request ends with none, and the reply draws nothing of its own.
  - With one step left, the main server sends no steps again. The scene then stays, so the app takes off the steps and answers whose keys a later reply withdrew. Lunch stays, chosen, with its time card, and the next request tells lunch alone.
  - With two or more left, the main server gives the steps again.
  - With none left, it says `clears` (P05 ticket 79), as for one answer on screen ("내일 점심", then "다다음주 월요일 점심").

- **A request tells only its own conversation's steps** (`contextFor` in `features/assistant/request-context.ts`, `StepsKept` in `conversation-answers.ts`, `useStepsNow`, `use-context-chat.ts`):
  - The fault, found on the user's phone in the preview build: after "아침 7시에 도서관 갔다가 점심", "＋ 새 대화" and then "점심" alone drew the old conversation's steps card over the single lunch answer, with two flags for one Restaurant.
  - The cause: the first request of the new conversation still told the old conversation's `context.steps` and `context.answers`, so the main server planned the new lunch into the old steps.
  - Now a conversation with no reply yet sends neither. The steps kept on screen carry the conversation they are of, by its first bubble, and a request tells them only for that conversation. That covers "＋ 새 대화", ✕ and a question on the main map, an earlier conversation picked from the list, and a single answer after steps in the same conversation.

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
- [x] After the steps, a single answer tells the main server no steps and draws no steps card: in a new conversation, on the main map after ✕, in an earlier conversation picked from the list, and in the same conversation. The first two failed before the fix. (Integration test, `answer-steps-new-conversation`; unit test, `features/steps-context`.)
- [x] The user's check on his phone in the preview build (2026-11-28: "잘 돼").

## Open points

- With one step left, the steps card stays with that one step, under the refusal's words, rather than turning back into the single answer's screen. This is the smallest change that keeps its answer chosen. The phone check decides whether it reads right.

## Comments

### Agent usage (2026-11-28)

- Agent time: about 100 minutes, an estimate. That is 98 minutes from the session's transcript between 01:31 and 05:59 UTC, plus a few minutes listing what had to be true first, before P05 ticket 79. The 98 minutes cover the build, the tests, the emulator screens, the review's pictures and the conversation-leak fix. It counts gaps under five minutes and leaves out time spent waiting for a person or for a test run.
- Tokens, 01:31 to 05:59 UTC: input 131,339,935, of which 131,016,884 were cache reads, 322,517 cache writes and 534 uncached. Output 152,153. No subagents.
