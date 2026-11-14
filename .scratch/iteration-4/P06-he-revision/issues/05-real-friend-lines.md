# 05: Real Friend lines and walking times; 오늘의 발자국 removed

Parent: [spec](../spec.md) ("Friend lines", "Walking times", "오늘의 발자국 removed")
Status: ready-for-agent
Blocked by: None (can start immediately). Tell B and C before starting (work split §4): C owns the Friends adapter and the location-sharing service; B owns the main-screen layout and the bottom controls where 오늘의 발자국 sits.
Prepared before the acceptance tests: yes. Done when the pull request into `4.0/Main` is open; whether it merges and ships before an acceptance test is decided by the team later.
Native files: no
PR assignee: Jaehyun0320

## What to build

The production app stops showing sample Friend data. A visible Friend's line shows the nearest Place and how old the position is, never "공강"; a Friend who is not visible is "위치 꺼짐". "도보 N분" is the walking time from the Place nearest the User to the Place nearest the Friend, from the walking table; "근처" when both are the same Place; nothing when the User's own position is unknown. Because the walking table lives only in the main server (ADR 0010), `GET /positions` adds `nearPlace` and `walkMinutes` to each Friend's position, both null when unknown.

"수업 중" and "이동 중" are not computed: C's FriendView and its three Friend levels redefine Friend status in this iteration. The pull request and a comment at the line say so, for reviewers.

오늘의 발자국 leaves the main screen, with its feature folder, mock data, types, client operations and design tokens.

## Acceptance criteria

- [ ] `GET /positions` returns `nearPlace` and `walkMinutes` per Friend, null without the caller's position.
- [ ] The app's Friend line never says "공강" from the mock; it shows the nearest Place and the position's age, or "위치 꺼짐".
- [ ] "도보 N분", "근처", or nothing, as above.
- [ ] The pull request description and a code comment explain why only the server's facts are shown and that FriendView will add more.
- [ ] 오늘의 발자국 and everything only it used is gone.
- [ ] Tests (ADR 0007): main-server integration for the two fields (prior art: `friend-sharing`); a unit test of the Friend line (prior art: `features/friends-adapter`); the 오늘의 발자국 adapter test is removed with it.
- [ ] B and C were told before the change; the pull request says so.
- [ ] The "Sample data in production" row of `he-revision-log.md` gets this pull request.

## Comments
