# 20: The conversation's answers kept by key, and what a request tells of the steps

Parent: [P03 spec](../spec.md). The app side of P05 tickets 73 and 74 (main server PRs #703, merged, and #710): a reply to an app that says `answers` carries one answer per request, each with an opaque `key`, and the steps name their answers by key.
Status: ready-for-human
Blocked by: nothing to build. Its sending waits for ticket 22, which says `answers` once P05 ticket 74 is released.

Native files: none. Releases: an app OTA update; nothing changes on screen.

## What changes

- **Types** (`mobile/src/api/assistant-types.ts`, `reply-step-types.ts`, new `constraint-types.ts`):
  - `AnswerReply.key`;
  - the reply's `answers`, `withdrawn` and `select.key`;
  - a step's `shows.key`;
  - `RequestContext.answers` and `.steps`;
  - a constraint's `source: 'step'`.
- **The reply's guards** read them: an answer of `answers` must carry its key; the keys withdrawn are words; a step's answer may name its key; a chained start's `step` source is accepted. A recalculation's answer keeps its key.
- **The bubble** keeps the reply's `answers`, `withdrawn` and `select.key` (`assistant-bubble.ts`, `use-chat.ts`).
- **The conversation's answers** (`features/assistant/conversation-answers.ts`, pure):
  - Each reply's answers take the place of the one of the same key, or come after them. An answer the reply does not name stays, and the keys withdrawn leave.
  - The steps are the last reply's, whole.
  - A reply without `answers` gives its one answer, as the app always drew it.
  - A recalculation puts its answer in place under the key it came back with, and the step follows it.
- **What a request tells** (`screens/main/use-context-chat.ts`): with steps on screen, `context.answers` holds every answer's conditions in the order of the steps (the one on screen as recalculated), and `context.steps` the steps whole. This happens only once the app says `answers` (`saysAnswers` in `api/capabilities.ts`, false until ticket 22), since a main server before P05 tickets 73 and 74 refuses them. With one answer on screen nothing more is sent.

## Not here

- The steps showing their own answers is ticket 21.
- The emulator's mock replies with two answers come with ticket 21, where they show.

## Acceptance criteria

- [x] A reply's answers with their keys, the keys withdrawn, the request of a plan chosen and the steps by key are believed. An answer of `answers` without its key fails the reply, as any answer the app cannot read does. A reply without them is read as before. A recalculation keeps its key. (Integration test, `api/reply-answers`.)
- [x] What each reply does to the answers, a recalculation's key and step, and what a request tells of the steps. (Unit test, `features/conversation-answers`.)
- [x] With steps on screen, a follow-up of an app that says `answers` sends every answer's conditions in step order and the steps. (Integration test, `answer-steps-context`, with `answers` said.)
- [x] While the app does not say `answers`, it sends nothing more. (Unit test, `features/steps-context`.)

## Comments
