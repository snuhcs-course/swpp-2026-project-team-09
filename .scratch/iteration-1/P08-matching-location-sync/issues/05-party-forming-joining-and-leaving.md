# 05: Party: forming, joining and leaving

Parent: [P08 spec](../spec.md)
Status: ready-for-agent
Blocked by: 03 (Location Sharing between Friends), 04 (Quests for Global Events and their Sub Quests)

## What to build

A User creates a Party, alone or marked with one of their Quests, and others find it in a list and join. The members see who is in it and who leads, see each other's Avatars under a switch for the Party, and leave when they wish; the Party goes on under its longest-standing member and ends with its last one.

This ticket covers a Party that is Open, and the entry of a Holder of the marked Quest under any Join Policy. Asking to join, invitations and the Leader's controls are ticket 06.

## Acceptance criteria

- [x] Creating a Party takes a title, a capacity from 1 to 8 that is 4 when left out, a Join Policy and an optional mark naming one of the creator's Quests. The creator is its Leader and its first member. A Quest whose Sub Quests have all passed, and a Quest the creator does not hold, cannot be the mark. The mark never changes.
- [x] A User is in at most one Party, which the database enforces. Creating or joining while in a Party is refused with a code that says so.
- [x] At most one running Party carries a Quest as its mark, which the database enforces. A second creation for the same Quest is refused with a code and names the existing Party. After that Party ended, a new one can be created for the Quest.
- [x] A User joins an Open Party at once. A Holder of the marked Quest joins at once whatever the Join Policy is. Both hold only within capacity, which is checked inside the transaction that adds the member; a full Party refuses with a code.
- [x] A User who enters a marked Party without holding its Quest becomes a Holder of it. A Quest the User held alone for the same Global Event is deleted, with its Sub Quests and the User's progress. A User who holds a Shared Quest for that Global Event keeps it and does not become a Holder.
- [x] A member leaves. When the Leader leaves, the member who joined earliest becomes Leader. When the last member leaves, the Party ends. A Party never ends by itself.
- [x] Leaving and the Party's end leave every Quest untouched, and dropping the marked Quest leaves the membership untouched.
- [x] A User reads their Party: its title, capacity, Join Policy and mark, and its members in the order they joined, with the Leader marked and, for each member, whether the User can see them now.
- [x] A list returns the Open and Approval Parties, and the same for one Global Event: the Parties marked with a Quest of that event while the Quest has Sub Quests ahead. A Closed Party is in neither.
- [x] Each member has a switch for the Party, which starts on. The visibility module counts a common Party whose switch is on at both ends as a relationship, and its table gains the Party's columns: a User hidden from a Friend by the friendship's switch is still seen through the Party.
- [x] Positions are pushed to the Party members who may see the subject, and `position-removed` goes at once when a member leaves, turns the Party's switch off, or the Party ends.
- [x] `party-changed` goes to the members when the Party or its membership changes, and to a member who left. `quests-changed` goes to the Holders when a User becomes a Holder by entering.
- [x] Concurrency tests: two Users joining the last free place, two Holders creating a Party for the same Quest, and one User joining two Parties each leave what the rules allow.
- [x] Main server tests at the API: creation and its refusals, each way of entering, the Quest gained or kept on entering, leaving with the Leader's succession, the end and a new Party for the same Quest, the lists, and the Party's switch.
- [x] The main server's README records the Party routes and refusals, the two rules the database enforces, how entering a marked Party changes Quests, and the Party as a relationship of Location Sharing.

## Comments

### Decisions (2026-10-04)

- **Tables**: `parties` (`title`, `capacity` with a CHECK from 1 to 8, `join_policy` enum `party_join_policy`
  `open | approval | closed`, `leader_id`, `quest_id` the mark, `created_at`) and `party_members` (`party_id` cascade,
  `user_id`, `joined_at` from `clock_timestamp()`, `sharing` default true). Migration `20261004170000_add_parties`.
- **The two database rules**: unique `party_members.user_id` (one Party per User) and unique `parties.quest_id` (one
  running Party per Quest). An ended Party's row is deleted with its members, so "running" is every stored row and a
  new Party can carry the Quest again. The mark's foreign key is `ON DELETE SET NULL`: when the last Holder drops the
  marked Quest, the Party stays and its mark reads `null`.
- **The Leader** is `parties.leader_id`. Leaving hands it to the member with the earliest `joined_at`.
- **Locks**: every membership change locks the User's row (`UsersService.lock`), then the Party's
  (`SELECT … FOR NO KEY UPDATE`), then a Quest's (`QuestsService.lock`). Creating a marked Party locks the User, then the
  Quest. The capacity is counted after the Party's lock.
- **Routes**: `POST /parties { title (1–50), capacity? (1–8, 4), joinPolicy, questId? }` → 201 Party;
  `GET /parties[?globalEventId=]` → `[{ id, title, capacity, joinPolicy, memberCount, mark }]`, newest first;
  `POST /parties/:partyId/join` → 201 Party; `GET /parties/mine` → Party; `POST /parties/mine/leave` → 204;
  `PUT /parties/mine/sharing { on }` → 204.
- **Party shape**: `{ id, title, capacity, joinPolicy, mark: { questId, title, globalEvent: { id, title } | null } | null,
  sharing, members: [{ id, name, department, leader, visible }] }`, members in the order they joined, the reader
  included; `sharing` is the reader's own switch.
- **Refusals**: `ALREADY_IN_PARTY` 409, `QUEST_NOT_FOUND` 404 (the mark is no stored Quest the creator holds),
  `QUEST_ENDED` 409, `PARTY_EXISTS_FOR_QUEST` 409 with `partyId` in the body, `PARTY_NOT_FOUND` 404,
  `PARTY_NOT_OPEN` 409 (an Approval or Closed Party joined by a User who does not hold its mark), `PARTY_FULL` 409,
  `NOT_IN_PARTY` 404.
- **A Class Quest cannot be a Party's mark** holds here: a Class Quest is never stored, so its identifier is no stored
  Quest of the creator and gets `QUEST_NOT_FOUND`.
- **Whose "ended"**: for the mark at creation and for the list of a Global Event's Parties, a Sub Quest is ahead while
  it is not cancelled and its end time has not passed at `CLOCK.now()`, the same for every Holder. A mark of done is one
  Holder's own and is not counted, so a Holder who marked everything done still creates the Party and it stays listed.
- **For ticket 06**, in `PartiesService`: `admit(party, userId, tx): { memberIds, holderIds }` adds a member within
  capacity, refuses `ALREADY_IN_PARTY` and `PARTY_FULL`, and makes the User a Holder of the mark; send `party-changed` to
  `memberIds` and `quests-changed` to `holderIds` after the commit. `removeMember(party, userId, tx): memberIds` takes a
  member out, hands on the Leader's role and ends the Party with its last member; wrap the transaction in
  `VisibilityService.announceRemovals(userId, …)` and send `party-changed` to the returned members. Both expect the
  User's row and then the Party's locked; the private `lock(partyId, tx)` does the Party's.
- **`QuestsService`** gains `addHolder(questId, userId, tx)`, `freeForSharedQuest(userId, globalEventId, tx): boolean`
  and `withSubQuestsAhead(questIds, tx?): string[]`; `questNotFound` is exported. A marked Quest without a Global Event
  takes the new Holder without `freeForSharedQuest`.
- **`VisibilityService`**: `linkedTo` joins the members of a common Party with both `party_members.sharing` on
  (`sharingMembersOf`) to the Friends. The table test has the Party's columns: 200 rows.
- **Signals**: `party-changed` to the members after a creation and a join, and to the members before a leave, the one
  who left included; none for the Party's switch, as for a friendship's. `quests-changed` to every Holder after a User
  becomes one by entering.
- **Accepted race**: dropping the last Holder of a marked Quest sets the Party's mark to null, which waits for the
  Party's row while a join holds it and waits for the Quest. PostgreSQL then aborts one of the two with a deadlock, and
  that request answers 500. It needs a marked Quest whose only Holder drops it while someone joins its Party.

### Agent usage (2026-10-04)

- Agent time: about 20 minutes, an estimate: one implementing agent. The session that ran the agents of all P08 tickets is counted once, under ticket 09.
- Tokens, counted from the agent's transcript:
  - Input: 20,032,861, of which 19,773,684 were cache reads, 258,973 cache writes and 204 uncached.
  - Output: 38,660, a lower bound, since the transcript records only part of the output of most steps.
