# 04: The answer frame is the only screen, and the chat sheet and the switch are removed

Parent: [P02 spec](../spec.md) ("The switch", "The answer frame")
Status: ready-for-agent
Blocked by: 03; the making of a Quest from a Plan with its invitations (package C), so that a Plan's card has its main button; and the acceptance tests of 2026-11-18, which run on the chat sheet

## What to build

Every phone shows the Assistant's answer in the answer frame. The switch that chose between the frame and the chat sheet is gone, and so is the chat sheet: a User who presses the bar on the map types over the map, and the answer is the pill and the card. Nothing asks the phone which screen to show, and every request carries the request context.

The switch exists only so that the frame could be merged and tried while the acceptance tests ran on the chat sheet and while a Plan had no way to become a Quest. With both behind, two screens for one conversation are only a cost.

## Acceptance criteria

- [ ] **One screen.** A message sent from the bar, from 관정관's "좌석 현황", or from the tutorial's ask shows the frame on every phone. No flag is read.
- [ ] **The switch is removed**: the flag the phone keeps, its store, the long press on 내 정보's build line, and its two toasts. A phone that kept the flag reads its other kept values as before.
- [ ] **The chat sheet is removed**: the sheet, its header with "새 대화" and "대화 닫기", its bubbles' layout, and the code only it used. What the frame shares with it (the cards, the Markdown, the Proposal, and the library cards) stays.
- [ ] **What the empty chat offered has its place in the frame**: while the bar has the keyboard and nothing is asked, the three examples stand above the bar as suggestions, with "대화 내용은 AI 제공자에게 전송돼요", as the wireframe's board of the frame row draws them; a press sends the example.
- [ ] **Every request carries the request context**, and the client always says that it draws answers.
- [ ] **The tests** of the chat sheet are moved to the frame where they state a behaviour that stays (sending, a failure and "다시 시도", the daily limit, each kind of card, and the keyboard), and removed where they state the sheet's own layout. No behaviour that stays loses its test.
- [ ] **The acceptance test document and the requirements** that describe the chat sheet are changed by their owners before this lands; this ticket changes no acceptance test.
- [ ] The app's README describes one screen.
- [ ] Each changed source file has its AI-generated row; lint, format, type checks, and the whole test suite pass; and no native file of the app changed.

## Comments

### Decisions (2026-11-16)

Phase 1 (the source, the shared test support, and the tests that only turned the switch on), listed so that any of them can be vetoed. "Blocked by" was set aside: the switch goes before the Release. No acceptance test, Google document, or Wiki page was changed.

1. **A phone that kept the switch keeps the field.** `answerOnMap` left `Kept`; `readKept` spreads what was stored, so an old record still carries the field, unread, and its other values read as before (`__tests__/storage/kept-answer-switch.integration.test.ts`). Nothing strips it.
2. **Code that only the switch off used went with it**: the friend list's "…님은 위치가 꺼져 있어요" toast (a row of a Friend with no position opens the card); the friend panel's rows without a press (`onShow` is required); the given name under a face (the full name from the "names" level, `marker.short` left unread on `CardView`); `useSelection`'s `offMap` of null and its "buildings take no press" and "어디까지 보이나 hidden" paths; the sheet's close passed to `openProposalForm` and `useProposalMaking`; `useBottomRoom`'s chat; `useChatSheet`'s `inFront`.
3. **The control keeps its name and file and loses the sheet's fields.** `ChatSheetControl` has no `shown`, `open`, `sheet`, or `onMap`; `framed` is "the conversation holds something". The pushed room-window card (`showWaitingRoom`), 관정관's "좌석 현황", and the tutorial's ask only send or add, and the frame shows the turn. The AI input lost `chatOpen`, `onOpen`, and its focus ring.
4. **`chat-bubbles.tsx` keeps `BubbleParts` alone** (with its map buttons, Proposal, and booking's done rows); the bubbles, the empty chat, and their layout went. `chat-travel-box.tsx` stays: the event and Quest cards draw it.
5. **The examples are chips over the map**, in `answer/asked-examples.tsx`, drawn by `MapBottom` beside the frame while the keyboard is up and nothing is asked: the frame's chip (34 high, full radius, the strong border, white) with the floating shadow, as they lie on the map, each with its icon in its layer's colour, in a row that wraps, and the notice line under them, 8 above the bar. A press puts the keyboard down and sends, as the bar's send does. The frame's own notice went.
6. **The context is required by type**: `ApiClient.askAssistant`, `useChat`, and the mock's `mockAssistantReply` take it always, so the mock's answers without a context went too. `CLIENT_CAPABILITIES` went (nothing else read it); `ANSWER_CAPABILITIES` keeps its name and lists `library` itself.
7. **Tests deleted, as what they asserted no longer exists**: the switch's own (`features/answer-switch.unit`, `me-answer-switch.integration`, `me-build-line.unit`); the switch-off cases of `answer-frame`, `answer-map`, `answer-meet`, `answer-made-quest-flag`, `building-press`, `friend-card-tap`, `friend-card-from-list` (and its "switch turned off" case), `friend-panel-card`, `friend-profile` (the given name, and 어디까지 보이나 opening 위치 공유 from a face's card), `friend-seen-card` ("the switch turned off"), `interest-marks`, `invitation-card`, `invitation-card-ended`, `main-friend-levels`, `my-own-dot`, `invitation-cards-known` (read off), `main-selection` (buildings taking no press), and `main-card` (the own dot taking no press); the no-context requests of `api/server-assistant`, `api/mock-assistant`, and `api/refusal-replies`; and the location-off toast of `main-lists` and `friends-server`.
8. **Tests kept with the value the switch on gives**: `invitation-cards-known` waits for the list itself; `main-card`, `main-lists`, `main-markers`, and `main-route` expect the green dot (`:exact`) on the mocks' Friends, who are all seen at the exact level, and the full name under a face; `main`, `main-location`, `main-position`, and `main-walk` find the own dot as the button it now is, and `main-markers` draws it under every face; `friend-profile` opens the profile once, not for both switch states. The examples' tests stand in `answer-examples.integration.test.tsx` (`answer-frame`'s file is at lint's limit).
9. **The mocks' everyday map now draws interest marks**, so the tests of the events' and parties' own markers over the mocks (`main-card`, `main-lists`, `main-markers`, `main-route`) start with `withoutInterestMarks()` (`support/mocks.ts`): `listInterestMatches` answers null, as a main server without the matches does, and the map keeps those markers. A failing mock was not used: the app asks a failed read once more, which holds the map's cards back past `openMain`'s wait.
