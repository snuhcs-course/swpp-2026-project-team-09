# 02: Each Friend's level on 위치 공유 only

Parent: [P15 spec](../spec.md), item 2; found using `snunow/all/26.11.17-2` on 2026-11-17; the team canvas's before/after board for this item under "P15. 출시 전 앱 청소"
Status: needs-info
Owner: TaeHyun79
Blocked by: none

## What is on screen now

- 내 정보 → 친구 관리 (the screen is titled "친구") lists the User's Friends. Under each Friend's name and department sits a three-cell bar, "시간표만 / 지금 있는 건물 / 정확한 위치", the level the User lets that Friend see.
- Above the list: "둘 중 낮은 쪽까지만 서로 보여요. 시간표는 계속 보여요".
- The "친구마다" card of the 위치 공유 screen has the same bar under each Friend. The two bars are the same component and save the same way (the first turn-off of a Friend's location asks once), so they do the same thing.

## What changes

- The bar under each Friend on 친구 관리 is removed. 친구 관리 keeps only the list of Friends.
- The line "둘 중 낮은 쪽까지만 서로 보여요. 시간표는 계속 보여요" is removed with the bars.
- A Friend's level is changed on the 위치 공유 screen only.

## What stays as it is

- The search, 친구 추가 and 친구 요청.
- Each Friend's row: the name, the department, and "위치 꺼짐" after the department while that Friend's location is not seen.
- A press on a Friend offers 친구 끊기.

## Open question

While the Master Switch is off, 친구 관리 also shows the line "전체 위치 공유가 꺼져 있어요 · 켜기" above the list (only while the User has Friends). The note that this ticket comes from does not say whether that line stays once the bars it explained are gone. The ticket is ready once this is decided.

## Acceptance criteria

- [ ] A Friend's row on 친구 관리 shows no level bar and no words about levels; the list shows the search, 친구 추가, 친구 요청 and each Friend's name, department and "위치 꺼짐" as before.
- [ ] A press on a Friend on 친구 관리 still offers 친구 끊기, and ending the friendship still removes the Friend from the list.
- [ ] The "친구마다" card of the 위치 공유 screen still shows and saves each Friend's level, asking once before the first turn-off.
- [ ] Tests, by ADR 0007: the integration tests that render 친구 관리 over the fake main server check that the bars and the line are gone and that the search, the entries and 친구 끊기 still work; the integration test of the 위치 공유 screen still covers the levels.
