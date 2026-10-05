# 15: Matching into an Open Quest

Parent: [P08 spec](../spec.md)
Status: ready-for-agent
Blocked by: 04 (Quests, their Sub Quests and joining them), 09 (Matching: rounds, groups and the Shared Quest)

## What to build

"같이 갈 사람 찾기" also places a requester into a Quest that is already gathering, besides grouping requesters into a new Quest. A round of ticket 09 now fills the eligible Open Quests first, the earliest request into the earliest Quest, and then groups the requests that are left as before.

A Quest is eligible for a request when it is for the request's Global Event, is Open, has a free place and has a capacity equal to the size the requester chose. The main server adds the placed User as a Holder under ticket 04's rules of joining. A placement keeps no record of its own: its request waits until the main server answers that the User entered, and a round that ends without that answer leaves it to the next round.

## Acceptance criteria

- [x] After the main server's answer on which requests stand, a round asks the main server for the eligible Quests of the Global Events and sizes it has waiting requests for. The main server answers the Open Quests for that Global Event with a capacity equal to the size and a free place, each with its free places, its Holders and the time it was made. An Approval or a Closed Quest is never answered.
- [x] For each Global Event and size, the round places the earliest waiting request into the earliest eligible Quest, and goes on in order of arrival until each Quest is full or no request is left. A request is never placed into a Quest its User holds.
- [x] For each placement the match server asks the main server to place the User into the Quest. The main server adds the User as a Holder under the rules of joining: within capacity, checked inside the transaction that adds the Holder, with a Quest the User held alone for the event deleted. A User who already holds that Quest is answered as entered.
- [x] When the User entered, the request is matched and names the Quest. `matching-changed` goes to the User, and `quests-changed` to the Holders of the Quest, the User included.
- [x] When the main server refuses because the Quest filled, is no longer Open or no longer has a capacity equal to the size, or the User holds a Shared Quest for the event by then, the request stays waiting. The next round expires it when it no longer stands, or places or groups it.
- [x] When the main server does not answer, the request stays waiting and the round goes on with the others.
- [x] The requests that were not placed are grouped as in ticket 09.
- [x] Match server tests, with the main server replaced at the fetch boundary: placement in order of arrival into the earliest Quest, a Quest filled by placements and the rest grouped, a request never placed into its User's own Quest, a refused placement leaving the request waiting, a main server that does not answer, and two match servers running a round at the same moment placing each request once.
- [x] Main server tests at the API: the eligible Quests answered and each Quest left out, a placement adding the Holder, a Quest held alone replaced, a repeated placement answered as entered, each refusal, a placement and a User's own joining racing for the last free place, and the signals on Redis.
- [x] The READMEs record their part: the order of a round and how a placement is decided and repeated in the match server's; the two routes for the match server and the rules of a placement in the main server's.

## Comments

### Decisions (2026-10-06)

- **Main server routes** (the match server's, `@MatchServerOnly()`, 401 to any other token, in `MatchingController`):
  `POST /matching-requests/eligible-quests { pools: [{ globalEventId, size (2–4) }] }` → 200
  `{ quests: [{ id, globalEventId, capacity, freePlaces, holderIds, createdAt }] }`, the earliest made first, Holders in
  the order they entered: Open Quests of the pool's Global Event with `capacity = size`, a free place and a Sub Quest
  ahead (`MatchingQuestsService.eligibleQuests(pools)`); `POST /matching-requests/placements { questId, userId, size
  (2–4) }` → 201 `{ questId, holderIds }`, the same answer shape as `POST /matches/:matchId/quest`.
- **A placement** (`MatchingService.place`) locks the User, answers a User who holds the Quest already as entered with
  the current Holders and no signal, and otherwise calls `RecruitingService.enter` with an `admits` that refuses
  `QUEST_NOT_OPEN` 409 (Approval or Closed) and `QUEST_CAPACITY_DIFFERS` 409 (capacity is not the size). With
  `enter`'s own refusals the codes are `QUEST_NOT_FOUND` 404, `QUEST_NOT_OPEN`, `QUEST_CAPACITY_DIFFERS`,
  `QUEST_ENDED`, `QUEST_FULL`, `SHARED_QUEST_HELD` (409). Signals after the commit: `matching-changed` to the User, then
  `quests-changed` to `holderIds`, the User included.
- **The round's order**: standing answer and expiries, then `PlacementService.place(standing, tx)`
  (`match-server/src/matching/placement.service.ts`), then grouping of the requests it did not try to place. The
  placements run inside the round's transaction, under the advisory lock, so one match server places a request once.
  The round asks for the eligible Quests of the pools it has standing requests for, orders the Quests by `createdAt`
  (then id), and fills each with the earliest requests of its pool whose Users are not among its Holders.
- **Stays waiting**: any refusal of a placement, whatever its code, and no answer leave the request waiting and out of
  this round's grouping; nothing is closed. No answer about the eligible Quests places nothing and groups as before.
- **Match server table**: `matching_requests.quest_id` (migration `20261004240000_add_placements`), set with
  `state = 'matched'` on a placement, CHECK `matching_requests_quest_id_check` (only on a `matched` request without a
  match). A request's `questId` reads `quest_id`, else its match's Quest. A placement needs a column: its request names
  the Quest after the round, and it is in no match.
- **A lost answer**: a User whom the main server placed but whose answer did not arrive holds the Quest, and the next
  round's standing question expires the request (the User holds a Shared Quest by then).
- **Tests**: `MainServerStub` has `eligible`, `placement` and `placements()`; match server `test/placements.e2e-spec.ts`,
  main server `test/matching-placements.e2e-spec.ts`.

### Agent usage (2026-10-06)

- Agent time: about 35 minutes, an estimate: one implementing agent, in two runs. The session that ran it is not counted here.
- Tokens, counted from the agent's transcript, a lower bound, since the transcript records only part of the second run and of the output:
  - Input: 13,264,173, of which 13,068,942 were cache reads, 195,069 cache writes and 162 uncached.
  - Output: 18,853.
