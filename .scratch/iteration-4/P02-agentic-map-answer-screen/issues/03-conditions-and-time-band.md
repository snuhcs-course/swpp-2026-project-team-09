# 03: Correcting the answer: the chips, the Friends, the time band, and words

Parent: [P02 spec](../spec.md) ("Correcting the answer", "What the changes to a `PlanInput` are")
Status: ready-for-agent
Blocked by: 02

## What to build

A User looking at a Plan corrects it where it is shown. The card's chips say the conditions the answer used. The ✕ on a Friend's chip takes the Friend out; "＋ 같이" lists the other Friends in the card, and a press on one, or on a Friend's face on the map, adds them; the chip of where the User sets out from opens the map view of 장소 선택. The time band shows everyone's busy stretches and the Plan's band with a handle at each end, and letting go of a dragged handle fixes that bound. Each of these sends the changed conditions to the recalculation endpoint, which answers without the language model, and the map and the card are drawn again. After a drag, the band's old place stays as a dashed outline, and "되돌리기" goes back. Words typed in the card go to the Assistant with the Plan on screen as their context.

## Acceptance criteria

- [x] **The chips** of the answer are shown in the card's first row, with "근거" at its right, and "＋ 같이" after them.
- [x] **Taking a Friend out.** The ✕ on a person's chip sends the conditions without that person, and the answer that comes back replaces the one on screen: the map, the card, and the chips.
- [x] **Adding a Friend.** "＋ 같이" shows, in the card, the User's Friends who are not in the Plan, each with the line the Friend list shows, one whose position is not known included, and a way to close the list. A press on a Friend, or on a Friend's Avatar on the map while a Plan is shown, sends the conditions with that Friend added, without constraints.
- [x] **Where the User sets out from.** The chip opens the map view of 장소 선택. A Place chosen there is sent as the User's own `from` constraint, in place of an earlier one; a point that is no Place sends nothing and shows a toast.
- [x] **The chip of the time** puts the focus on the band's end handle and opens nothing.
- [x] **The time band** draws, from the Plan's band: a lane for each person with their busy stretches, the line of now, the band with a handle at each end, the two ends of the range, and the band's words.
- [x] **A drag.** A handle moves in steps of five minutes, inside the range, and no nearer than 15 minutes to the other handle. Letting go of the start handle sends its time as the window's `from`, and of the end handle as the window's `until`, with the other bound as the conditions hold it. Each handle is also an adjustable control, five minutes a step.
- [x] **While a recalculation is on its way** the band stays where it was dropped, and the chips, the handles, and the arrows take no press.
- [x] **After a drag** the band's place before it is drawn as a dashed outline, which stays on the band of whichever Plan is on screen, through the arrows, and "되돌리기" brings back the answer shown before the drag without a request. Another change of the conditions drops the outline.
- [x] A busy stretch is drawn in the warning colour where it overlaps the window the User fixed, a bound the User did not fix counting as the Plan's own.
- [x] **Which Plan is shown** after a recalculation: after a drag, the one with the same id when the new answer has it, otherwise the first; after any other change, the first. An answer without a Plan shows its lines, keeps the chips, and keeps "되돌리기" after a drag.
- [x] **A failed recalculation** shows a toast and leaves the answer on screen as it was.
- [x] **Words.** A message sent while a Plan is on screen carries the conditions and the Plan's id in the request context. The reply's answer replaces the one on screen.
- [x] **The mock client** answers a recalculation from the stored copies of real answers: the answer for the User alone when only the User is in the conditions, the answer for three people when three or more are, the answer with a fixed start when the window's start is fixed, the answer from another starting Place for the User's own start, and otherwise the first copy; each with the conditions it was given.
- [x] **Unit tests** for the changes to the conditions and for the band's arithmetic, with the boundaries of the spec's Testing Decisions, and for the mock's choice of a copy.
- [x] **Integration tests** at the main screen over the fake main server, each down to the body of the request: a Friend taken out, a Friend added from the list and from the map, the chosen Place, each handle, "되돌리기", the chip of the time, a failed recalculation, an answer without a Plan, and words with the Plan's context.
- [x] The app's README says how an answer is corrected.
- [x] The screen is run on an Android emulator with Kakao's map, and the pull request carries the screens of the chips, the time band, and a recalculated Plan.
- [x] Each changed source file has its AI-generated row; lint, format, type checks, and the touched tests pass; and no native file of the app changed.

## Comments

### Decisions (2026-11-14)

Details the spec left to the implementation, listed so that any of them can be vetoed.

1. **The answer on screen stays while a follow-up waits for its reply or has failed**: it is the answer of the conversation's last reply, and a failure and the app's own bubble are no reply. So the Plan stays on the map while the Assistant works, and "다시 시도" sends the same context as the first try. A reply without an answer, or ✕, leaves none.
2. **The hook keeps the reply's own answer (`source`) apart from the one on screen**, and tells a new reply by its bubble's id, not by its answer's object, which the mock or a cache may give again. A new reply replaces everything; the frame's card is drawn for the bubble whose answer is the source.
3. **A late recalculation is told by an epoch** that counts the replies: an answer or a failure that comes after a new reply, or after the conversation was forgotten, is dropped, and no toast is shown for it.
4. **The failure's toast is given to the hook** (`useShownAnswer(bubbles, { location, onFailed })`), which the chat control fills with `useToast`, so that the hook needs no toast provider.
5. **The outline of a drag is kept when the drag's answer comes**, as the band of the Plan shown just before it; a failed drag adds none and keeps the one there.
6. **"되돌리기" takes no press while a recalculation is on its way**, and it closes the basis.
7. **An answer without a Plan draws no "근거"**: it has no basis to open, so the card gives `ConditionChips` no `onBasis` (null), and the row holds the chips and "＋ 같이" alone.
8. **The time chip draws the end handle in focus for two seconds**, a press anew starting the two seconds again; the screen reader's focus is not moved. It closes the list of Friends, in whose place the band is drawn.
9. **The Friends of "＋ 같이" are those `useFriends` gives**, so the list is empty, "더 넣을 친구가 없어요", while they load or fail.
10. **A press on the map adds a Friend when the marker id is a Friend's** (`friendIdOf` of the map's adapter) and the conditions do not hold that user; it goes through the same `change`, which ignores it while a recalculation is on its way.
11. **The arrows are the answer card's own round buttons** (Decision 18), so the design system's `IconButton` stays as it was.
12. **A handle takes a touch 44 wide** (14 of `hitSlop` at each side of its 16), and its pan begins after 10 points sideways and fails after 10 points up or down.
13. **The request context reads the answer on screen from a ref** that is set after each render, so that a message sent after a recalculation carries the recalculated conditions.
14. **The mock chooses a copy by the first rule that holds**: only the asker, the copy for the User alone; three or more people, the copy for three; a fixed start (`window.from` not null), the fixed-start copy; the first person's own `from`, the copy from another starting Place; otherwise the first copy. A window that fixes only its end takes no copy of its own.
15. **Which Plan is shown after a recalculation**: after a drag (a change made with `'drag'`) the Plan with the same id stays when the new answer has it, otherwise the first, since the User moved the time of the Plan they look at; after any other change (a person out or in, the origin) the first Plan of the new answer, since who eats or where from changed the order of the Plans. So taking 민수 out shows 301동식당, the first Plan of the answer for the User alone.
16. **`change` takes what to do to the conditions** (`change(alter, by?)`) and applies it, when it is called, to the answer on screen then, in that moment's epoch: a control may call the `change` of an earlier render, as the origin chip does after 장소 선택. Without an answer on screen, or when `alter` gives the same conditions back (a Friend's Avatar pressed whom the conditions hold), it sends nothing.
17. **A handle with no step left in the direction asked stays at its own time**, which sends nothing: for a band off the five-minute steps the nearest step that keeps 15 minutes to the other handle can lie behind the handle.
18. **The arrows stand at the two ends of the card's last row as round buttons, and a swipe over the answer's lines goes through the Plans**, since the User found the small arrows in the middle hard to press: "화살표 UI가 조금 마음에 안드네. swipe로 가능하게 하거나 좀 화살표를 누르기 쉽게 하거나". Each arrow is 44 across on the sunken surface and dims to 0.85 when pressed; between them stand "되돌리기" while a drag is kept and the count. The swipe (`plan-swipe`) begins after 10 points sideways, fails after 10 up or down, and counts from 48; it takes nothing while a recalculation is on its way or for an answer of fewer than two Plans. The chips' row and the time band are outside it.
19. **The camera's room above and below follows the marks** (`roomsOf`), in place of ticket 02's fixed 56 and 72 (its Decision 5): this ticket's card is about 100 points taller, and a Plan across the campus no longer fitted on a phone. A mark needs half the symbol box, 18, on each side of its point, and with a label on that side the gap of 2 and the label, 26 for one line and 46 for two (the pick's title, its line, the paddings, and its border); a mark south of the top-most point needs a point less above for each 4.5 metres, and the same north of the bottom-most; each room is at least 24. The top-most and the bottom-most are those of every point the camera fits, the routes' ends included.

### Checked on an emulator (2026-11-15)

A development build on an Android emulator (API 36, 1080 by 2400, Kakao's map), answering from the stored copies of real answers, with the switch on and "배고파, 민수랑 같이" asked:

- **The card**: the chips "301동에서", "13:00 수업까지", "민수" with its ✕, "＋ 같이", and "근거" at the row's right; the Plan's two lines; a lane for 나 and one for 민수 with their busy stretches, the line of now, the band from 12:15 to 12:43 with a handle at each end, "11:30" and "13:30", and "12:15–12:43 · 식사 28분"; the arrows as round buttons at the row's two ends with "1/5" between them.
- **A swipe** to the left over the lines shows "12:18 301동식당" and "2/5", and one to the right goes back.
- **"＋ 같이"** lists the mock's twelve Friends with their lines ("김민준 · 공강 · 중앙도서관", "서지우 · 위치 꺼짐") in place of the band and the arrows; the card grows, and the map keeps the picked Restaurant's side in view.
- **A drag** of the start handle by ten minutes brings the answer for a fixed start ("12:40 학생회관식당", "식사 19분", "1/2"): the band stands at 12:40 to 12:59 with the dashed outline of 12:15 to 12:43 behind it, and "되돌리기" brings back "12:15 302동식당" and "1/5".
- **"민수 빼기"** brings the answer for the User alone at its first Plan ("301동식당 · 식사 55분", "12:45엔 나서야 해요"), with one lane and no chip of 민수.
- **The origin chip** opens 장소 선택's map view. A point inside a Place (학생회관) recalculates, and the chip reads "63동에서"; a point near one shows "건물을 골라 주세요" above the card and changes nothing.
- **The third Plan under this taller card** shows whole between the pill and the card, 민수's face and the flag "12:18 민수와 만남" included.

Not tried on the emulator, and covered by tests: the time chip's focus, a press on a Friend's Avatar, words with the Plan's context (the mock answers them without an answer), a recalculation that waits or fails (the mock answers at once), and the warning colour of a busy stretch.

For a person to check on a phone: a drag of each handle with a finger (the emulator was driven through adb); the card scrolling up and down over the band; a recalculation against the real main server after a Google sign-in, where the Plans answer the changed conditions (the stored copies do not); and words typed with the phone's keyboard up.

### Agent usage (2026-11-15)

From the opening of ticket 02's pull request to the opening of this one. One session with six subagents for this ticket (the band's arithmetic and the three components built ahead, the wiring into the screen, two reviewers, the reviews' fixes, and the arrows, the swipe, and the camera's room). The session's own time in that stretch also holds the merges of the iteration branch into ticket 02's pull request and the reading for the next tickets; the preparation and the first review of this ticket are counted with ticket 02.

- Agent time: about 195 minutes, an estimate from the transcripts' timestamps (the union of the main session's and the subagents' active stretches, gaps of five minutes or more left out).
- Tokens: output 412,575; input 161,074,861, of which 159,062,082 were cache reads, 2,011,673 cache writes, and 1,106 uncached. Without cache reads: 2,425,354.
