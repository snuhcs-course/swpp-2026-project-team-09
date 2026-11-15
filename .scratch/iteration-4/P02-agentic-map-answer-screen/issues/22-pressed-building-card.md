# 22: A pressed building is asked about: the minutes there, the minutes I can stay, and what is there now

Parent: [P02 spec](../spec.md); the design's row 6, "지도에서 묻기" (scene AmAsk), boards a0, a1, a2, a3, a14, notes (8) and (11); design section 5 ("Tapping a building"), question 7
Status: ready-for-agent
Blocked by: package A's tap endpoint, its Place half (row-6-seams, ticket 22); PR 270 (the answer screen draws a Lookup) on `4.0/Main`; 18 (the Friend card the Friend line opens); 19 (the frame of a pressed thing, if 18 has not made it)

## What to build

- **The press.** With the switch on, a tap on the everyday map that lands on no marker and no face is a press on the ground: the tutorial's touch watcher (`screens/main/tutorial/use-map-tap.ts`, whose `keep` lets a marker's press win) gives the tap's point, the camera at rest and the view's size turn it into a position (`map/projection.ts`), and `GET /places/at` gives the Place it is inside or near. Where there is none, nothing happens. A layer pin on a building takes its own press and opens today's card. No native file changes (row 6's decision P1).
- **The ask.** The Place goes to the tap endpoint with the User's position, not to the chat: no model, and no count against the day's messages (row 6's decision P2). While it waits the pill stands and the card says "보는 중이에요"; a failure says "답을 가져오지 못했어요" with "다시 시도", as row 8 words it.
- **The frame.** The pill: the pin icon and the card's title ("학생회관"), with ✕. The building highlighted: a halo in the Quest colour under the Place's point, a picture as the other looks are. The camera does not move, and every Friend's face stays.
- **The card** draws the reply's `card`: the title and the subtitle ("학생회관", "63동"), the fact lines with their icons in the reply's order, the first in bold, the note in the Quest colour when there is one, the read-only chips with "근거" and the basis, and the buttons: each `plan` action by its label, then `guide` as "가는 길". Only what the reply gives is drawn (note (11)).
- **A Friend's line** (a fact with a `userId`) ends with "›" and opens that Friend's card (18), as a press on the face does.
- **The buttons.** A `plan` action sends its input to the recalculation (`POST /assistant/answers`), and the answer it gets is shown in the frame with the pill "{title} · {label}" ("학생회관 · 여기서 먹기"), as a5's pill reads "민수 · 만나고 싶다". `guide` starts today's route guidance, as 270's "길 안내" does.
- **Words** typed in the card go to the Assistant with `tapped: { kind: 'place', placeId }` in the request context (today always null, `screens/main/chat-sheet.tsx` `contextAt`), so that "민수도 같이" plans a meal there (`[Tapped: place …]`, `assistant/gathering/plan-tools.ts:166`).
- **Presses under the card.** Another building or a face asks about that instead. During a Plan a building press is ticket 26's; under a received invitation's or a made Quest's card nothing takes a press (holds).

## Acceptance criteria

- [ ] **a1**, Tue 12:10, the User at 301동, next Class 13:00 in 24동: 학생회관 (63동) reads "걸어서 15분 · 12:25 도착", "13:00 수업 전까지 34분 머물 수 있어요", "학생회관식당 · 오늘 {the menu's main dish}", the note "점심시간이에요. 여기서 드실래요?", the chips "301동에서" and "13:00 수업까지", the basis "301동에서 학생회관까지 걸어서 15분" and "셔틀은 정류장까지 2분, 타는 데 12분이라 걸어요", and "여기서 먹기" and "가는 길".
- [ ] **a3**: 39동 (대학원연구동) reads "걸어서 8분 · 12:18 도착" and "13:00 수업 전까지 33분 머물 수 있어요", with "가는 길" alone.
- [ ] **a14**: 302동 (제2공학관) reads "걸어서 3분 · 12:13 도착", "13:00 수업 전까지 30분 머물 수 있어요", "302동식당 · 오늘 {the menu's main dish}", and "민수가 여기 있어요 · 수업 중 12:15까지 ›", whose press opens 민수's card; "여기서 먹기" and "가는 길".
- [ ] **a2**, Fri 13:50, the User at 24동, next Class 15:30 in 301동: 문화관 (73동) reads "걸어서 4분 · 13:54 도착", "15:30 수업 전까지 78분 머물 수 있어요", "채용박람회 · 17:00까지 열려요", and "기업 설명회 · 16:00–17:00"; "행사 보기", "같이 갈 파티", and "가는 길". "행사 보기" and "같이 갈 파티" are drawn only once row 4's answers are drawn in the frame (note (11)).
- [ ] "여기서 먹기" sends its meal input and shows the User's lunch at that Restaurant (row 1 board s2); "행사 보기" sends its `events` input; "같이 갈 파티" its `quests` input; each request's body is checked.
- [ ] **The press**: a tap on a marker, a face, or the dot, a pan, and a pinch are no building press; a tap where no Place is does nothing; a tap on a building under a layer pin's pin opens the pin's card, and elsewhere on the building the building's card. With the switch off nothing of this happens.
- [ ] Words sent from the card carry `tapped` with the Place's id; the reply replaces the card.
- [ ] ✕ and Android's back return to the everyday map; a press on another building or a face replaces the card.
- [ ] The mock answers each board with a copy of the main server's real reply for it.
- [ ] Unit tests of the point-to-position function, with boundaries: the view's centre, a corner, and two zooms. Integration tests at the main screen over the fake main server for each board, each button down to its request, the Friend line, and the words with `tapped`.
- [ ] The screen is run on an Android emulator: a press on 학생회관 and on 302동, and a press on a building that holds a layer pin; the pull request carries the pictures.
- [ ] Each changed source file has its AI-generated row; lint, format, and type checks pass; and no native file of the app changed.

## Comments

- Boards a0 (what takes a press), a1, a2, a3, a14; note (8) (a Friend in the building is one line; a Friend seen through the Timetable only is listed only during the Class and 15 minutes after) and note (11) (only buttons whose screen exists).
- Row 6's decisions P1 (the press in JavaScript) and P2 (a model-free endpoint), agreed by the orchestrator on 2026-11-15, and D3 (when the suggestion shows) hold here; each can be vetoed.
- "가는 길" is the boards' word for `guide`; 270's Lookup card says "길 안내".
- The words of the card and its rules are the server's (row-6-seams, ticket 22); the app adds none.
