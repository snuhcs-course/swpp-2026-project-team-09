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

- [x] The friend panel shows no "친구 N명과 위치 공유 중" banner, whatever the Friends' states.
- [x] "공유 설정" is still at the bottom of the panel, and a press closes the panel and shows 내 정보 with the 위치 공유 card.
- [x] The search, the chips, the groups and "친구 추가" work as before.
- [x] Tests, by ADR 0007: the integration test that renders the friend panel over the fake main server checks that the banner is gone and that "공유 설정", the search, the chips and "친구 추가" still work.

## Comments

### Notes from the implementation (2026-11-18)

- Where criterion 4 is checked:
  - That no banner shows is checked over the app's mocks in `friend-panel.integration`, with every Friend state, with only 위치 켜짐/꺼짐, and with no Friends.
  - The same check runs over the fake main server in `friends-server.integration`, after the friends-changed refresh.
  - "공유 설정", the search, the chips and "친구 추가" are checked over the mocks in `friend-panel.integration`.
- No test checks where "공유 설정" sits, at the bottom right above "친구 추가". The code matches the after board.
- `Badge tone="live"` stays in the design system, since the party screens and the catalogue use it.

### Agent usage (2026-11-18)

Estimates from the session transcripts, with gaps of 5 minutes or more left out. Tickets 02–05 ran in one session, in parallel, so that session's own share is split evenly among them.

- Agent time: about 26 minutes. Three Opus 5.5 subagents worked on it: one implemented the ticket and two reviewed it.
- Tokens: output about 34,000. Input about 10.1 million: 9.7 million cache reads, 0.34 million cache writes and about 200 uncached.
