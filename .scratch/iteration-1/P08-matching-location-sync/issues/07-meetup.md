# 07: Meetup

Parent: [P08 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (Friends by Friend ID, and the signal path), 04 (Quests for Global Events and their Sub Quests)

## What to build

A User proposes a Meetup to a Friend: a title, a place, a start time and an optional end time. The Friend sees it and accepts or declines. An accepted Meetup becomes a Shared Quest that both hold, with one Sub Quest built from the Meetup, and from then on it follows the Quest rules. The proposer can withdraw a Meetup that was not answered, and one that nobody answered expires at its start time.

This is the first Quest with two Holders, so the ticket also tests what ticket 04 could not: progress that is each Holder's alone.

## Acceptance criteria

- [x] Proposing a Meetup to a Friend takes a title, a place, a start in the future and an optional end after the start. The place is a Place from the list, or a latitude, a longitude and a label. Proposing requires the key described in P04. A User who is not a Friend cannot be proposed to.
- [x] A User lists the Meetups proposed to them, each with its proposer, and the ones they proposed, each with its state: proposed, accepted, declined, withdrawn or expired.
- [x] A proposed Meetup whose start has passed is expired. This is computed when read and nothing is written. An expired Meetup can be neither accepted nor declined.
- [x] Accepting creates one Quest held by both Friends, with the Meetup's title and one Sub Quest with the Meetup's title, time and place. No Party is created. Two accepts of one Meetup leave one Quest.
- [x] The receiver declines. The proposer withdraws a Meetup while it is proposed. No route edits a Meetup.
- [x] Ending a friendship withdraws the Meetups still proposed between the two. The Quests of accepted Meetups stay.
- [x] `meetups-changed` goes to both Friends when a Meetup is proposed, accepted, declined or withdrawn, and `quests-changed` goes to both when one is accepted.
- [x] With two Holders: one marks the Sub Quest as done and the other's state is unchanged; an end time passes and both see it ended; either adds a Sub Quest and both see it; one drops the Quest, the other stays its Holder and receives `quests-changed`.
- [x] Main server tests at the API: each state reached, a repeated key that leaves one Meetup and answers the same twice, each refusal, the friendship ended under a proposed and under an accepted Meetup, and the four cases with two Holders.
- [x] The main server's README records the Meetup routes, the states and how expiry is computed, and what accepting creates.

## Comments

### Decisions (2026-10-04)

- **Table**: `meetups` (`proposer_id`, `receiver_id`, `title`, `starts_at`, `ends_at` nullable, `place_id` or
  `latitude`/`longitude`/`place_label`, `state`, `proposed_at`), enum `meetup_state`: `proposed`, `accepted`,
  `declined`, `withdrawn`. CHECKs: proposer and receiver differ, the end after the start, the place exactly one of a
  Place or a point with its label. The Place foreign key is RESTRICT, since the place is required. No link to the
  Quest an accepted Meetup gave.
- **Expired** is not stored: a `proposed` row whose start is at or before `now()` of `CLOCK` reads as `expired`.
  `QuestsModule` now exports `CLOCK`, which `MeetupsModule` injects.
- **Routes**: `POST /meetups` (`Idempotency-Key` required)
  `{ receiverId, title, startsAt, endsAt?, place }` → 201 Meetup; `GET /meetups` → `{ received, sent }`, every state,
  the newest first; `POST /meetups/:id/accept|decline` (the receiver) and `POST /meetups/:id/withdraw` (the proposer)
  → 204. A second accept is refused, not answered with the Quest.
- **Body**: the Sub Quest body of ticket 04 (`subQuestContentSchema.safeExtend`, which keeps its end-after-start
  check) with `receiverId`, and `startsAt` and `place` required. The Place check is `QuestsService.columnsOf`.
- **Shape**: `{ id, title, startsAt, endsAt, place: { placeId, label, latitude, longitude }, state, proposer: { id,
  name, department }, receiver: { … } }`, `place` read by `toPlaceDto` from `src/quests/dto/quest.dto.ts`, which the
  Sub Quests use too.
- **Refusals**: `FRIEND_NOT_FOUND` 404 (not a Friend, or oneself), `MEETUP_START_PASSED` 400, `PLACE_NOT_FOUND` 404,
  `MEETUP_NOT_FOUND` 404 (unknown, or not the User's to answer or withdraw), `MEETUP_NOT_PROPOSED` 409 (answered,
  withdrawn or expired).
- **Locking**: proposing, answering and withdrawing lock both Users' rows in id order, as a change to a friendship
  does, and move the state only from `proposed` with a start still ahead, so two accepts leave one Quest and a
  proposal cannot cross the end of the friendship.
- **`QuestsService`**: `createWithSubQuest(subQuest: SubQuestColumns, holderIds, tx): questId`, a Quest without a
  Global Event titled as its one Sub Quest; `columnsOf(content, tx): SubQuestColumns`, made public.
- **`FriendsService.end()`** withdraws, in its own transaction, the pair's Meetups that are `proposed` with a start
  still ahead, and sends `meetups-changed` to both when it withdrew any. It reads the time with `new Date()`, not
  `CLOCK`, which `FriendsModule` does not have.
- **Signals**: `meetups-changed` to both on propose, accept, decline, withdraw and on a friendship's end that
  withdrew one; `quests-changed` to both on accept.

### Agent usage (2026-10-04)

- Agent time: about 15 minutes, an estimate: one implementing agent. The session that ran the agents of all P08 tickets is counted once, under ticket 09.
- Tokens, counted from the agent's transcript:
  - Input: 14,658,343, of which 14,446,154 were cache reads, 212,019 cache writes and 170 uncached.
  - Output: 31,629, a lower bound, since the transcript records only part of the output of most steps.
