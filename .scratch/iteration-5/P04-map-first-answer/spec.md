# P04: The map-first answer screen

Status: ready-for-agent

## Problem Statement

The answer screen ("agentic map") shows an answer three ways at once: the question as a pill at the top, marks on the map, and a white card at the bottom. The card still carries most of the answer in text, so the map and the Assistant do not move as one.

A persona-based usage test on `5.0/Main` (five personas, 30 tasks, a local stack with demo data) found:

- Answers that are actions leave nothing on the map. Making a 파티, booking a 관정도서관 seat, booking a study room, and asking for a menu were answered in the card alone in 7 of 30 tasks. Those cards ran to 20 to 29 lines, and the main button (만들기, 이대로 초대, 이대로 모집) was hidden under the input five times.
- The card repeats itself: the question stands in the pill and again as the card's first line; a table is followed by a sentence that says the table again; a chip "62-1동에서" sits over "지금 있는 62-1동에서".
- Times come without a date. A tester took tomorrow's 18:00 for today's and went as far as the join screen.
- A reader who does not touch the map missed the facts that were asked for (an event's name and time, a menu's prices), which were only in a cut-off label or on the time band.
- Earlier questions cannot be found again: "새 대화" deletes the conversation (its 되돌리기 lasts five seconds), "이전 답" reopens only the last conversation, and there is no list. Both personas given that task failed.
- One persona pressed ✕ expecting the next message to start a new conversation and got the old answer twice.

## Solution

The map carries the answer, and the text says only what the map cannot.

1. **Who, where, when, and the way are never text in the bottom card.** Faces say who, a flag on the place says where, routes say the way, and a time bar says when.
2. **The time bar is one row at the top, under the question pill.** It shows my free time up to my next item with the Plan's span on it; with other people it shows the time everyone shares. A tap unfolds one row per person. It shows only in answers that have a time (a meal, a meeting, a seat, an event, a leave-by time), never on the everyday map or in an answer that is only a place. Its handles drag as they do today.
3. **The bottom shows no text by default.** It holds the input and the main button. One line appears above the input only when the map cannot say it: a question back, a refusal, a warning that is not about one mark, or a part of the request that cannot be done. A tap on the line opens the whole text. Two conditions hold: a fact that was asked for (a menu with its prices, opening hours, an event's name with its start and end) is readable in full on its mark or on a card attached to the mark; an answer with nothing to draw (a procedure, a rule) stays text.
4. **Details and choices live on the map object they belong to.** Other candidate places are small numbered flags, and a tap switches to one. A Friend is added by the + on a face. The title, visibility, size, and invited people of the Quest a Plan will make open in a card attached to its flag. A seat's number is on the flag. Only what has no place on the map stays below: Friends whose position cannot be seen, floors of one building as a chip, the input, and the button.
5. **The button says what will happen** ("만들고 초대 보내기", "일정에 넣기", "예약하기"). **Dates carry the weekday** ("내일(수) 14:00").
6. **A message with several requests** draws numbered flags (① ②) and one span per step on the top bar. A step that cannot be done is said in the one line. The step that is due carries its own detail on its flag (the seat number), and the button is that step's action.
7. **Earlier questions live in the pill.** The pill carries the number of turns; a tap lists each question with its outcome and time, and a tap on a row brings that answer back to the map. "새 대화" is the first row of the list and forgets nothing.
8. **The map screen with the answer closed continues the kept conversation by default.** A chip above its input names the conversation it continues and opens the list; a "새 대화" button beside the input starts a new one at one press.
9. **Leaving an answer**: besides ✕ and Android's back, dragging the bottom card's handle down closes the answer. With the text unfolded, the first drag folds it and the next closes. The chip on the map screen reopens it.

## User Stories

1. As a student who asked to meet a friend tomorrow, I want the date with its weekday on the time bar and on the place's flag, so that I do not take tomorrow's plan for today's.
2. As a student who asked for lunch with friends, I want the shared free time shown as one row at the top, so that I see at a glance when we can all eat.
3. As a student planning with two friends, I want to tap the time bar and see one row per person, so that I can tell whose class blocks which part of the time.
4. As a student, I want to drag the ends of the span on the time bar as I can today, so that I can change the time without typing.
5. As a student whose answer is only a place ("학생회관 어디야?"), I want no time bar, so that the map is not covered by an empty bar.
6. As a student, I want the chosen place's flag to say what the plan is and when it starts, so that I do not need to read a card to know the answer.
7. As a student about to invite a friend, I want to tap the flag and see the title, visibility, size, and invited people of what will be made, so that I know what my friend will receive before I press the button.
8. As a student, I want the reasons for a pick ("근거") on the place's card, so that the bottom stays free while the reason is still one tap away.
9. As a student, I want to press a friend's face to see their profile or take them out of the plan, so that I change who comes on the map itself.
10. As a student, I want to press the + on a friend's face to add them, so that adding people needs no list.
11. As a student whose friend's position is not shown, I want a "+ 같이" chip below that lists the friends I can add, so that I can still add them.
12. As a student, I want to press my own start label ("나 13:45 출발") to pick another building to set out from, so that the start is changed where it is drawn.
13. As a student comparing places, I want the other candidates as small numbered flags, and a tap on one to switch the plan to it, so that I compare on the map rather than with arrows.
14. As a student reading an answer, I want the bottom to hold only the input and the main button, so that most of the map stays visible.
15. As a student, I want the main button to say what it will do ("만들고 초대 보내기"), so that I am not surprised that an invitation was sent.
16. As a student, I want the main button beside the input and never under it, so that I never have to drag a card up to find it.
17. As a student whose request could not be done in full, I want one line above the input that says so ("7층 자리는 당일에만 예약돼요"), so that a dropped part is never silent.
18. As a student, I want to tap that line to read the whole text, so that the full explanation is still there when I want it.
19. As a student who asked a procedure ("학생증 재발급 어떻게 해?"), I want the answer as text, since nothing on the map can say it.
20. As a student who was asked a question back by the Assistant, I want the question as the one line, so that I know it waits for me.
21. As a student making a 파티 through the Assistant, I want the Proposal on the map as a flag at its place with its time, my way there, and the invited friends' faces, so that the 파티 is not a 29-line form.
22. As a student, I want to tap the Proposal's flag to see and change its title, visibility, size, and invited people, so that I can edit before making it.
23. As a student booking a 관정도서관 seat, I want the seat's number and time on the library's flag and my way there drawn, so that the booking is on the map like any other answer.
24. As a student booking a seat, I want the floors of the building as a chip above the input, so that I can switch floors without a long card.
25. As a student who asked for a menu, I want the menu with its prices and the meal's hours on a card attached to the restaurant, so that the fact I asked for is readable in full.
26. As a student who asked what to see tonight, I want the event's name with its start and end on its flag and the other events as numbered flags, so that I read the start time, not my arrival time.
27. As a student who asked for a seat and then dinner in one message, I want numbered flags ① ② and one span per step on the time bar, so that I see the order of my evening.
28. As a student whose first step is due, I want its flag to carry its detail (the seat number) and the button to be that step's action, so that I act on the right step.
29. As a student, I want the pill to show how many questions this conversation holds, so that I know there are earlier answers.
30. As a student, I want to tap the pill and see each earlier question with its outcome and time, so that I can find yesterday's lunch plan again.
31. As a student, I want a tap on an earlier question to bring its answer back onto the map, so that I see it as it was answered.
32. As a student, I want "새 대화" to start a new conversation without deleting the old one, so that I never lose an answer by starting over.
33. As a student who closed an answer, I want the next message on the map screen to continue the conversation, so that a follow-up keeps its context.
34. As a student on the map screen, I want a chip that names the conversation my message will continue, so that I know before I send.
35. As a student on the map screen, I want a "새 대화" button beside the input, so that I can start fresh at one press.
36. As a student, I want to drag the bottom card down to close the answer, so that I need not reach the small ✕ at the top.
37. As a student with the whole text open, I want the first drag down to fold the text and the next to close the answer, so that a drag never closes more than I meant.
38. As a student using a screen reader, I want the time bar, the flags' cards, the pill's list, and the chip to be buttons with labels, so that every part of the answer is reachable without sight.

## Implementation Decisions

### The frame's layout

- The answer frame's top holds the pill and, under it, the time bar. The bottom holds the AI input with the main button beside it, and above them at most one line of text and the chips that have no place on the map. The camera's fit counts the bar as part of what covers the map at the top.
- Everything removed from the card goes to the map or to the bar in an earlier ticket than the one that removes it, so that no state of `5.0/Main` loses a control.

### The time bar

- The bar draws the Plan's (or Lookup's, or booking's) existing `TimeBand`: its range, the line of now, its span, and its lanes. Folded, it is one row: the span over the time everyone shares, the busy stretches of all lanes merged, with the nearest busy edge on each side named ("13:45 수업 끝", "15:30 수업"). Unfolded, it shows one row per lane as the band does today.
- Its title is the span's start and end with the day word: "14:00–15:00" today, "내일(수) 14:00–15:00" tomorrow, "11/23(월) 12:00–12:50" further ahead, "어제(금)" for a day before. The same day words are used on flags and in step rows. The words are made in the app from the band's `now` and the span's start; the main server sends nothing new for them.
- Handles, moving the span whole, the ghost with 되돌리기, focus from the "until" chip, and the screen reader's steps keep today's rules. Changing the time by dragging stays as it is; nothing new is added to it.

### Flags and attached cards

- The pick's flag carries the Plan's title on its first line and its start with the day word on its second ("민수와 만나기 ›" / "14:00 내일(수) · 비공개").
- A tap on a flag or a face opens one card attached to it, an overlay placed at the mark's point at the answer's camera. Only one is open at a time; a tap elsewhere on the map, a camera move by the User, a new reply, or closing the answer closes it. Its rows are buttons.
- The card of a Plan with Friends shows what "이대로 초대" will make: title, visibility (비공개, the main server's default for a Quest made from a Plan; 공개 for a new recruiting Quest), size (the Plan's people), and the invited people; then the basis lines.
- A face's card shows the name, 프로필 (the Friend's profile, as the chip opens today), and 빼기 (as the chip's ✕). My own start label's card lists the buildings to set out from, as the origin chip does today.
- Candidate places stay the existing numbered dots; a tap on one shows its Plan, as today.
- Reply cards that have no scene today (a Proposal, a library card, a restaurant card, an event card) get one made in the app from data it already holds: the place's position from the list of Places, my position, and a walk from me to the place, which `useAnswerWalks` routes. They are drawn by the same drawing as a Lookup's scene.

### The bottom

- The card's question line, condition chips, the Plan's lines, the arrows and the count, and "근거" leave the card. "+ 같이" stays as a chip above the input while the answer can take more people.
- The one line is chosen from what the reply says in fields, never from the model's sentence when the map draws the answer: a refusal's lines, an offer's question, a failure, `noPlan` lines, the answer's note, a step not done, a Lookup's line that is no place or time. An answer that draws nothing shows the model's text, folded to one line. A tap opens the whole text in the raised card; the raised card is the only place long text is read.
- Main button words: a Plan with Friends "만들고 초대 보내기", a Plan alone "일정에 넣기", a new recruiting Quest "만들고 모집하기", a Proposal "만들기" or "만들고 초대 보내기" when it invites, a booking "예약하기". The words come from what the button already does; no press does anything new.

### Earlier questions

- The app keeps every conversation of the session in memory: "새 대화" moves the current conversation into the kept list and starts an empty one. Nothing is deleted, so the 되돌리기 toast goes. Whether conversations survive a restart is not decided and stays as today (they do not).
- The pill shows the number of turns of the conversation on screen. Its list shows, latest first, each turn of every kept conversation: the time it was asked, the question, and its outcome in a few words (the Plan's place and start, "초대 2명 보냄", "7233번 · 14:00–16:30 예약함", "아직 만들지 않음"). The first row is "새 대화".
- A tap on a row of the current conversation shows that turn's answer on the map as it was replied; the next message continues from the latest turn, as today. A tap on a row of an earlier conversation makes that conversation the current one.
- The map screen's "이전 답" button gives way to the chip "이어서 · <last question> ▾" above the input, which opens the list, and a "새 대화" button beside the input.

### Closing

- The card's handle keeps its two heights and gains a third move: dragged down past the lowered height by more than half the card, it closes the answer as ✕ does. While it is dragged, the pill and the bar fade and a hint says "놓으면 지도 화면으로 돌아가요". Let go above that point, it goes back.

## Testing Decisions

- Tests start the main screen with the mock API, send a message, and read what the screen shows by role, label, and text, as `answer-frame*.integration.test.tsx` do today. They assert what a User sees and presses (the bar's words, a flag's card's rows, the button's words, the line above the input), never a component's props.
- Pure helpers (the day words, the folded bar's merged busy stretches, the one line's choice, a card's scene) get unit tests of their own.
- Map marks are read from the map's markers as the existing answer tests read them (`answer-camera-kept`, `answer-correct-people`).
- Each ticket that changes a screen is checked once on the Android emulator with the mock build, and its screens go into its pull request.
- Prior art: `answer-band-move`, `answer-correct-people`, `answer-raise`, `answer-conversation-kept`, `answer-unseen-and-undo`, `answer-frame-proposal-card`, `answer-frame-library`, `answer-frame-restaurant-card`.

## Out of Scope

- Errors in what the answers say: hours that differ between answers, a request dropped without a word, numbers such as "식사 210분", lunch suggested at 4 a.m. They are handled with the answers themselves. So is an evaluation measure that the model's text does not repeat the map.
- Whether conversations survive an app restart.
- Changing the time by dragging the bar beyond what the band does today; spoken changes ("3시로") stay the way.
- A dragged time that makes someone late, drawn on the map.
- Changing the title, visibility, or size of the Quest a Plan makes before "만들고 초대 보내기": the main server's request takes none of them. The flag's card shows them; they can be changed on the Quest once made.
- Routes drawn as straight lines, loops, or off campus, and the start building that changes between answers: map drawing errors handled elsewhere.

## Further Notes

- Boards: the design record of 2026-11-21 holds boards 1 to 19. Boards 13 (the next day, step ① due) assumes the conversation is still there on the next day; with conversations lost on restart it shows only while the app kept running.
- P03 (several requests in one message) gives the steps from the main server and lists them in today's card; ticket 09 replaces that list with flags and spans and keeps P03's data unchanged.
- Native files are not touched by any ticket; every change reaches phones by an app update.

## Tickets

In build order; each keeps the answer screen whole. Tickets 13 and 14 came from the phone screens of tickets 01 to 04 and follow 05; 15 follows 13.

1. [01 — The time bar under the pill](issues/01-time-bar-on-top.md)
2. [02 — The place's flag says what and when, and opens a card](issues/02-flag-says-what-and-when.md)
3. [03 — Faces and my start do what the chips do](issues/03-faces-and-start-on-the-map.md)
4. [04 — A Plan's bottom holds the input and a button that says what happens](issues/04-plan-bottom-without-text.md)
5. [05 — Lookups, refusals, and words take the same bottom](issues/05-lookups-and-words-one-line.md)
6. [06 — A Proposal stands on the map](issues/06-proposal-on-the-map.md)
7. [07 — A 관정도서관 booking stands on the map](issues/07-booking-on-the-map.md)
8. [08 — Asked facts are read in full on their mark](issues/08-asked-facts-on-the-mark.md)
9. [09 — Several requests as numbered flags and spans](issues/09-steps-as-numbered-flags.md)
10. [10 — Earlier questions in the pill, and a new conversation that forgets nothing](issues/10-earlier-questions-in-the-pill.md)
11. [11 — The map screen says what it continues, and starts anew at one press](issues/11-map-screen-continues.md)
12. [12 — Dragging the bottom down closes the answer](issues/12-drag-down-closes.md)
13. [13 — Our own marks recede while an answer is up](issues/13-our-marks-recede.md)
14. [14 — The bar, the flag, and the face card as the boards draw them](issues/14-bar-flag-face-as-drawn.md)
15. [15 — 메뉴 모두 보기, every candidate's dishes in one list](issues/15-all-menus-list.md)
