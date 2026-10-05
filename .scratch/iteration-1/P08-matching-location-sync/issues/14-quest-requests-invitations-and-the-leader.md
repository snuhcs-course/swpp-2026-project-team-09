# 14: Quest: requests, invitations and the Leader's controls

Parent: [P08 spec](../spec.md)
Status: ready-for-agent
Blocked by: 04 (Quests, their Sub Quests and joining them)

## What to build

A Leader decides who joins a Quest beyond an Open Quest's walk-in. A User asks to join an Approval Quest and the Leader accepts or declines. The Leader invites Friends whatever the Join Policy is, so that a Closed Quest takes the people the Leader knows, and the invited User accepts or declines. The Leader also changes the Quest's settings, which is how a Quest from attending a Global Event starts gathering people, hands the role to another Holder and removes a Holder.

Every entry follows ticket 04's rules: within capacity, and a User holds one Quest for a Global Event.

## Acceptance criteria

- [x] A User asks to join an Approval Quest, which leaves a request for its Leader, and sees that the request waits. The User can withdraw it. A second request to the same Quest is refused, and so are a request to an Open or a Closed Quest, one to a Quest the User holds, and one from a User who holds a Shared Quest for the Quest's Global Event.
- [x] The Leader lists the requests of the Quest with who asked, and accepts or declines each. Accepting adds the User as a Holder within capacity, checked inside the transaction that adds the Holder, under ticket 04's one-Quest rule. It is refused when the Quest is full, has no Sub Quest ahead, or the User holds a Shared Quest for its Global Event by then.
- [x] The Leader invites a Friend whatever the Join Policy is. A User who is not the Leader's Friend, and one already a Holder, cannot be invited. The invited User lists their invitations with the Quest and its Leader, and accepts or declines.
- [x] Accepting an invitation adds the User as a Holder within capacity under the one-Quest rule. It is refused when the Quest is full, has no Sub Quest ahead, or the User holds a Shared Quest for its Global Event, and the invitation then still waits.
- [x] A request and an invitation wait until they are answered. They end with the Quest and when their User becomes a Holder of that Quest in any way.
- [x] The Leader changes the capacity and the Join Policy, and the title of a Quest without a Global Event. A capacity outside 1 to 8 or below the number of Holders is refused, and so is a new title for a Quest with a Global Event. A Class Quest's settings cannot be changed.
- [x] The Leader hands the role to another Holder, and removes a Holder. A removed Holder loses their progress as one who dropped the Quest, and may join again.
- [x] Every action of this ticket that belongs to the Leader is refused for another Holder.
- [x] No action of this ticket opens, enters or changes a Party.
- [x] `quests-changed` goes to the Holders when the settings, the Leader or the Holders change, to the Leader when a request arrives or is withdrawn, to a User whose request or invitation was answered, to an invited User and to a removed Holder.
- [x] Main server tests at the API: the request from asking to each answer, the invitation from sending to each answer, a Quest held alone replaced on either entry, a Shared Quest blocking either entry, the last free place given to a request and an invitation accepted at the same moment, requests and invitations ending with the Quest and with their User's entry, each setting with its refusals, an attended Quest made Open and then joined, handing over, removal and joining again, and each of the Leader's actions refused for a Holder.
- [x] The main server's README records the routes for requests and invitations and when they end, and the Leader's controls with their refusals.

## Comments

### Decisions (2026-10-04)

- **Tables**: `quest_join_requests` and `quest_invitations`, each `(id, quest_id → quests ON DELETE CASCADE, user_id →
  users, sent_at)`, unique `(quest_id, user_id)`, index on `user_id`. A row is a waiting request or invitation; an
  answer deletes it. Migration `20261004220000_add_quest_join_requests_and_invitations`.
- **Routes**: `POST /quest-join-requests { questId }` → 201 `{ id, quest, sentAt }`; `GET /quest-join-requests`;
  `POST /quest-join-requests/:id/withdraw` → 204; `GET /quests/:questId/join-requests` → `[{ id, user: { id, name,
  department }, sentAt }]`; `POST /quests/:questId/join-requests/:id/accept|decline` → 204;
  `POST /quests/:questId/invitations { userId }` → 204; `GET /quest-invitations` → `[{ id, quest, sentAt }]`;
  `POST /quest-invitations/:id/accept` → 201 Quest; `POST /quest-invitations/:id/decline` → 204;
  `PATCH /quests/:questId { title?, capacity?, joinPolicy? }` → 200 Quest; `PUT /quests/:questId/leader { userId }` →
  204; `DELETE /quests/:questId/holders/:userId` → 204. Lists are the newest first. `quest` is
  `QuestSummaryDto` (`dto/quest.dto.ts`): the recruiting entry without `nextSubQuest`, which the recruiting entry now
  extends.
- **Refusals**: asking: `QUEST_NOT_FOUND` 404 (unknown or Closed, as joining), `ALREADY_HOLDER` 409,
  `QUEST_NOT_APPROVAL` 409 (Open), `QUEST_JOIN_REQUEST_ALREADY_SENT` 409, `SHARED_QUEST_HELD` 409;
  `QUEST_JOIN_REQUEST_NOT_FOUND` 404; inviting: `ALREADY_HOLDER` 409, `FRIEND_NOT_FOUND` 404,
  `QUEST_INVITATION_ALREADY_SENT` 409; `QUEST_INVITATION_NOT_FOUND` 404; the Leader's actions: `QUEST_NOT_FOUND` 404
  for a User who does not hold the Quest, `NOT_QUEST_LEADER` 403 for another Holder; settings:
  `CAPACITY_BELOW_HOLDERS` 409, `QUEST_TITLE_FROM_GLOBAL_EVENT` 409, 400 for a body outside the schema; handing over
  and removing: `NOT_QUEST_HOLDER` 404. Accepting either refuses as `RecruitingService.enter` does.
- **A waiting request under a changed Join Policy** stays, and the Leader may still accept or decline it: accepting is
  the Leader's own decision, as an invitation is. Once the Quest is Open the User may also join, which ends the
  request.
- **Ending**: `RecruitingService.enter` now also deletes the entering User's request and invitation of that Quest, so
  every way in ends them; the Quest's deletion cascades. Entering another Quest leaves them. A refused acceptance rolls
  back and leaves the request or invitation waiting. A User who holds the Quest alone for the event may ask; the
  Shared Quest check at asking is `QuestsService.holdsSharedQuestFor(userId, globalEventId, tx)`, without a lock.
- **Locking**: accepting, declining and withdrawing a request lock the User who asked first, so that one request gets
  one answer; accepting then calls `enter` with an `admits` that checks the Leader on the locked Quest. Removing a
  Holder locks that User, then the Quest. Every control checks the Leader after the Quest's lock
  (`LeaderService.lockLed`). Asking and inviting lock only the Quest.
- **Signals** (`quests-changed`): asking and withdrawing to the Leader at the time; accepting to the Holders after,
  the User included; declining a request to the User who asked; inviting and declining an invitation to the invited
  User; settings, handing over and removal to the Holders before, the removed one included.
- `LeaderService`, `JoinRequestsService` and `InvitationsService` are providers of `QuestsModule`, which now imports
  `FriendsModule`; none is exported. Refusal helpers `notLeader`, `alreadyHolder`, `sharedQuestHeld` and
  `notRecruiting` are in `src/quests/refusals.ts`.
- **Class Quests** are ticket 11's and not on this branch. A Class Quest's identifier is no stored Quest, so every
  route here answers it `QUEST_NOT_FOUND`, which is how its settings cannot be changed; ticket 11 needs no further
  check as long as Class Quests stay unstored.
- No Party exists on this branch, and nothing here touches one.
