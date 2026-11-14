# 02: The answer drawn on the map

Parent: [P02 spec](../spec.md) ("The answer on the map")
Status: ready-for-agent
Blocked by: 01

## What to build

A User whose phone has the switch on asks "배고파, 민수랑 같이", and the Plan the main server calculated is drawn on the map: one solid line for each person from where they set out, the picked Restaurant with its time, the flag at the Merging Point, the Place of the next Class, and the other candidates as numbered dots. The map moves so that all of it is visible between the pill and the card, and the map's usual markers give way. The card shows the Plan's two lines, opens what it rests on when "근거" is pressed, and goes through the other candidates with its arrows or with a press on a candidate's dot.

## Acceptance criteria

- [x] **The marks** of the Plan on screen follow the spec's table: the User's dot, each Friend of the Plan as a round face whose ring is dashed for a position taken from the Timetable, the picked Restaurant with its number and the time of its flag, the other candidates with the numbers of their Plans, a Restaurant that does not fit with its reason, the Place of the next Class, and the flag at the Merging Point. Each mark has a name a screen reader says.
- [x] **Where the words go** follows the spec's rule: one symbol at a point, and each label at the first free side of its kind. For the stored copy of the answer to "배고파, 민수랑 같이", third Plan: at 301동 the User's dot with "나 · 15분" at its right, "301동식당" at its left, and "12:18 민수와 만남" above it; at 302동 민수's face with "민수 · 18분" at its right and "302동식당" at its left; and at 학생회관 the picked dot with "학생회관식당" and "12:33 점심" below it.
- [x] **The lines**: one straight, solid line for each route of the scene, the User's in navy, a Friend's in the Friend colour, and the way to the next Class thinner and grey.
- [x] **What gives way** while a Plan is drawn: the markers of events, Quests, Restaurants, Study Spaces, and the shuttle, the shuttle's line, and a walking route. Friends' Avatars stay, except those of the Plan's people and those near one of the Plan's own marks, and the User's own Avatar gives way to the scene's. Closing the answer brings them back.
- [x] **The camera** fits the answer's points into what the pill and the card leave of the map, no closer than the "close" level, when the answer comes, when the Plan on screen changes, and when the card's height changes, and, when the map cannot show all of it, keeps the picked Restaurant's side in view.
- [x] **The card of a Plan**: the two lines; "근거", which opens the basis and, as "근거 접기", closes it; and "‹" and "›" with the count ("3/5") when the answer has more than one Plan. The arrows go round, and a press on a candidate's dot shows that candidate's Plan.
- [x] An answer without a Plan draws nothing on the map and keeps the everyday map under the card.
- [x] The looks of every Plan of the answer are asked for when the answer comes.
- [x] **Unit tests** for the function from an answer to its marks, on the stored copies of real answers (the answer for two people, the answer for three with a Merging Point and Restaurants that do not fit, and the answer with a fixed start), with the boundaries of the spec's Testing Decisions; and for the new looks' names.
- [x] **Integration tests** at the main screen over the fake main server: the marks and the lines of the Plan on the plain map, what gives way and comes back, the camera's fit, the arrows, a press on a candidate, and the basis.
- [x] The stored copies of four more real answers are added as the main server returned them: for the User alone, for three people, with a fixed start, and from another starting Place.
- [x] The design system's catalogue shows the new marks, and the app's README says how an answer is drawn.
- [x] The screen is run on an Android emulator with Kakao's map, and the pull request carries the screen of a Plan on the map.
- [x] Each changed source file has its AI-generated row; lint, format, type checks, and the touched tests pass; and no native file of the app changed.

## Comments

### Decisions (2026-11-14)

Details the spec left to the implementation, listed so that any of them can be vetoed.

1. **The answer on screen is held by the chat control** (`answer`, from `useShownAnswer` in `src/features/assistant/use-shown-answer.ts`), fed the conversation only while the switch is on, so that with the switch off no answer is ever on screen.
2. **A new answer is told by its object**: a reply whose answer is another object shows its first Plan with the basis closed. A press on a mark or an arrow that would show the Plan already on screen leaves the basis as it is.
3. **While a follow-up waits for its reply, the map is the everyday one**: the turn then holds no answer. Ticket 03, which sends words with the Plan on screen, may keep the earlier answer instead.
4. **Of the Avatars, those of people stay**: Friends and the other people of the User's Party, but for the people the Plan draws, by user id. The shuttle's vehicles and the User's own Avatar give way, and so does the tutorial's place pin.
5. **The camera's padding**: at the top the status bar's inset, the pill's place under it (`listsTop`) and its 48, and 56 for a label above a point; at the bottom the card's laid-out height (0 until it is laid out) and 72 for a label below a point, the picked Restaurant's two lines; 64 at each side. Each room is half the symbol box and the label.
6. **The camera fits again** when the safe area's top changes too, besides the answer, the Plan on screen, the card's height, and the stage's size.
7. **A mark without a Plan takes no press** (`passive`): the people, the pick, the next Class, the flags, and a Restaurant that does not fit, so that a press on one reaches the map.
8. **"근거" is the design system's ghost button**, and the arrows its `IconButton` with the chevrons, named "이전 후보" and "다음 후보", with the count between them.
9. **The card of a Plan replaces the lines only for the reply whose answer is on screen**; an earlier reply of the same turn with an answer, which the server does not send today, keeps ticket 01's lines.
10. **Code moved for the 300-line limit**: the main screen's press handlers (`ignorePress`, `pressWithPin`) and what the map draws (`useMapView`) to `use-map-view.ts`; `useMainMap`'s two fits share `useFit`.
11. **The camera's place is worked out before the move** (`answerCamera` in `src/features/assistant/answer-camera.ts`), from a campus map's own rules and the view's size (the stage's, with the status bar's inset), and the map is sent there in one glide. It is the fit of every point; where a campus map's lowest zoom (15.26 on a phone 411 by 914 points) is too close for all of them, the centre is moved at that zoom so that the box around the Plan's own points (its people, its pick, its next Class, and its flags) is centred in what the padding leaves or, where that box is longer than the area along an axis, its edge on the pick's side lies on the area's edge (`correctedCentre`), with a point within one point of the area counted as inside. Until the stage is laid out and the map has told its fit zoom, the map fits the points itself.
12. **The way to the next Class is drawn grey** (`color.borderStrong`, 3 wide): a solid medium blue would read as the User's own route, and the native map takes no translucent colour.
13. **The mark's symbol component is not named `Symbol`**: that name hid the global the React Compiler's output calls, and on a device no mark rendered. Jest does not run the compiler, so only the emulator showed it.
14. **A Friend's Avatar near one of the Plan's own marks gives way**: within 150 metres sideways and 120 up or down of a person, the pick, the next Class, or a flag, which is the reach of a label above or below (`nearOwnMark`). The native map draws every Avatar above every marker, and on the emulator a Friend in the User's own building covered the User's dot and the words of the Merging Point's flag. A Friend near a candidate stays. A Friend hidden this way is still listed by "＋ 같이" (ticket 03).
15. **While a Plan is drawn, a native map may go one level further out** (`nativeMinLevel` 14 in place of the campus maps' 15, a prop the map already takes). On the emulator Kakao's level 15 is zoom 15.5, closer than the lowest zoom of the camera's rules, and a Plan across the campus could not be shown whole. The everyday map keeps level 15, so nothing changes with the switch off; a pinch out past the lowest zoom while a Plan is drawn is brought back by the camera's rules.

### Checked on an emulator (2026-11-14)

A development build of this branch on an Android emulator (API 36, 1080 by 2400, Kakao's map), answering from the stored copy of a real answer, with the switch on and "배고파, 민수랑 같이" asked after a cold start:

- **The first Plan** (302동식당, at the south end of the campus): the User's dot with "나 · 3분", 민수's face with a dashed ring, the pick with "302동식당" and "12:15 점심" under it, "301동식당" with its number at the left of the User's point, the next Class's square with "13:00 수업 · 24동" and the grey line to it, and the other candidates' numbered dots, between the pill and the card. The label of the far candidate 자하연식당 2층 lies under the pill.
- **The third Plan** (학생회관식당, across the campus), whole in one view: the navy line from 301동 to 학생회관, the green line from 302동 to 301동, the flag "12:18 민수와 만남" above 301동, and the pick's label "학생회관식당" with "12:33 점심".
- **"근거"** opens the two lines of the basis; the card grows, and the map moves so that the Plan stays in view. "근거 접기" closes it.
- **A press on a candidate's dot** (3식당, number 4) shows that candidate's Plan and "4/5".
- **✕** brings the everyday map back, with its lists, its markers, its walking route, and the Friends' Avatars, and leaves the camera where it was.
- The Avatars of Friends in the User's own building and by the picked Restaurant give way while the Plan is drawn; the others stay.

What the emulator found, each fixed in this ticket: a component named `Symbol` (Decision 13), a Plan across the campus that the map could not show whole (Decisions 11 and 15), and a Friend's Avatar over the Merging Point's flag (Decision 14).

For a person to check on a phone: an answer from the real main server after a Google sign-in; the camera on a phone of another size and density (the whole Plan between the pill and the card, with the pick's label above the card); a pinch out while a Plan is drawn, which may pass the campus's lowest zoom and is then brought back; and a Friend with a live position, drawn with a solid ring.

### Agent usage (2026-11-14)

From the opening of ticket 01's pull request to the opening of this one. One session with five subagents for this ticket (the marks' function, the wiring into the screen, two reviewers, and the reviews' fixes). The session's own time in that stretch also holds the fixes of ticket 01's CI, the writing of ticket 04, and the preparation and the review of ticket 03, which ran alongside.

- Agent time: about 163 minutes, an estimate from the transcripts' timestamps (the union of the main session's and the subagents' active stretches, gaps of five minutes or more left out).
- Tokens: output 571,694; input 194,540,646, of which 192,900,692 were cache reads, 1,638,810 cache writes, and 1,144 uncached. Without cache reads: 2,211,648.
