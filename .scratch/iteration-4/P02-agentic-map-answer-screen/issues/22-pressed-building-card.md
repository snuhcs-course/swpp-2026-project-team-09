# 22: A pressed building is asked about: the minutes there, the minutes I can stay, and what is there now

Parent: [P02 spec](../spec.md); the design's row 6, "지도에서 묻기" (scene AmAsk), boards a0, a1, a2, a3, a14, notes (8) and (11); design section 5 ("Tapping a building"), question 7
Status: ready-for-agent
Blocked by: package A's tap endpoint, its Place half (row-6-seams, ticket 22); PR 270 (the answer screen draws a Lookup) on `4.0/Main`; 18 (the Friend card the Friend line opens); 19 (the frame of a pressed thing, if 18 has not made it)

## What to build

- **The press.** With the switch on, a tap on the everyday map that lands on no marker and no face is a press on the ground: the tutorial's touch watcher (`screens/main/tutorial/use-map-tap.ts`, whose `keep` lets a marker's press win) gives the tap's point, the camera at rest and the view's size turn it into a position (`map/projection.ts`), and `GET /places/at` gives the Place it is inside or near. Where there is none, nothing happens. A layer pin on a building takes its own press and opens today's card. No native file changes (row 6's decision P1).
- **The ask.** The Place goes to the tap endpoint with the User's position, not to the chat: no model, and no count against the day's messages (row 6's decision P2). While it waits the card says "보는 중이에요"; a failure says "답을 가져오지 못했어요" with "다시 시도", as row 8 words it.
- **A card of the everyday map**, as a Friend's (18, 21) and the User's own (19) are, not a frame with a pill: the main screen's selection holds it, so one card is open at a time. The Place is marked in a selected look, as a thing's mark is while its card is open. The camera does not move, and every Friend's face stays.
- **The card** draws the reply's `card`: the title and the subtitle ("학생회관", "63동"), the fact lines with their icons in the reply's order, the first in bold, the note in the Quest colour when there is one, the read-only chips with "근거" and the basis, and the buttons: each `plan` action by its label, then `guide` as "가는 길". Only what the reply gives is drawn (note (11)).
- **A Friend's line** (a fact with a `userId`) ends with "›" and opens that Friend's card (18), as a press on the face does.
- **The buttons.** A `plan` action sends its input to the recalculation (`POST /assistant/answers`), and the answer it gets opens in the answer frame, whose pill reads "{title} · {label}" ("학생회관 · 여기서 먹기"), as a5's pill reads "민수 · 만나고 싶다". `guide` starts today's route guidance, as a card's "길찾기" does.
- **Words** typed in the map's input while the card is open go to the Assistant with `tapped: { kind: 'place', placeId }` in the request context (today always null, `screens/main/chat-sheet.tsx` `contextAt`), so that "민수도 같이" plans a meal there (`[Tapped: place …]`, `assistant/gathering/plan-tools.ts:166`); the reply opens in the answer frame.
- **Presses under the card.** Another building or a face asks about that instead. During a Plan a building press is ticket 26's; under a received invitation's or a made Quest's card nothing takes a press (holds).
- **A Friend's card** (18), the tap endpoint's Friend half (row 6's decision D11): with the switch on it asks `POST /assistant/taps` for the Friend, and the reply's fact lines stand in place of the status lines the app holds once they come; the app's lines stay while it is asked and after a failure.

## Acceptance criteria

- [ ] **a1**, Tue 12:10, the User at 301동, next Class 13:00 in 24동: 학생회관 (63동) reads "걸어서 15분 · 12:25 도착", "13:00 수업 전까지 34분 머물 수 있어요", "학생회관식당 · 오늘 {the menu's main dish}", the note "점심시간이에요. 여기서 드실래요?", the chips "301동에서" and "13:00 수업까지", the basis "301동에서 학생회관까지 걸어서 15분" and "셔틀은 정류장까지 2분, 타는 데 12분이라 걸어요", and "여기서 먹기" and "가는 길".
- [ ] **a3**: 39동 (대학원연구동) reads "걸어서 8분 · 12:18 도착" and "13:00 수업 전까지 33분 머물 수 있어요", with "가는 길" alone.
- [ ] **a14**: 302동 (제2공학관) reads "걸어서 3분 · 12:13 도착", "13:00 수업 전까지 30분 머물 수 있어요", "302동식당 · 오늘 {the menu's main dish}", and "민수가 여기 있어요 · 수업 중 12:15까지 ›", whose press opens 민수's card; "여기서 먹기" and "가는 길".
- [ ] **a2**, Fri 13:50, the User at 24동, next Class 15:30 in 301동: 문화관 (73동) reads "걸어서 4분 · 13:54 도착", "15:30 수업 전까지 78분 머물 수 있어요", "채용박람회 · 17:00까지 열려요", and "기업 설명회 · 16:00–17:00"; "행사 보기", "같이 갈 파티", and "가는 길". "행사 보기" and "같이 갈 파티" are drawn only once row 4's answers are drawn in the frame (note (11)).
- [ ] "여기서 먹기" sends its meal input and shows the User's lunch at that Restaurant (row 1 board s2); "행사 보기" sends its `events` input; "같이 갈 파티" its `quests` input; each request's body is checked.
- [ ] **The press**: a tap on a marker, a face, or the dot, a pan, and a pinch are no building press; a tap where no Place is does nothing; a tap on a building under a layer pin's pin opens the pin's card, and elsewhere on the building the building's card. With the switch off nothing of this happens.
- [ ] Words sent while the card is open carry `tapped` with the Place's id; the reply opens in the answer frame, which the card gives way to.
- [ ] ✕ and Android's back close the card; a press on another building or a face replaces it; the camera does not move and every face stays.
- [ ] A Friend's card with the switch on draws the fact lines of the Friend's tap in place of the app's status lines, keeps the app's lines while it is asked and after a failure, and asks nothing with the switch off.
- [ ] The mock answers each board with a copy of the main server's real reply for it.
- [ ] Unit tests of the point-to-position function, with boundaries: the view's centre, a corner, and two zooms. Integration tests at the main screen over the fake main server for each board, each button down to its request, the Friend line, and the words with `tapped`.
- [ ] The screen is run on an Android emulator: a press on 학생회관 and on 302동, and a press on a building that holds a layer pin; the pull request carries the pictures.
- [ ] Each changed source file has its AI-generated row; lint, format, and type checks pass; and no native file of the app changed.

## Comments

- Boards a0 (what takes a press), a1, a2, a3, a14; note (8) (a Friend in the building is one line; a Friend seen through the Timetable only is listed only during the Class and 15 minutes after) and note (11) (only buttons whose screen exists).
- Row 6's decisions P1 (the press in JavaScript) and P2 (a model-free endpoint), agreed by the orchestrator on 2026-11-15, and D3 (when the suggestion shows) hold here; each can be vetoed.
- "가는 길" is the boards' word for `guide`; 270's Lookup card says "길 안내".
- The words of the card and its rules are the server's (row-6-seams, ticket 22); the app adds none.

### Decisions (2026-11-15)

1. **The pressed building's card is a card of the everyday map**, for consistency with tickets 18, 19, and 21, not a frame with a pill. The main screen's selection holds the Place (`useSelection`'s `place` and `selectPlace`), so one card is open at a time: a face, a mark, or another building pressed replaces it, its ✕ and Android's back close it, the answer frame hides it while shown, and it closes for good once the switch is turned off. It takes the bottom as any card does. The Place is marked in the selected look an answer gives its pick, the Quest colour's dot, at the Place's point, above the other marks and taking no press; the camera does not move, and every face stays. Only the answer of a `plan` button opens the answer frame, whose pill reads "{title} · {label}".
2. **Where a tap lands.** The touch's page point is its point on the map: the main screen has no header, and the map starts at the screen's top left under the status bar. The view's size is the laid-out size of the View around the map, the window's until it is laid out, as the plain ground counts; the camera is the one the map last reported at rest. `atPoint` (`map/projection.ts`) is `inView` the other way.
3. **What counts as a press.** A tap counts `TAP_WAIT_MS` after the finger lifts, as the tutorial pin's does; any press on a mark or a face, the User's own dot and the tutorial pin included, keeps it from counting, and drops the answer of an earlier tap still on its way, as another tap does. A Place the point is near counts as one it is inside. When `GET /places/at` finds no Place or fails, nothing happens and an open card stays. Buildings take a press only on the everyday map with the switch on: not while the answer frame, a received invitation's card, or a made Quest's card is shown, and so not during a Plan (ticket 26's).
4. **While it is asked**, the card's head is the Place as `GET /places/at` names it, by the server's rule for the title ("63동", its name under it); the server's title and subtitle replace them when the card comes. A failure, or a reply without a card, reads "답을 가져오지 못했어요" with "다시 시도" (the secondary button); a failure that is no refusal is asked once more before the card says so, as every query of the app is. The same building pressed again shows the card kept from before at once and asks again behind it.
5. **The buttons.** A `plan` button is drawn only for a meal: row 4's events and Quests have no screen in the frame yet (no `events` capability), so a2 reads "가는 길" alone and the criterion for "행사 보기" and "같이 갈 파티" waits for that. The first button is the main one, the rest secondary. While a `plan` is asked its buttons are disabled; its answer opens the frame as a turn whose words ("63동 · 여기서 먹기", the server's title) and answer are never sent to the Assistant (`ChatBubble.recalculated`, `Chat.addRecalculated`); words typed after it carry its conditions, as after any answer. A failure says "답을 가져오지 못했어요. 잠시 후 다시 시도해 주세요" in a toast and keeps the card; an answer that comes after the card closed or gave way is dropped. The frame's ✕ returns to the building's card, which the selection still holds.
6. **"가는 길"** asks the route guidance with the `guide` action's label and point, as a card's "길찾기" does, and closes the card once it started.
7. **A Friend's line** selects that Friend's card on the everyday map (`cardId.friend`). A Friend the map does not show opens nothing until ticket 21's selection of a Friend without a position is on `4.0/Main`.
8. **`tapped`** is the selected Place, given to the chat sheet's request context (`setTapped`) while the card is selected, also while the answer frame stands over it, so that follow-ups and "다시 시도" send it as the first words did. A Friend's card sends no `tapped`; the ticket asks only for a Place.
9. **The Friend half (row 6's D11).** `Card`'s lines ask `POST /assistant/taps` for a Friend's card while the switch is on, on the everyday map and over the answer frame alike (`useFriendFacts`). Once the facts come they stand in place of `card.lines` (the status and the walk); "어디까지 보이나", the Friend ID, and the date stay. While it is asked and after a failure the app's lines stay; with the switch off nothing is asked. The facts are drawn as the building card's are, without "›".
10. **The location** a tap sends is the User's position while it is on campus, null otherwise, as a recalculation sends it.
11. **The mock** is package A's as it is: its Places carry other ids than the stored cards, so on the mock every building answers 63동's card (a1), by P01-17's rule.
12. **The test of "여기서 먹기"** answers with the stored answer of the User alone, given the button's input: no stored answer is of a lunch fixed at 63동. Its request body is checked against a1's action; "the User's lunch at that Restaurant" is not checked with a real reply.
13. **The Friend half's tests**: the request and the facts over the fake main server, which gives no Friend a status of the app's; the facts standing in place of the app's status and way over the mock, whose 김민준 has both and is answered with the main server's card of him.

### Checked on an emulator (2026-11-16)

On the Android emulator (1080 × 2400, density 2.625), a development build on the mock with its campus walk, the switch on:

- A press on 학생회관 opened its card as board a1 reads: "63동 / 학생회관", "걸어서 15분 · 12:25 도착", "13:00 수업 전까지 34분 머물 수 있어요", "학생회관식당 · 오늘 순두부찌개", the note "점심시간이에요. 여기서 드실래요?", the chips "301동에서" and "13:00 수업까지" with "근거", and "여기서 먹기" and "가는 길". The Place's mark stood at 63동, and the camera did not move.
- A press on 302동 showed "302동 / 제2공학관 / 보는 중이에요" while it was asked, then 63동's card, as the mock answers every building (decision 11).
- "여기서 먹기" opened the answer frame with the pill "63동 · 여기서 먹기" and the mock's stored answer of the User alone (decision 12); the frame's ✕ returned to the building's card, and the card's ✕ and Android's back closed it.
- With the 식당 layer on, a press on its pin at 302동 opened 302동식당's card, and a press on 302동 beside the pin opened the building's card in its place.

### Agent usage (2026-11-16)

One session with three subagents for this ticket (the implementation, a review with first-path safety first, and the merge with Main with the review's nits); the session's own time counted is the emulator check and the second merge with Main.

- Agent time: about 184 minutes, an estimate from the transcripts' timestamps (the union of the main session's and the subagents' active stretches, gaps of five minutes or more left out).
- Tokens: output 354,194; input 140,937,850, of which 139,206,807 were cache reads, 1,730,059 cache writes, and 984 uncached. Without cache reads: 2,085,237.
