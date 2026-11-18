# 02: Each Friend's level on 위치 공유 only

Parent: [P15 spec](../spec.md), item 2; found using `snunow/all/26.11.17-2` on 2026-11-17; the team canvas's before/after boards for this item (the `P15-02-*` boards under "P15. 출시 전 앱 청소")
Status: ready-for-agent
Owner: TaeHyun79
Blocked by: none

## What is on screen now

- 내 정보 → 친구 관리 (the screen is titled "친구") lists the User's Friends. Under each Friend's name and department sits a three-cell bar, "시간표만 / 지금 있는 건물 / 정확한 위치", the level the User lets that Friend see.
- Above the list: "둘 중 낮은 쪽까지만 서로 보여요. 시간표는 계속 보여요". While the Master Switch is off and the User has Friends, the line "전체 위치 공유가 꺼져 있어요 · 켜기" also shows above the list, to say why the bars are disabled.
- The "친구마다" card of the 위치 공유 screen has the same bar under each Friend. The two bars are the same component and save the same way (the first turn-off of a Friend's location asks once), so they do the same thing.

## What changes

- The bar under each Friend on 친구 관리 is removed. 친구 관리 keeps only the list of Friends.
- The line "둘 중 낮은 쪽까지만 서로 보여요. 시간표는 계속 보여요" is removed with the bars.
- The line "전체 위치 공유가 꺼져 있어요 · 켜기" is removed from 친구 관리 too (decided 2026-11-17; the canvas board does not show this line and is not changed for it). 친구 관리 shows the list of Friends and nothing about Location Sharing. The line stays on the 위치 공유 screen, as ticket 01 says.
- A Friend's level is changed on the 위치 공유 screen only.

## What stays as it is

- The search, 친구 추가 and 친구 요청.
- Each Friend's row: the name, the department, and "위치 꺼짐" after the department while that Friend's location is not seen.
- A press on a Friend offers 친구 끊기.

## Acceptance criteria

- [x] A Friend's row on 친구 관리 shows no level bar and no words about levels, and no "전체 위치 공유가 꺼져 있어요 · 켜기" line shows while the Master Switch is off; the list shows the search, 친구 추가, 친구 요청 and each Friend's name, department and "위치 꺼짐" as before.
- [x] A press on a Friend on 친구 관리 still offers 친구 끊기, and ending the friendship still removes the Friend from the list.
- [x] The "친구마다" card of the 위치 공유 screen still shows and saves each Friend's level, asking once before the first turn-off.
- [x] Tests, by ADR 0007: the integration tests that render 친구 관리 over the fake main server check that the bars and both lines are gone and that the search, the entries and 친구 끊기 still work; the integration test of the 위치 공유 screen still covers the levels.

## Comments

### Notes from the implementation (2026-11-18)

- Where criterion 4 is checked:
  - Over the fake main server, `master-off-line.integration` checks that 친구 관리 shows no 켜기 line while the Master Switch is off.
  - Over the app's mocks, `friends-list.integration` checks that 친구 관리 shows no level bar and no note with the switch on, and that the search, the entries and 친구 끊기 work.
  - The levels are covered on the 위치 공유 screen by three files:
    - `location-sharing-screen.integration`;
    - `location-off-question.integration`, whose per-Friend question cases now open `/me/location-sharing`;
    - the new `location-sharing-levels.integration`, which holds the two cases that were only on 친구 관리.
- `FriendView.askedOff` was read only by the bars, so it is removed. `use-levels.ts` reads `askedOff` from `Friend`.
- `PlanLevelsQuestion`, the question after a Plan, still sets levels. It is not part of 친구 관리, so this ticket leaves it.
- The H3 row of the P06 HE revision log now says the levels and the 켜기 line are on 위치 공유 only. It names this ticket and #351.

### Agent usage (2026-11-18)

Estimates from the session transcripts, with gaps of 5 minutes or more left out. Tickets 02–05 ran in one session, in parallel, so that session's own share is split evenly among them.

- Agent time: about 36 minutes. Three Opus 5.5 subagents worked on it: one implemented the ticket and two reviewed it.
- Tokens: output about 62,000. Input about 20.4 million: 19.4 million cache reads, 0.95 million cache writes and about 300 uncached.
