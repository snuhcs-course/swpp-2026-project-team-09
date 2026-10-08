# 08: Open the recruiting post from the 행사 tab's 파티 찾기/모집

Parent: [P27 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

In the 행사 tab's 파티 찾기/모집, pressing another User's Quest opens its recruiting post instead of asking "참여할까요?". The User reads the post and joins or asks to join with the post's own `참여하기` or `참여 신청`, as the post already allows. Pressing the User's own Quest still opens its room. The 파티 tab's boards and every other place that asks "참여할까요?" are unchanged.

## Acceptance criteria

- [ ] Pressing another's Quest in 파티 찾기/모집 closes the sheet and opens that Quest's recruiting post.
- [ ] The post's `참여하기` (Open) and `참여 신청` (Approval) work from there as they do from the boards.
- [ ] Pressing the User's own Quest there opens its room, as today.
- [ ] Screen tests cover the above; `events-recruiting-test`, which asserted the question, changes with it and the PR names it; `party-find-test` and `room-joining-test` pass unchanged.
