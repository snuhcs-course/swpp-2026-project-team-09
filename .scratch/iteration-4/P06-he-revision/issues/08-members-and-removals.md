# 08: Friend Requests between members, and approval after removal

Parent: [spec](../spec.md) ("Members and removals")
Status: ready-for-agent
Blocked by: 04 (the sent-request row that shows the removed User's caption). Planned after the acceptance tests (11-18). Tell C before starting: the Friend Request by user id goes in C's Friends service (work split §4).
Done when the pull request into `4.0/Main` is open; merging is the team's call.
Native files: no
PR assignee: Jaehyun0320

## What to build

Each member row of a 파티 has "친구 추가": hidden for a Friend, "요청됨" once sent, "수락" when the other member has sent one. The server accepts a Friend Request named by user id only when both are Holders of the same Quest; the existing refusals still apply.

A member the Leader removed must be approved to come back, even into an Open Quest. Removing writes `quest_removals (quest_id, user_id, created_at)` in the same transaction (unique on the pair, deleted with the Quest or the User); leaving writes nothing. Joining with a removal refuses with `QUEST_REMOVED_ASK`, and asking to join accepts an Open Quest when a removal exists. The removed User sees "참여 신청" with one caption, "내보내진 파티라 파티장 승인이 필요해요", in place of the join button and on their sent-request row. The Leader's requests include them, each marked "전에 내보낸 멤버" (`removedBefore`). Accepting deletes the removal. If the Leader's requests read only Approval Quests today, that is widened. The migration's place in the team's order of `schema.prisma` changes is agreed first.

## Acceptance criteria

- [ ] A Friend Request by user id succeeds between Holders of the same Quest and is refused otherwise.
- [ ] The member row's button follows the four states.
- [ ] Removal writes a row; leaving does not; joining after removal refuses with `QUEST_REMOVED_ASK`; asking succeeds on an Open Quest only with a removal; acceptance deletes the row.
- [ ] The removed User's caption shows on the post and on the sent-request row; the Leader's mark shows on the request.
- [ ] The migration order is agreed and written in the pull request.
- [ ] Tests (ADR 0007): main-server integration for each server rule (prior art: `party-join-requests`, `party-join-request-answers`, `friend-requests`); app integration for the button states, the caption and the mark.
- [ ] C was told before the change; the pull request says so.
- [ ] Wiki Requirements US-QUEST-03 and UI-08 describe approval after removal.
- [ ] The H4 and "Removed members joining again" rows of `he-revision-log.md` get this pull request.

## Comments
