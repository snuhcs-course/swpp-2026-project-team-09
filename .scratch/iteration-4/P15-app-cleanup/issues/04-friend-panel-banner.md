# 04: No "친구 N명과 위치 공유 중" banner in the map's friend panel

Parent: [P15 spec](../spec.md), item 4; found using `snunow/all/26.11.17-2` on 2026-11-17; the team canvas's before/after boards for this item (the `P15-04-*` boards under "P15. 출시 전 앱 청소")
Status: ready-for-agent
Owner: TaeHyun79
Blocked by: none

## What is on screen now

- "친구 N" on the map opens the friend panel. At the panel's bottom, above "친구 추가", a green banner reads "친구 N명과 위치 공유 중", with the link "공유 설정" to its right.

## What changes

- The banner is removed.

## What stays as it is

- The rest of the panel: the search, the filter chips ("전체", "공강", "수업 중", "이동 중", "위치 켜짐", "위치 꺼짐"), the groups by state and their order, and "친구 추가".
- The "공유 설정" link, in its place at the bottom even with the banner gone. It still closes the panel and opens 내 정보 at the 위치 공유 card.

## Acceptance criteria

- [ ] The friend panel shows no "친구 N명과 위치 공유 중" banner, whatever the Friends' states.
- [ ] "공유 설정" is still at the bottom of the panel, and a press closes the panel and shows 내 정보 with the 위치 공유 card.
- [ ] The search, the chips, the groups and "친구 추가" work as before.
- [ ] Tests, by ADR 0007: the integration test that renders the friend panel over the fake main server checks that the banner is gone and that "공유 설정", the search, the chips and "친구 추가" still work.
