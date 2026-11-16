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

Phase 2 (the chat sheet's tests):

10. **The chat sheet's tests send from the map's bar and read the frame.** Files whose every test moved are renamed `answer-frame-*` (the eleven library cards' files, and the Proposals', events', Quests', Restaurants', travel boxes', map buttons', and Markdown's); `main-chat` keeps its name for the tests that moved (the send button, the latest 20 messages, `maxLength` 1000, ✕ putting the keyboard down). Request bodies are checked with the context they now carry; the messages expected are unchanged.
11. **Tests deleted as the sheet's own**: opening as a sheet, "대화 닫기", reopening, both "새 대화" tests, a press on the sheet's background, the sheet's scroll and header (`main-chat-scroll`), a drag of the conversation, and the chat sheet describe of `answer-failure-and-waiting`. Where a frame test already states the same behaviour it is named in the pull request's notes (the examples and the notice by `answer-examples` and `answer-frame`, ··· and the reply, a follow-up, "다시 시도", the daily limit, and a failure left out by `answer-frame` and `answer-failure-and-waiting`, the tutorial's ask by `answer-frame-tutorial`).
12. **A card the app shows before the User says anything is the frame's turn** (`features/assistant/turn.ts`): the room-window Notification's card (`/main?card=party:<id>`) opened an empty frame once the sheet was gone, since a turn began only at a message of the User. Now the app's own bubbles are a turn whose words, the first bubble's ("예약 창이 열렸어요"), are the pill's. The unit test that said such a conversation has no turn now says this.
13. **The first run's test of a User who finished Onboarding before this version** no longer checks that the watched interests were not asked for: the everyday map reads them for its marks since the switch went, so the request no longer tells whether the first run asked.
14. **The note under the examples stands on a white ground** (`answer/asked-examples.tsx`): on the emulator it ran into the map's labels and faces.
15. `.github/ci/app-test-times.json` names the moved files by their new names and drops the deleted ones.

### Checked on an emulator (2026-11-16)

On the Android emulator, with the mock, at `705c0e64` (phase 1 and the note's ground), 15:49–15:54:
- The map's bar focused with nothing asked: "식사 메뉴 추천", "현재 통학/순환 셔틀 위치", and "파티 찾기" above it, with "대화 내용은 AI 제공자에게 전송돼요" (first unreadable over the map, then on a white ground).
- 김민준's card from the friend list with "만나고 싶다", and its answer in the frame (the pill "김민준 · 만나고 싶다", "12:15 302동 앞에서 만나요", "1/5", "이어서 말하기"), with no switch turned on.
- Not run on the emulator: a press on an example (the examples show only while the keyboard is up, and no input is sent to the emulator while its keyboard is open), and the answers that need Korean typed (events, Quests, and a new Quest); the integration tests cover them.

### Agent usage (2026-11-16)

One session with three subagents for this ticket (phase 1, then the library cards' tests and the other tests of the sheet in parallel); the session's own time counted is the briefs, the reading of the acceptance test sheet, the emulator check, and the fixes after phase 2. Phase 1's last test run died with the Mac's reboot at about 15:27.

- Agent time: about 115 minutes, an estimate from the transcripts' timestamps (the union of the main session's and the subagents' active stretches, gaps of five minutes or more left out).
- Tokens: output 381,182; input 192,236,492, of which 187,856,694 were cache reads, 4,378,594 cache writes, and 1,204 uncached. Without cache reads: 4,760,980.
