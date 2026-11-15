# 13: Without a location or a Timetable the answer says so and what it assumed instead

Parent: [P02 spec](../spec.md); the design's row 8, boards n13, n14, n15, principle 4
Status: ready-for-agent
Blocked by: ticket 10 (its offers); #265 (P02-09 changes `use-shown-answer.ts` and `plan-card.tsx`); for n14's drawing, P01 ticket 11 (the answer screen draws a Lookup); "여기로" is package D's

## What to build

- **The request says why a location is missing.** The request context gains `locationMissing: 'permission' | 'off-campus' | null`, so that the server tells no permission (n13) from off campus (n14). No off-campus position is sent.
- **n13, no location permission.** The asker sets out from the building of the previous class, at any time of the day (today only within 15 minutes of its end), and its chip "301동에서" is marked assumed (drawn in the Quest colour). The lines are "위치를 몰라 직전 수업의" / "**301동**에서 출발로 잡았어요", and the card offers "위치 켜기" beside the arrows, which opens the map's location explanation.
- **n14, off campus.** The way answer starts at the main gate: lines "정문을 **08:45**까지 지나면 돼요" / "캠퍼스 밖이라 정문부터 계산했어요", basis "정문 → 43-1동 걸어서 15분" and "지금 위치는 캠퍼스 밖이라 쓰지 않았어요", flag "08:45까지", and the card's note "캠퍼스 밖이라 친구에게 내 위치가 보이지 않아요".
- **n15, no Timetable.** The server reads whether the User has any Class. With none, the candidates come nearest first, the lines say "**301동식당**이 가장 가까워요", the basis "시간표가 없어 가까운 순서로 넘겨 봐요", the card's note "시간표를 넣으면 나설 시각까지 알려 드려요", and the card offers "시간표 넣기".

## Acceptance criteria

- [ ] The context's `locationMissing` from the app (permission refused or not asked; off campus) and its check on the server.
- [ ] n13: the previous class's building as the asker's origin without a location at any time; the assumed chip; the lines; "위치 켜기".
- [ ] n14: the gate branch runs from `locationMissing: 'off-campus'`; the lines, basis, flag, and note.
- [ ] n15: no Class at all gives nearest-first candidates, the lines, basis, note, and "시간표 넣기".
- [ ] An `AnswerReply` carries its offers as a refusal does (ticket 10's `RefusalOffer`), drawn beside the Plan's buttons.
- [ ] Tests on both sides; the real server's replies kept as the app's mock copies.
- [ ] Each changed source file has its AI-generated row; lint, format, and type checks pass; no native file changed.

## Comments

- The origin rule and the chip's mark change package A's engine (`gathering/`, `meal-answer.ts`, the dto). Their seam lines are in `row-8-seams.md`, ticket 13, for package A to see before this is built.
- The "14:00까지" of n13 and n15 is a Restaurant's own hours, which are ticket 16.
