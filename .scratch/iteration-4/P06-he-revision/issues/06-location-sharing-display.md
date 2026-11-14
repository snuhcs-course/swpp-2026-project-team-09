# 06: Location sharing shows its rule and who sees the User

Parent: [spec](../spec.md) ("Location sharing display")
Status: ready-for-agent
Blocked by: None (can start immediately). Planned after the acceptance tests (11-18).
Done when the pull request into `4.0/Main` is open; merging is the team's call.
Native files: no
PR assignee: Jaehyun0320

## What to build

The Master Switch is renamed "위치 공유", since it also stops 파티 sharing. While it is off, every Friend and 파티 switch shows off and disabled under one line, "전체 위치 공유가 꺼져 있어요 · 켜기"; each keeps its stored value, so turning the Master Switch back on restores them. Under the Master Switch the 위치 공유 card says "위치 공유를 허용한 친구 N명", counting Friends for whom the User's own switch is on, and, while a 파티 is on and the User's own switch for it is on, "○○ 파티에서 위치 공유를 허용한 멤버 M명", counting its other members. Both count only the User's own end: someone sees the User only when both ends and both Master Switches are on (the visibility service), which the app does not know. So no word on the card says "봐요" or "볼 수 있어요" (agreed in review). The map does not change. No server change. Words follow the design's Screen words ("파티 켜기, 켜짐, 끄기").

## Acceptance criteria

- [ ] The switch reads "위치 공유".
- [ ] With it off, Friend and 파티 switches render off and disabled with the line and its 켜기 link; stored values are untouched and come back when it is turned on.
- [ ] The card's two lines use exactly the words above, never "봐요" or "볼 수 있어요"; the 파티 line is hidden when no 파티 is on.
- [ ] No server change; nothing on the map changes.
- [ ] Tests (ADR 0007): a unit test of the two counts and their words, with a Friend whose own end is off still counted; an app integration test of the disabled state and its restore.
- [ ] Wiki Requirements US-LOC-01 and UI-09 use the new name. UAT-3's fixed wording is not changed; the pull request notes the rename.
- [ ] The H3 and H10 rows of `he-revision-log.md` get this pull request.

## Comments
