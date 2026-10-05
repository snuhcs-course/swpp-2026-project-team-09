# 06: Party: requests from Friends, invitations and the Leader's controls

Parent: [P08 spec](../spec.md)
Status: ready-for-agent
Blocked by: 05 (Party: opening, entering and leaving)

## What to build

A Leader decides who enters beyond the Holders of the Party's Quest. A Friend of a member asks to enter an Approval Party and the Leader accepts or declines. A Closed Party takes only the Holders of its Quest and the people its Leader invites. The Leader invites a Friend or a Holder of the Party's Quest whatever the Join Policy is, and the invited User accepts or declines. The Leader also changes the Party's settings, hands the role to another member and removes a member.

As in ticket 05, entering a Party changes no Quest.

## Acceptance criteria

- [x] A Friend of a member asks to enter an Approval Party, which leaves a request for its Leader, and sees that the request waits. The User can withdraw it. A second request to the same Party is refused, and so is a request to an Open or a Closed Party. A User who is not a Friend of any member is refused as for an unknown Party.
- [x] The Leader lists the requests with who asked, and accepts or declines each. Accepting adds the User within capacity, checked inside the transaction that adds the member; it is refused when the Party is full or the User is in a Party by then.
- [x] A Closed Party admits a User only by invitation, or as a Holder of its Quest (ticket 05).
- [x] The Leader invites a Friend or a Holder of the Party's Quest. Any other User, and one already a member, cannot be invited. The invited User lists their invitations with the Party and its Leader, and accepts or declines.
- [x] Accepting an invitation adds the User whatever the Join Policy is, within capacity. It is refused when the Party is full or the User is in a Party.
- [x] A request and an invitation wait until they are answered. They end when the Party ends and when their User enters any Party.
- [x] A User who enters through a request or an invitation does not become a Holder of the Party's Quest.
- [x] The Leader changes the title, the capacity and the Join Policy. A capacity below the number of members is refused.
- [x] The Leader hands the role to another member, and removes a member. A removed member may enter again.
- [x] Every action of this ticket that belongs to the Leader is refused for another member.
- [x] `party-changed` goes to the members, the Holders of the Party's Quest and the Friends of its members when the Party's settings or its members change, and to the members when its Leader changes; to the Leader when a request arrives or is withdrawn; to a User whose request or invitation was answered; to an invited User; and to a removed member.
- [x] `position-removed` goes at once to and about a removed member, as for one who left.
- [x] Main server tests at the API: the request from asking to each answer, the invitation of a Friend and of a Holder from sending to each answer, the last free place given to a request and an invitation accepted at the same moment, requests and invitations ending with the Party and with their User's entry elsewhere, Quests unchanged by either entry, each of the Leader's controls and each refused for a member.
- [x] The main server's README records who asks and who is invited under each Join Policy, the routes for requests and invitations and when they end, and the Leader's controls.

## Comments

### Decisions (2026-10-05)

- **Tables**: `party_join_requests` and `party_invitations`, each `(id, party_id, user_id, sent_at)`, unique
  `(party_id, user_id)`, `party_id` `ON DELETE CASCADE` (they end with the Party). Migration
  `20261004180000_add_party_join_requests_and_invitations`. An invitation stores no inviter: it is the Party's, and the
  invited User sees its Leader now. The Join Policy is the shared enum `JoinPolicy`; a Party's default is Closed.
- **Who asks**: whoever can see the Party (`PartiesService.canSee`): a Friend of any member, and also a Holder of the
  Party's Quest, who could enter at once instead. Anyone else is refused with `PARTY_NOT_FOUND`, as ticket 05's join
  is. Only an Approval Party takes a request (`PARTY_NOT_APPROVAL`).
- **Who is invited**: a Friend of the Leader or a Holder of the Party's Quest, under any Join Policy; anyone else is
  refused with `INVITEE_NOT_FOUND`. Neither friendship nor holding is checked again on accepting.
- **A request under a changed Join Policy**: it stays when the Leader changes the Join Policy, and the Leader may still
  accept or decline it, as the Quest's requests (ticket 14): accepting is the Leader's own decision, as an invitation is.
- **Entering changes no Quest**: an accepted request or invitation adds only the member; no `quests-changed` is sent.
- **Ending**: `PartiesService.admit` and opening delete every request and invitation of the User who enters, so any way
  in ends them. No signal goes to the Leaders whose requests ended this way.
- **A User in another Party** may ask and be invited; accepting is then refused with `ALREADY_IN_PARTY` until they
  left. A member of the Party itself is refused both (`ALREADY_MEMBER`).
- **Routes, the asking User's**: `POST /party-join-requests { partyId }` → 201 `{ id, party, sentAt }`, the Party as
  `GET /parties` shows it; `GET /party-join-requests` → that shape, newest first; `POST
  /party-join-requests/:id/withdraw` → 204.
- **Routes, the Leader's**: `GET /parties/mine/join-requests` → `[{ id, user: { id, name, department }, sentAt }]`,
  newest first; `POST /parties/mine/join-requests/:id/accept` and `…/decline` → 204;
  `POST /parties/mine/invitations { userId }` → 204; `PATCH /parties/mine { title?, capacity?, joinPolicy? }` → 200
  Party; `PUT /parties/mine/leader { userId }` → 204; `DELETE /parties/mine/members/:userId` → 204.
- **Routes, the invited User's**: `GET /party-invitations` → `[{ id, party, leader: { id, name, department }, sentAt }]`,
  the Party as `GET /parties` shows it, newest first; `POST /party-invitations/:id/accept` → 201 Party;
  `POST /party-invitations/:id/decline` → 204.
- **Refusals**: `PARTY_NOT_APPROVAL` 409, `ALREADY_MEMBER` 409, `JOIN_REQUEST_ALREADY_SENT` 409,
  `JOIN_REQUEST_NOT_FOUND` 404 (also a request of another Party named by its Leader), `INVITEE_NOT_FOUND` 404,
  `PARTY_INVITATION_ALREADY_SENT` 409, `PARTY_INVITATION_NOT_FOUND` 404, `NOT_PARTY_LEADER` 403,
  `CAPACITY_BELOW_MEMBERS` 409, `NOT_PARTY_MEMBER` 404 (handing over to, or removing, a non-member); and from ticket 05
  `NOT_IN_PARTY`, `PARTY_NOT_FOUND`, `ALREADY_IN_PARTY`, `PARTY_FULL`.
- **Locks**: accepting a request and removing a member lock the User who enters or goes, then the Party, and check the
  Leader after the Party's lock (`LeaderService.lockLed`). Accepting an invitation locks the invited User, then the
  Party. Asking, inviting, declining a request, the settings and handing over lock only the Party. Withdrawing locks the
  asking User, so that a request is not both withdrawn and accepted. Declines and withdrawals use `deleteMany` and its
  count for races.
- **Module**: `LeaderService` (`ledBy(userId): partyId`, refusing `NOT_IN_PARTY` and `NOT_PARTY_LEADER` without a
  lock; `lockLed(partyId, userId, tx): Party`; the settings, handing over and removal), `JoinRequestsService` and
  `InvitationsService` beside `PartiesService`, which gains public `lock`, `memberIds(party, tx)`,
  `canSee(party, userId, tx)` and `holdsQuest(party, userId, tx)`. The refusal helpers are in `src/parties/refusals.ts`.
- **Signals**: `party-changed` to `audienceOf` (the members, the Holders of the Party's Quest and the Friends of its
  members) when a request or invitation is accepted, after a settings change and before a removal, the removed one
  included; to the members after a hand-over; to the Leader when a request arrives or is withdrawn; to the asking User
  when declined; to the invited User when invited and when they decline. A removal runs inside
  `VisibilityService.announceRemovals` for the removed member.

### Agent usage (2026-10-04)

- Agent time: about 20 minutes, an estimate: one implementing agent. The session that ran the agents of all P08 tickets is counted once, under ticket 09.
- Tokens, counted from the agent's transcript:
  - Input: 14,213,409, of which 13,989,897 were cache reads, 223,354 cache writes and 158 uncached.
  - Output: 21,321, a lower bound, since the transcript records only part of the output of most steps.

### Agent usage (2026-10-06)

- Agent time: about 27 minutes, an estimate: one agent that reworked the ticket for the Party as the group that is together now, in two runs. The session that ran it is not counted here.
- Tokens, counted from the agent's transcript, a lower bound, since the transcript records only part of the second run and of the output:
  - Input: 10,718,606, of which 10,527,592 were cache reads, 190,874 cache writes and 140 uncached.
  - Output: 6,109.
