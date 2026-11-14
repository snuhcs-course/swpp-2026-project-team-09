# 01: The answer frame, behind a switch

Parent: [P02 spec](../spec.md) ("The switch", "The answer frame", "The request context")
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

A User whose phone has the switch on asks the Assistant from the bar on the map, and the answer is shown in the frame: what was asked as a pill at the top with a ✕, and one card attached to the bottom of the screen with the answer and the input. The Friend list, the Quest list, the footprints row, and the bottom menu give way while it is shown. Today's answers (the text, the event, Quest, Restaurant, and library cards, a Proposal, the map buttons, and "다시 시도") are inside the card as they are, and the request tells the main server where the User is and that this app draws answers. With the switch off, which is how every phone starts, nothing a User sees or sends changes.

## Acceptance criteria

- [ ] **The switch.** The phone keeps a flag, off by default. A long press on the build line at the bottom of 내 정보 turns it on or off and shows a toast that says which. The main screen follows the change without a restart. A phone that kept nothing, or kept an older version's data, reads it as off.
- [ ] **Off is today.** With the flag off, pressing the bar opens the chat sheet as today, and the request's body is today's: the messages and the library capability, with no context. The chat's existing tests pass unchanged.
- [ ] **The frame.** With the flag on, sending words shows the pill with those words and a ✕, and the card with "보는 중이에요" until the reply comes, then the reply. The chat sheet does not open.
- [ ] **What gives way.** While the frame is shown: the Friend list, the Quest list, the row of buttons with the footprints, the 편의기능 button, the zoom control, the shuttle's notice, the tutorial's start button, and the card of a pressed thing are not shown; the tab bar is not shown while the main tab is in front; and a press on a marker opens no card.
- [ ] **Today's answers inside the card**, drawn with the chat's own parts: the text as Markdown, the event, Quest, Restaurant, and library cards with their buttons, a Proposal with "만들기" and "수정", the map buttons, and "다시 시도" under a failure. A card that leads elsewhere leaves the frame as it is, and a map button closes the frame and turns its layer on.
- [ ] **A reply that carries a Plan** shows the first Plan's two lines in the card, with their strong parts marked, in place of the model's sentence; one whose answer has no Plan shows the lines that say why.
- [ ] **Closing.** The ✕ and Android's back button forget the conversation, a reply on its way included, and bring the everyday map back with everything that gave way.
- [ ] **The input.** The bar's placeholder is "이어서 말하기" while the frame is shown. A follow-up message joins the same conversation, and the pill then says the new words. While the keyboard is up the card's content gives way and the bar stands over the keyboard. "대화 내용은 AI 제공자에게 전송돼요" stands above the bar while it has the focus and nothing is asked.
- [ ] **Every way of asking** from the main screen shows the frame when the flag is on: the bar, 관정관's "좌석 현황", and the tutorial's ask.
- [ ] **The request context.** With the flag on, each request, "다시 시도" included, carries a context with the User's position (null off campus and when the phone has none) and nulls for the rest, and the capability that says the app draws answers.
- [ ] **The conversation keeps each reply's answer**, so that the next ticket can draw it.
- [ ] A toast sits above the card, and the card never covers the pill: its content scrolls inside it.
- [ ] Integration tests at the main screen over the fake main server for each criterion above, and unit tests for the flag and for what a turn is. Expected values come from this ticket, the wireframes, and the stored copy of a real answer.
- [ ] The app's README says what the frame is and how the switch is turned on.
- [ ] Each changed source file has its AI-generated row; lint, format, type checks, and the touched tests pass; and no native file of the app changed.

## Comments

### Decisions (2026-11-14)

Details the spec left to the implementation, listed so that any of them can be vetoed.

1. **The card leaves the User's words out.** They are in the pill, so the card draws only what came after them in the turn: the reply, a failure, and the app's own bubbles.
2. **Where the switch lives.** `answerOnMap` in what the phone keeps, read once per start by `useAnswerSwitch` (`src/features/assistant/answer-switch.ts`), which every reader follows at once. The long press on 내 정보's build line moved that line into `build-line.tsx`, with its style.
3. **"대화 내용은 AI 제공자에게 전송돼요" follows the keyboard**, not the field's focus: it stands above the bar while the keyboard is up and nothing is asked.
4. **✕ also puts the keyboard down.** A map button forgets the conversation without doing so; the card's content is hidden while the keyboard is up, so its buttons cannot be pressed then.
5. **Android's back button closes the frame, a swipe from the edge does not**: the frame lies on the map and leaves its edges to the map's drags (`useBackToClose` with `edge: false`).
6. **The card's height takes the place of the shuttle's notice's** in the main screen's room while the frame is shown (the notice is hidden then), and the toast sits 8 above the card. The lists' rows and the map's inset do not count the card yet; ticket 02's camera fit decides them.
7. **The tab bar is hidden by a small store** (`src/screens/shell/main-tab-bar.ts`) that the main screen sets while the frame is shown; the tab bar draws nothing then while 지도 is in front.
8. **A selected thing's card stays selected** while the frame is shown, hidden, and comes back when the frame closes; a press on a marker in the frame selects nothing.
9. **Code moved for the 300-line limit, unchanged**: the event and Quest cards' hooks to `chat-card-actions.tsx` (with a shared `useCardActions` the sheet and the frame use), the main screen's `useRoom` to `use-room.ts`, and a bubble's parts to `BubbleParts` in `chat-bubbles.tsx`.
10. **관정관's 좌석 현황** asks from the selected card, which now takes the chat control instead of an `onAsk` callback.
