# 05: Party: opening, entering and leaving

Parent: [P08 spec](../spec.md)
Status: ready-for-agent
Blocked by: 03 (Location Sharing between Friends), 04 (Quests, their Sub Quests and joining them)

## What to build

A Party is the group that is together now. When the time comes, a Holder opens the Party of one of their Quests, or a User opens one tied to no Quest to be with Friends. The other Holders of the Quest are told and enter at once. A Friend of a member sees that the Friend is in a Party and enters it when it is Open. The members see who is in it and who leads, see each other's Avatars under a switch for the Party, and leave when they wish; the Party goes on under its longest-standing member and ends with its last one.

Entering a Party never changes Quests: joining the plan goes through the Quest. Nobody shares a location with a Party before entering it.

Asking to enter an Approval Party, invitations and the Leader's controls are ticket 06.

## Acceptance criteria

- [x] Opening a Party takes a title, a capacity from 1 to 8 that is 4 when left out, a Join Policy that is Closed when left out, and optionally one of the opener's Quests. The opener is its Leader and its first member. A Quest whose Sub Quests have all passed, a Class Quest and a Quest the opener does not hold cannot be given. The Party's Quest never changes.
- [x] A User is in at most one Party, which the database enforces. Opening or entering while in a Party is refused with a code that says so.
- [x] At most one running Party has a given Quest, which the database enforces. A second opening for the same Quest is refused with a code and names the existing Party. After that Party ended, a new one can be opened for the Quest.
- [x] A Holder of the Party's Quest enters at once, whatever the Join Policy is.
- [x] A Friend of any member enters an Open Party at once. An Approval or a Closed Party refuses that Friend's entry with a code, and a User who is neither a Holder of its Quest nor a Friend of a member is refused as for an unknown Party.
- [x] Every entry holds only within capacity, which is checked inside the transaction that adds the member; a full Party refuses with a code.
- [x] Entering a Party changes no Quest: a User who enters without holding the Party's Quest does not become its Holder, and a Quest the User holds for the same Global Event stays.
- [x] A User lists the Parties they can see and are not in: the running Parties of the Quests they hold and the Parties their Friends are in. Each has its title, its number of members, its capacity, its Join Policy, its Quest if any, whether the User holds that Quest, and which of the User's Friends are in it. No position is in the list.
- [x] No list shows a Party to a User who neither holds its Quest nor is a Friend of a member, and no list of Parties exists for a Global Event.
- [x] A member leaves. When the Leader leaves, the member who entered earliest becomes Leader. When the last member leaves, the Party ends. A Party never ends by itself.
- [x] Leaving and the Party's end leave every Quest untouched. Dropping the Party's Quest leaves the membership untouched, and when its last Holder drops it the Party goes on tied to no Quest.
- [x] A User reads their Party: its title, capacity, Join Policy and Quest, and its members in the order they entered, with the Leader marked and, for each member, whether the User can see them now.
- [x] Each member has a switch for the Party, which starts on. The visibility module counts a common Party whose switch is on at both ends as a relationship, and its table gains the Party's columns: a User hidden from a Friend by the friendship's switch is still seen through the Party. A Holder of the Party's Quest who has not entered sees none of its members through it.
- [x] Positions are pushed to the Party members who may see the subject, and `position-removed` goes at once when a member leaves, turns the Party's switch off, or the Party ends.
- [x] `party-changed` goes to the members, the Holders of the Party's Quest and the Friends of its members when the Party opens or ends and when its members change, and to a member who left.
- [x] Concurrency tests: two Users entering the last free place, two Holders opening a Party for the same Quest, and one User entering two Parties each leave what the rules allow.
- [x] Main server tests at the API: opening and its refusals, a Holder's entry under each Join Policy, a Friend's entry under each Join Policy, a stranger refused, Quests unchanged by entering, leaving with the Leader's succession, the end and a new Party for the same Quest, the list of Parties a User can see, the Party's switch, and the signals with their recipients.
- [x] The main server's README records the Party routes and refusals, the two rules the database enforces, who can see and enter a Party, that entering changes no Quest, and the Party as a relationship of Location Sharing.

## Comments

### Decisions (2026-10-05)

- **Tables**: `parties` (`title`, `capacity` with a CHECK from 1 to 8, `join_policy` of the shared enum `join_policy`
  (`JoinPolicy` in Prisma, ticket 04's), `leader_id`, `quest_id` the Party's Quest, `created_at`) and `party_members`
  (`party_id` cascade, `user_id`, `joined_at` from `clock_timestamp()`, `sharing` default true). Migration
  `20261004170000_add_parties`.
- **The two database rules**: unique `party_members.user_id` (one Party per User) and unique `parties.quest_id` (one
  running Party per Quest). An ended Party's row is deleted with its members, so a new Party can be opened for the
  Quest. `quest_id` is `ON DELETE SET NULL`: when the last Holder drops the Quest, the Party goes on tied to no Quest.
- **A Class Quest cannot be given**: it is computed and never stored (ticket 11), so its identifier is no stored Quest
  of the opener and gets `QUEST_NOT_FOUND`. No code of its own.
- **Routes**: `POST /parties { title (1–50), capacity? (1–8, 4), joinPolicy? (closed), questId? }` → 201 Party;
  `GET /parties` → the Parties the User can see and is not in, newest first; `POST /parties/:partyId/join` → 201 Party;
  `GET /parties/mine` → Party; `POST /parties/mine/leave` → 204; `PUT /parties/mine/sharing { on }` → 204.
- **Party shape**: `{ id, title, capacity, joinPolicy, quest: { id, title, globalEvent: { id, title } | null } | null,
  sharing, members: [{ id, name, department, leader, visible }] }`, members in the order they entered, the reader
  included; `sharing` is the reader's own switch.
- **List entry shape**: `{ id, title, memberCount, capacity, joinPolicy, quest, holdsQuest, friends: [{ id, name,
  department }] }`. A Party is listed for a Holder of its Quest and for a Friend of any member, under every Join Policy.
  The list does not filter by Sub Quests ahead.
- **Who enters by `join`**: a Holder of the Party's Quest under any Join Policy; a Friend of any member when `open`.
  The checks run after the User's and the Party's locks, in this order: `PARTY_NOT_FOUND`, `ALREADY_IN_PARTY`, then a
  User who is neither gets `PARTY_NOT_FOUND`, a Friend of a non-Open Party `PARTY_NOT_OPEN`, then `PARTY_FULL`.
- **Refusals**: `ALREADY_IN_PARTY` 409, `QUEST_NOT_FOUND` 404, `QUEST_ENDED` 409, `PARTY_EXISTS_FOR_QUEST` 409 with
  `partyId` in the body, `PARTY_NOT_FOUND` 404 (not running, or not visible to the User), `PARTY_NOT_OPEN` 409 (a
  Friend entering an Approval or Closed Party), `PARTY_FULL` 409, `NOT_IN_PARTY` 404.
- **Locks**: every membership change locks the User's row (`UsersService.lock`), then the Party's (`SELECT … FOR NO KEY
  UPDATE`, the private `PartiesService.lock(partyId, tx)`, which refuses `PARTY_NOT_FOUND`). Opening the Party of a
  Quest locks the User, then the Quest. Entering locks no Quest. The capacity is counted after the Party's lock.
- **For ticket 06**, in `PartiesService`:
  - `admit(party: Party, userId: string, tx): Promise<string[]>` refuses `ALREADY_IN_PARTY` and `PARTY_FULL`, adds the
    member, and answers the audience after the change. It changes no Quest. Call it after the User's row and then the
    Party's are locked.
  - `removeMember(party: Party, userId: string, tx): Promise<string[]>` takes the member out, hands the Leader's role
    to the member who entered earliest, ends the Party with its last member, and answers the audience before the
    change, the member and their Friends included. Wrap the transaction in `VisibilityService.announceRemovals(userId,
    …)`; same locks.
  - `audienceOf(party: Pick<Party, 'id' | 'questId'>, tx): Promise<string[]>`: the members, the Holders of the Party's
    Quest and the Friends of its members, for a change to the settings. Send `party-changed` to an answered audience
    after the commit.
- **`FriendsService.friendsOfAny(userIds, tx?): Promise<string[]>`**: the Users who are a Friend of any of these, in one
  query. The Party's entry check, its audience and its list use it.
- **`VisibilityService`**: `linkedTo` joins the members of a common Party with both `party_members.sharing` on to the
  Friends. Holding the Party's Quest is no relationship; `test/visibility.e2e-spec.ts` checks it beside the table.
- **Signals**: `party-changed` to the audience on opening, entry, leaving and the end; none for the Party's switch, as
  for a friendship's. No `quests-changed`: entering changes no Quest. The app fetches `GET /parties/mine` and
  `GET /parties`.

### Agent usage (2026-10-04)

- Agent time: about 20 minutes, an estimate: one implementing agent. The session that ran the agents of all P08 tickets is counted once, under ticket 09.
- Tokens, counted from the agent's transcript:
  - Input: 20,032,861, of which 19,773,684 were cache reads, 258,973 cache writes and 204 uncached.
  - Output: 38,660, a lower bound, since the transcript records only part of the output of most steps.

### Agent usage (2026-10-05)

- Agent time: about 18 minutes, an estimate: one agent that reworked the ticket for the Party as the group that is together now. The session that ran it is not counted here.
- Tokens, counted from the agent's transcript:
  - Input: 14,548,078, of which 14,315,675 were cache reads, 232,233 cache writes and 170 uncached.
  - Output: 14,421, a lower bound, since the transcript records only part of the output of most steps.
