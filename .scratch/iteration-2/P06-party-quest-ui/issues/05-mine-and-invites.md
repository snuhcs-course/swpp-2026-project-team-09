# 05: 내 파티 and 초대

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (Retire the Meetup), 02 (The mocked parts of a Quest)

## What to build

`내 파티` and `초대` follow `PartyMine` and `PartyInvites`. A User tells public and private Quests apart, sees how many invitations still wait and how the activation stands, declines an activation from the card and finds it again under `다른 활성 파티`, and looks back at past plans. An invitation shows when and where it is and who else comes.

Declining is kept on the phone, as today. Past Quests and an invitation's time and place have mock adapters, added here; the companions come from ticket 02.

## Acceptance criteria

### 내 파티

- [x] The kind is an icon with `공개 파티` or `비공개 파티`.
- [x] The status reads `멤버 {n}명`, `모집 중 · {n}/{cap}명 · 초대 {k}명 대기`, `{n}명 · 초대 {k}명 대기` for a private one, and `활성화 중 · {n}명 위치 공유` or `응답 대기` while switched on.
- [x] The activation strip has `거절` and `참여`; a declined one reads `활성화 중 · 참여하지 않는 중` with `참여`.
- [x] The group `다른 활성 파티` holds declined activations, after `활성화 중` and `활성화 알림`.
- [x] The group `지난 일정` holds past Quests, last.

### 초대

- [x] Each card shows `{when} · {where} · {names} 함께`; the build connected to the server leaves out the mocked parts (all three) until the server gives them.
- [x] The header is `받은 초대 · {n}` and there is no `보낸 초대`.

### Tests and PR

- [x] Jest covers each status, declining and coming back, and both new groups.
- [ ] Screenshots beside `PartyMine` and `PartyInvites`, under Test Results.

## Comments

Decisions taken while building it:

- The status reads `{n}명` / `모집 중 · {n}/{cap}명` (with `· 초대 {k}명 대기` when invitations wait) on a Quest the User leads, as the frame's own posts do, and `멤버 {n}명` on another's. The waiting invitations come from `GET /quests/:questId/invitations` for each led Quest; until it answers, or if it is refused, the card counts none.
- `활성화 중 · 응답 대기` shows while the User is the only one sharing in the Party, as the frame's `nIn > 1` rule.
- A past Quest is mocked in both builds (`listPastQuests`), shown under `지난 일정` the latest first, and opens no room: the main server has none to give. The chips and the empty state count only the Quests held now. A server Quest whose next Sub Quest started before today also lands in `지난 일정`.
- In the server build an invitation shows none of the three mocked parts, and its meta line falls back to `{n}명 참여 중`, the Holders the server counts.
- The 초대 tests moved to `party-invites-test.tsx` and the status and activation tests to `party-mine-activation-test.tsx`, to keep each file under the lint's 300 lines.

### Agent usage (2026-10-18)

- Agent time: about 1 h 30 min of active work by one subagent in its own worktree, over two sessions (the machine powered off mid-work). It is an estimate; time waiting on Jest under other agents' load is not counted.
- Tokens: recorded by the main session.
