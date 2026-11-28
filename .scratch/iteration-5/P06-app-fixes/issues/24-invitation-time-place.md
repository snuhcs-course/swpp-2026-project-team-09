# 24: An invitation card says when and where the 파티 meets

Parent: [P06 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: None.

Native files: none. Releases: a main server Release and an app OTA update.

## What happens now

Positions are as of `origin/5.0/Main` 331adc64. Found by a read-only audit of the code on 2026-11-27 (what users of 파티 and 행사 cannot know).

- In the server build an invitation card says only "<리더>님이 … 초대했어요" and "N명 참여 중" (`mobile/src/screens/party/invites-tab.tsx`). Its time and place come from mock stand-ins that give nothing in the server build (`mobile/src/api/quest-parts/invitation-times.ts`, `invitation-places.ts`): the invitation carries its Quest's summary but not its next Sub Quest (`main-server/src/quests/dto/waiting.dto.ts`, `WaitingDto`).
- The card does not open the 모집글, and a 비공개 파티's 모집글 cannot be read before joining. So an invited User accepts without knowing when or where.

## What to build

- The main server's received invitations carry the Quest's next Sub Quest: its start and its place (label, and the position or Place when there is one).
- The card shows the time (with its date, ticket 26) and the place under the title, or "시간 미정" / "장소 미정".
- The mock stand-ins are no longer read in the server build; the mock keeps its own.

## Must not break

- Accepting and declining an invitation; an ended invitation's toast.
- Tests: main server `invitations` (`.integration`), app `party-invites*` (`.integration`).

## Acceptance criteria

- [ ] A received invitation carries its Quest's next start and place. (Main server integration test, which fails before the change.)
- [ ] The card shows them in the server build. (App integration test against the fake main server, which fails before the change.)
- [ ] No native file changes; lint, format and types pass.

## Comments

### Agent usage (2026-11-28)

- Agent time: about 15 minutes, an estimate. It is the time in which the agent worked on this ticket in one session (worktree `snu-now-p06-s2`), split from the session's other tickets by when each ticket's PR was opened. Waiting for the shared lock, for Docker and for reviews is left out.
- Tokens, the two review subagents included:
  - input: 232 uncached, with 14,347,408 read from the cache and 309,398 written to it;
  - output: 60,647.
