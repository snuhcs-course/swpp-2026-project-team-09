# 15: A refusal over what is on screen keeps it and answers the part it can

Parent: [P02 spec](../spec.md); the design's row 8, boards n4, n8b, n20, n21, principle 2
Status: ready-for-agent
Blocked by: ticket 10; #265 (P02-09 changes `use-shown-answer.ts` and `plan-card.tsx`); P01 ticket 11 (the answer screen draws a Lookup) and #258 (the Friend Lookup)

## What to build

- **n4, a Friend's course and room.** The Friend Lookup answers what can be seen, and the refusal's line comes first: "과목과 강의실은 보이지 않아요" / "**12:15**에 302동에서 수업이 끝나요", chip "민수 · 시간표", buttons "만나고 싶다" (main) and "닫기".
- **n20, another library's room.** The way Lookup to 신양 with the refusal "앱이 예약하는 곳은 관정뿐이에요" / "신양은 그곳의 방식으로 예약해요" and "관정 스터디룸" (main), "닫기".
- **n21, the shuttle not running.** The way Lookup's lines "셔틀은 지금 다니지 않아요 (평일 8–21시)" / "기숙사까지 걸어서 **11분**이에요", flag "{도착} 도착 · {건물}", and "닫기".
- **n8b, accepting for a Friend.** A refusal while a party is on screen keeps the party's card and puts "수락은 {민수}가 직접 해요" / "답이 없어도 **12:33**에 가면 돼요" in its lines.

## Acceptance criteria

- [x] A reply with a refusal and a Lookup draws the Lookup with the refusal's lines in place of its own.
- [x] A reply with only a refusal while a Plan or a party is shown keeps it on screen (P02 ticket 03's rule changes for this case only).
- [x] Tests on both sides; the real server's replies kept as the app's mock copies.
- [x] Each changed source file has its AI-generated row; lint, format, and type checks pass; no native file changed.

## Comments

- n21's first line: `lookup/shuttle-lookup.ts` already writes "셔틀은 지금 다니지 않아요 (평일 8–21시)" in a way's basis outside service hours, and the two answers use the same words (decision 5).
- Not built, with the reason: n20's card values ("그룹스터디실 · 9:00–21:00", "공과대학 학생만") have no data behind them (principle 1); n8b's "카톡으로도 보내기" (sharing an invitation link) is out of P02's scope.

### Decisions (2026-11-15)

1. **Three kinds join the table** (`refusals/refusals.ts`): `course-and-room` ("과목과 강의실은 보이지 않아요" / what is seen of the Class, offer "만나고 싶다"), `other-library` ("앱이 예약하는 곳은 관정뿐이에요" / "{도서관}은 그곳의 방식으로 예약해요", offer "관정 스터디룸"), and `for-someone-else` ("수락은 {민수}가 직접 해요", no offer). The first and the last take the Friend's `userId`, as the other Friend kinds do; `other-library` takes the library's `placeId` from resolvePlace or the tapped Place, and names it by the Place's name.
2. **Beside a Lookup.** `BESIDE_LOOKUP` (`refusal.dto.ts`) names the Lookup each kind stands beside: `course-and-room` the Friend's, `other-library` the way's. `refuse` answers "not shown" only beside an answer or another kind of Lookup, and `keptRefusal` keeps such a refusal beside its Lookup whichever tool ran first, so the model may call them in either order or in one step. Every other refusal is still dropped beside an answer or a Lookup, as ticket 10 built.
3. **n4's second line and chip come from the Friend Lookup** (`lookup/friend-lookup.ts`). `friendAnswer` also gives `unseen`: "**12:15**에 302동에서 수업이 끝나요" while a Class with a Place goes on, at any level, since the Timetable's building and end are what every Friend sees; else the Lookup's first line. `refuse` reads it through `friendLookup`, so the words do not depend on whether findFriend ran. The chip "민수 · 시간표" is `withTimetableChip`, which the reply applies (`lookupBeside`, one line in `adapter.ts`) to a Friend Lookup beside a `course-and-room` refusal when the map shows the Friend through the Timetable only (drawn dashed or not drawn). P01's other words stay, the map's tag among them ("민수 · 수업 중 12:15까지"; the board has "민수 · 12:15 302동 수업 끝").
4. **The card beside a Lookup** (`answer/lookup-card.tsx`) shows the refusal's lines in place of the Lookup's, and the refusal's first offer as the main button in place of "길 안내", then "닫기". n4's "만나고 싶다" is the refusal's ask offer ("민수랑 만나고 싶어"), as in ticket 10's n6: the card draws no `meet` action yet (P01 ticket 11).
5. **n21's words.** findWay takes `about: 'shuttle'`, which `WAY_RULES` tell the model to give for a question about the shuttle to a Place or to the next Class; `WayArgs` carries it. When the shuttle is not running and nothing is due, the lines are "셔틀은 지금 다니지 않아요 (평일 8–21시)" (`NOT_RUNNING`, now exported by `shuttle-lookup.ts` and used by the basis too, so the two answers agree) and "{Place}까지 걸어서 **11분**이에요", the flag "22:21 도착 · 919동", and no action, so "닫기" stands alone. The board's "셔틀은 평일 21시까지 다녀요" was not taken: the basis's words say both that it is not running and its hours. With a deadline, or while the shuttle runs, the way keeps its own words.
6. **n8b.** The server writes only the first line: the request carries the conditions and the Plan's id but not its start, so it does not know when the party meets, and the kept card's own second line, "답이 없어도 **12:15**에 가면 돼요", stays under it. In the app, `lastReply` (`features/assistant/use-shown-answer.ts`) passes over a reply whose refusal is `for-someone-else`, which the server never sends with an answer or a Lookup, so the Plan or the invited party stays on screen with the map and the invitation's state; `Words` draws the kept card with the refusal's lines over its first (`PlanCard` and `InvitedCard` take `over`). A Lookup on screen stays the same way. Any other reply without an answer still clears what is shown.
7. **The rules.** `REFUSAL_RULES` list the three cases, and tell the model to call findFriend, or resolvePlace and findWay, in the same message for `course-and-room` and `other-library`, and to write nothing there either, not even the one sentence of findFriend's and findWay's rules.
8. **The mock.** The four replies were printed once from the endpoint with the scripted model and kept: n4 (a Tuesday at 11:50, 민수 in a Class in 302동 until 12:15, with 민수's id of the meal copies), n20 (14:10 at 301동), and n8b in `mobile/src/api/mock/data/refusals.json`, whose check now keeps a Lookup; n21 (22:10 at 관정) as `way-lookups/shuttle-not-running.json`, which the mock answers for "기숙사 가는 셔틀".

### Where the data differs from the boards

- n20: the library is named as the Place is, "신양학술정보관은 그곳의 방식으로 예약해요" (board "신양은 …"); the seed has three 신양 libraries.
- n21: 관정 is 62-1동 in the seed, so the chip is "62-1동에서" (board "관정에서"), and the Place is "(관악사)학부 생활관(919동)".
- n4: the map's tag, as decision 3 says.

### The real model (2026-11-15)

The two messages were sent once through the chat feature of an app that draws answers (`chatAssistant` with `drawsAnswers`, run by `runFeature`) with the production model, `anthropic/claude-haiku-5.5` through OpenRouter, over stub services: the Friend 민수 seen through the Timetable in a Class in 302동 until 12:15, and Places among which 신양학술정보관 is the only 신양. One round; no rule needed a change.

| Asked | Tools called, in order | The reply |
|---|---|---|
| 민수 지금 무슨 수업 들어? (11:50) | `resolveFriend`, `findFriend`, `refuse` (`course-and-room`, 민수's id) | the Friend Lookup with "민수 · 시간표", the refusal's lines as the text (the model wrote none) |
| 신양 스터디룸 예약해 줘 (14:10 at 301동) | `resolvePlace` ("신양"), `findWay` (to 신양학술정보관), `refuse` (`other-library`, its id) | the way Lookup, the refusal's lines as the text |
