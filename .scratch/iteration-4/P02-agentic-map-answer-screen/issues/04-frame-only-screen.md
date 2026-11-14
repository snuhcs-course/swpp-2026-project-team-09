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
