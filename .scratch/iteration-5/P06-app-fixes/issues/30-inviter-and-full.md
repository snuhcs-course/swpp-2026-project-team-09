# 30: An invitation names who invited, and a full 파티 cannot invite

Parent: [P06 spec](../spec.md)
Status: needs-triage (written for the team's review on 2026-11-27; not built)
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

- [ ] The card names the inviter. (App integration test, which fails before the change.)
- [ ] Inviting into a full 파티 is refused with its words; a 파티 with places left invites any number. (Main server integration test, which fails before the change.)
- [ ] The migration runs on the Dev Server; no native file changes; lint, format and types pass.

## Comments
