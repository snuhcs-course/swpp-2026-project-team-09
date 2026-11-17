# 01: One 위치 공유 switch, on 내 정보 only

Parent: [P15 spec](../spec.md), item 1; found using `snunow/all/26.11.17-2` on 2026-11-17; the team canvas's before/after board for this item under "P15. 출시 전 앱 청소"
Status: ready-for-agent
Owner: TaeHyun79
Blocked by: none

## What is on screen now

- The 위치 공유 card on the 내 정보 tab holds a "위치 공유" switch. It is the Master Switch.
- The card's "위치 공유 보기" opens the 위치 공유 screen. Its first card is the same "위치 공유" switch, with the words "끄면 친구 모두에게 시간표만 보여요" under it. Both switches turn the same Master Switch on and off; nothing tells them apart.
- Under the switch on the 내 정보 card, while it is on, two lines count the User's own end: "위치 공유를 허용한 친구 N명", and, while the User is in a Party with their Party sharing on, "[파티 이름] 파티에서 위치 공유를 허용한 멤버 N명".

## What changes

- The switch stays on the 내 정보 card only.
- The switch card at the top of the 위치 공유 screen ("위치 공유 · 끄면 친구 모두에게 시간표만 보여요") is removed. The screen starts with "친구마다".
- The two count lines under the switch on the 내 정보 card are removed.

## What stays as it is

- The "백그라운드에서도 공유" row on the 내 정보 card.
- The lines that show only outside the Campus Boundary or inside a Private Zone: "캠퍼스 밖이라 위치가 공유되지 않아요" and "비공개 구역 안 · 친구에게는 시간표만 보여요".
- On the 위치 공유 screen, the line "전체 위치 공유가 꺼져 있어요 · 켜기" while the Master Switch is off. Its "켜기" turns the Master Switch on, so the switch can still be turned on from that screen.
- The rest of both screens.

## Acceptance criteria

- [ ] The 위치 공유 card on 내 정보 shows the "위치 공유" switch with no count line under it, whatever the User's Friends and Party are, on and off.
- [ ] The 위치 공유 screen has no switch. Its first card is "친구마다".
- [ ] While the Master Switch is off, the 위치 공유 screen shows "전체 위치 공유가 꺼져 있어요 · 켜기", and "켜기" turns the Master Switch on, as the switch on 내 정보 does.
- [ ] The "백그라운드에서도 공유" row and the off-campus and Private Zone lines show on 내 정보 as before.
- [ ] Tests, by ADR 0007: the integration tests that render 내 정보 and the 위치 공유 screen over the fake main server check that the switch card and the count lines are gone and that what stays still works. The unit test of the two count lines' rule goes with the rule.
