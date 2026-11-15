# 15: A refusal over what is on screen keeps it and answers the part it can

Parent: [P02 spec](../spec.md); the design's row 8, boards n4, n8b, n20, n21, principle 2
Status: ready-for-agent
Blocked by: ticket 10; #265 (P02-09 changes `use-shown-answer.ts` and `plan-card.tsx`); P01 ticket 11 (the answer screen draws a Lookup) and #258 (the Friend Lookup)

## What to build

- **n4, a Friend's course and room.** The Friend Lookup answers what can be seen, and the refusal's line comes first: "과목과 강의실은 보이지 않아요" / "**12:15**에 302동에서 수업이 끝나요", chip "민수 · 시간표", buttons "만나고 싶다" (main) and "닫기".
- **n20, another library's room.** The way Lookup to 신양 with the refusal "앱이 예약하는 곳은 관정뿐이에요" / "신양은 그곳의 방식으로 예약해요" and "관정 스터디룸" (main), "닫기".
- **n21, the shuttle not running.** The way Lookup's lines "셔틀은 평일 21시까지 다녀요" / "기숙사까지 걸어서 **11분**이에요", flag "{도착} 도착 · {건물}", and "닫기".
- **n8b, accepting for a Friend.** A refusal while a party is on screen keeps the party's card and puts "수락은 {민수}가 직접 해요" / "답이 없어도 **12:33**에 가면 돼요" in its lines.

## Acceptance criteria

- [ ] A reply with a refusal and a Lookup draws the Lookup with the refusal's lines in place of its own.
- [ ] A reply with only a refusal while a Plan or a party is shown keeps it on screen (P02 ticket 03's rule changes for this case only).
- [ ] Tests on both sides; the real server's replies kept as the app's mock copies.
- [ ] Each changed source file has its AI-generated row; lint, format, and type checks pass; no native file changed.

## Comments

- n21's first line: `lookup/shuttle-lookup.ts` already writes "셔틀은 지금 다니지 않아요 (평일 8–21시)" in a way's basis outside service hours. The two answers use the same words; choose at build time between those and the board's "셔틀은 평일 21시까지 다녀요", and change both together.
- Not built, with the reason: n20's card values ("그룹스터디실 · 9:00–21:00", "공과대학 학생만") have no data behind them (principle 1); n8b's "카톡으로도 보내기" (sharing an invitation link) is out of P02's scope.
