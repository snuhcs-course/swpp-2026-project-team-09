# 02: Steps on the answer card

Parent: [P03 spec](../spec.md)
Status: ready-for-agent
Blocked by: [01](01-steps-on-the-server.md) for the steps to arrive; the app works without them.

Native files: none. Releases: an app OTA update only.

The answer screen is being redesigned (a time bar under the question, details on the map). This ticket does not change the frame. It shows the steps in the card the app has now, in the smallest way that is honest: every step visible and reachable.

## What happens now

- The app copies a reply's text, cards, answer, Lookup, refusal and offers onto the bubble (`answerTo` in `mobile/src/features/assistant/use-chat.ts`). It knows nothing of `steps`; a field it does not check is ignored.
- `Words` in `answer/answer-frame.tsx` draws the plan's card in place of the model's text whenever an answer is on screen. A reason said only in that text is never seen.
- The library cards are drawn below the words (`BubbleParts` in `chat-bubbles.tsx`), so a seat's book card already sits under the meal's plan, with nothing saying that the seat comes first.

## What changes

- `ReplyStep` and an optional `steps` on `AssistantReply` (`mobile/src/api/assistant-types.ts`), the same shape as the server's.
- The reply's guard checks each step (`api/server/step-answers.ts`): a known kind, a title, places or null, times or null, `shown` or `not-done`, a reason or null, and what shows it. When one step fails, every step is left out and the rest of the reply is kept, so a later main server's new kind of step never costs the answer.
- The bubble keeps `steps` when there are two or more.
- `ReplySteps` (`answer/reply-steps.tsx`), above the reply in the answer card: one row for each step, numbered in time order. A row says the time ("17:30–19:00", or "19:04" without an end), the title, and where the step sets out from ("· 62-1동에서"). A booking's row adds "예약 카드는 아래에 있어요"; a step not done has a gray number and its reason in the warning colour ("열람실은 당일만 예약할 수 있어요").
- The plan's card and the book card stay where they are. Nothing is booked until the User presses 예약하기 on the card.
- The mock build answers words that ask for a step and then a meal ("관정 갔다가 저녁") with the main server's reply to such a message from the evaluation run (`api/mock/data/steps-answer.json`), moved to today.

## What the new layout needs

`steps` alone: `startAt` and `endAt` for each step's stretch on the time bar, `place` for a numbered flag, `from` with the place before it for the route, `status` and `reason` for a faded flag with its reason, and `shows` to open the step's card or plan from its flag. See the spec.

## Acceptance criteria

- [x] A reply with a seat card, a meal plan and two steps: the card shows "17:00–18:00 7층 7A 열람실 2 구역" with "예약 카드는 아래에 있어요", then "18:04–18:30 학생회관식당에서 저녁 · 62-1동에서", and no third row. (Integration test.)
- [x] The plan's lines and the seat's book card are still in the card, and nothing was written to the library. (Integration test.)
- [x] A step not done shows its reason, and the plan after it is still drawn. (Integration test.)
- [x] A reply to one request shows no steps. (Integration test.)
- [x] The guard keeps two steps in order, keeps a reply without steps as it was, and refuses a step of an unknown kind or without a status. (Integration test.)
- [x] The mock build's stored reply passes the checks and moves to the day asked. (Unit test.)
- [x] The card on a phone, with the mock build. (Emulator; see the comments.)
- [x] No native file changes; oxlint, Prettier and tsc pass on the app.

## Comments

### Emulator check (2026-11-21)

The debug app on an Android emulator, with Metro from this branch in mock mode (no main server, no library). "관정 갔다가 저녁" got the stored reply: the card listed "① 17:30–19:00 7층 7A 열람실 2 구역 · 예약 카드는 아래에 있어요" and "② 19:04–19:30 학생회관식당에서 저녁 · 62-1동에서" above the chip "62-1동에서" and the plan's lines; the map drew 학생회관식당 at 19:04. Scrolling the card showed the seat's book card (17:30–19:00, 7층 열람실) below the plan, logged out of the library; nothing on it was pressed. A step not done was checked only in the integration test: the mock build has no reply with a refused step.

The emulator's system process had to be rebooted first, after a loop of "isn't responding" dialogs that "Wait" did not end.

### Agent usage (2026-11-21)

- Agent time: about 33 minutes in the same session as ticket 01, after its pull request (an estimate from the transcript, without the minutes spent waiting for an answer about the emulator). It covers the app change, its tests, the mock reply, and the emulator check, which the frozen emulator made longer.
- Tokens: output 69k; input 54.9M, of which 54.7M cache reads, 153k cache writes and 246 uncached. No subagents in this part.
