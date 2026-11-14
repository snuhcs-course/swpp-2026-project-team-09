# 11: One 위치 공유 screen holds the switch, each Friend's level, and what is never kept

Parent: [P02 spec](../spec.md); the design's row 8, board n7b, opened by n7 and n9; the levels are P03 tickets 11 and 12
Status: ready-for-agent
Blocked by: nothing (the levels are on `4.0/Main`)

## What to build

"위치 공유 보기" opens one screen titled "위치 공유", which gathers what is today split between 내 정보's 위치 공유 card and the Friends screen, and says what the app never keeps:

- the row "위치 공유", "끄면 친구 모두에게 시간표만 보여요", with the Master Switch;
- "친구마다": each Friend with the line of what the two see of each other, "서로 시간표만 보여요" or "서로 지금 있는 건물까지 보여요" or "서로 정확한 위치까지 보여요", the lower of the two ends, and the three equal cells of the User's own end (시간표만 / 지금 있는 건물 / 정확한 위치);
- the foot "시간표의 건물과 끝나는 시각은 친구 모두에게 보여요. 위치를 꺼도 시간표는 보여요." and "새 친구는 '지금 있는 건물'에서 시작해요.";
- "남기지 않는 것": "누가 나를 찾았는지 · 기록 안 함" and "지난 위치 · 저장 안 함", with the foot "과목과 강의실은 보이지 않고, 후보로 검토된 것은 누구에게도 알리지 않아요."

The switch and each level ask once as P03 ticket 12 built them. 내 정보's card and the Friends screen keep working; the card's row opens this screen.

## Acceptance criteria

- [x] `GET /friends` gives each Friend's `seen`, the level the two see of each other (the lower of the two ends, `timetable` while either Master Switch is off), beside the User's own `level`. Nothing of the Friend's own end is given beyond that.
- [x] The screen at `/me/location-sharing` draws the four parts above in the board's words; a choice of level is the three equal cells, and a press asks once and sets the level as the Friends screen does.
- [ ] The refusal offers `open location-sharing` (ticket 10) open it.
- [x] Tests: the server's `seen` for each pair of levels and with a switch off; the screen's parts, a level press, and the switch.
- [x] Each changed source file has its AI-generated row; lint, format, and type checks pass; no native file changed.

## Comments

- The board's row "비공개 구역 · 칠한 곳 안에서는 시간표만 보여요 · 1곳" is not built: the Private Zone (lowering by place) is a feature of its own that no ticket builds yet, and a row for it would offer what the app cannot do.

### Decisions (2026-11-15)

- The work sits on P03 ticket 12 (PR 263), whose asking once (`use-levels.ts`, `level-track.tsx`, `off-question.tsx`, the Master Switch's question) the screen reuses; it merges after that PR.
- `seen` is `levelSeen` with no common Party: the line is about the friendship, and a Party shows the position only while it lasts. The two Users get the same `seen`.
- The screen reads `GET /friends` itself, not the Friends list's view joined with positions and statuses, so `useLevels` takes any Friend with an id, a name, a level, and `askedOff`.
- A Friend's line is lowered at once by a choice or a turn of the switch on its way, and raised only once `GET /friends` says so: the app does not know the Friend's own end.
- 내 정보's card gets a last row "위치 공유 보기", the words of the refusal's button, so that the same words open the same screen. The card keeps its background row and its off-campus line; the screen, as the board, has neither.
- "남기지 않는 것" draws each row as the thing at the start and the fact at the end, read as one ("누가 나를 찾았는지 · 기록 안 함").
- The mock keeps each Friend's own end: what the two see at the start (the User's end, the Timetable for the two whose location is off) and the building for a new Friend; `seen` is the lower of that and the User's end. The mock's `visible` is left as it was.
- The refusal's "위치 공유 보기" is ticket 10's: the route and its place in the stack are ready for it, and the box above stays open until that ticket opens the screen.
