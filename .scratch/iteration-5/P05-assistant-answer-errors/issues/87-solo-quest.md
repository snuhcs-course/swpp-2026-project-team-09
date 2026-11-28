# 87: A Quest of one's own can be made alone, as a to-do

Parent: [P05 spec](../spec.md). The user's rule of 2026-11-28: a 비공개 파티 made with nobody invited is allowed and is a Quest of one's own, used as a to-do ("결국 퀘스트인데 혼자 하는 todo처럼 쓸 수도 있으니"). His decision of 2026-11-16: what one takes alone is a Quest.
Status: ready-for-human
Blocked by: nothing.

Native files: none. Releases: the main server; the app's form follows in its own PR. No migration: `quests.taken_alone` exists.

## What was wrong

`POST /quests/own` takes a Closed Quest of capacity 1 to 8 and never asks for an invitee, but cannot make it taken alone. Only Plans and seat stays set `takenAlone`. A Quest made with nobody in it was a 파티 of four, shown among the User's 파티 and counted as one.

## What changes

- **The schema.** `makeQuestSchema` takes an optional `takenAlone: boolean`. With `true`, it is refused with `open` or `approval` (400 on `board`) and with a capacity other than 1 (400 on `capacity`). Left out, nothing changes.
- **The service.** `QuestsService.make` stores it as taken alone, with capacity `ALONE_CAPACITY` (1), Closed and on no board. It sends no `party_creation_completed`, as it is no 파티.
- **Its answer.** It carries `takenAlone: true`, which `GET /quests` already gives. The app draws such a Quest among the User's Quests and in no list or count of 파티.
- **No member room.** A Quest makes no room of members when it is made, so nothing is needed there.
- **Docs.** The README's `POST /quests/own` section and the usage table say so.

## Tests

`main-server/test/solo-quests.integration.test.ts` (new, 10 tests):

- made alone with no capacity, with 1, and said Closed: taken alone, Closed, for one, on no board;
- among the User's Quests, marked taken alone;
- a 파티 of four as before when the field is left out;
- refused with a board, Open, Approval, or a capacity of 4;
- an invitation later refused with `QUEST_TAKEN_ALONE`, as every Quest taken alone (P03 ticket 17).

Before: 9 of 10 failed; the 파티 left as before passed.

Also passing, run once each (integration): `own-quests` 19, `quest-boards` 28, `usage-failures` 3, `plans-alone-guards` 6, and `assistant-proposals` 25, whose Proposal runs this schema. main-server's lint, types and format pass.

## Acceptance criteria

- [x] The tests above pass; lint, types and format pass.
- [x] The user decided how a later invitation goes: ticket 88.
- [ ] The app's form makes one with `takenAlone: true` (its own PR).

## Comments

- **A later invitation.** The brief said that inviting a Friend later turns the Quest into a 파티, as `gatheringFrom` does. Today it does not. P03 ticket 17 refuses any invitation into a Quest taken alone, and its settings change (`QUEST_TAKEN_ALONE`); `gatheringFrom` runs only when a Plan adds people or the party form attends a Global Event. This PR keeps that rule. The user decides between:
  - (a) a Quest made alone here gathers on a later invitation;
  - (b) it gathers nobody, as now.

  He chose (a) and widened it ("초대할 수 있지 왜 없어", "어시스턴트 계획은 초대할 수도 있지 않나?"): every Quest taken alone but a seat's stay gathers. That is [ticket 88](88-solo-quests-gather.md).

### Agent usage (2026-11-28)

- Agent time: about 35 minutes (an estimate), in one session.
- Tokens: not measured apart; a share of the session of tickets 80 to 86.
