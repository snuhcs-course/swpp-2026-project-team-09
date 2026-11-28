# 31: An invitation names who invited, and a full 파티 cannot invite

Parent: [P06 spec](../spec.md)
Status: done
Blocked by: None.

Native files: none. Database: one migration (the exception to the spec's rule). Releases: a main server Release and an app OTA update.

## What happens now

Positions are as of `origin/5.0/Main` 331adc64. Found by a read-only audit of the code on 2026-11-27 (what users of 파티 and 행사 cannot know).

- An invitation keeps no inviter (`main-server/prisma/schema.prisma`, `QuestInvitation`), so the card names the 파티's Leader now (`mobile/src/screens/party/invites-tab.tsx`), which after a hand-over is someone the User may not know.
- Inviting checks no capacity (`main-server/src/quests/invitations.service.ts`), and the form's places left leave waiting invitations out (`mobile/src/features/party/making.ts`). An invitation to a full 파티 is accepted only to hear "자리가 다 찼어요", and stays.

## What to build

- `QuestInvitation` gains `invitedById`, nullable; an old invitation without one names the Leader as now. The card names the inviter.
- Inviting into a 파티 that is full at that moment is refused, and the app says "자리가 다 차서 초대할 수 없어요". A 파티 not yet full may invite more people than its places left (1/8 inviting 10 stays allowed: decided 2026-11-27).

## Must not break

- Accepting into a 파티 that fills meanwhile (`QUEST_FULL`, as now).
- Tests: main server `invitations` (`.integration`), app `party-invite*` (`.integration`).

## Acceptance criteria

- [x] The card names the inviter. (App integration test, which fails before the change.)
- [x] Inviting into a full 파티 is refused with its words; a 파티 with places left invites any number. (Main server integration test, which fails before the change.)
- [ ] The migration runs on the Dev Server; no native file changes; lint, format and types pass.

## Comments

### Agent usage (2026-11-28)

- Agent time: about 20 minutes, an estimate. It is the time in which the agent worked on this ticket in one session (worktree `snu-now-p06-s2`), split from the session's other tickets by when each ticket's PR was opened. Waiting for the shared lock, for Docker and for reviews is left out.
- Tokens, the two review subagents included:
  - input: 272 uncached, with 29,270,901 read from the cache and 388,090 written to it;
  - output: 67,416.

### Release (2026-11-28)

- The migration `20261128000000_add_quest_invitation_invited_by` went out with the Releases from `snunow/all/26.11.28-5` on, all of which succeeded. The Dev Server check of its criterion is not recorded, so that box stays open.
