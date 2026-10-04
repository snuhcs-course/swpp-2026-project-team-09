# 06: Party: Join Policies, invitations and the Leader's controls

Parent: [P08 spec](../spec.md)
Status: ready-for-agent
Blocked by: 05 (Party: forming, joining and leaving)

## What to build

A Leader decides who enters. In an Approval Party a User asks to join and the Leader accepts or declines. A Closed Party is in no list and takes only the Friends its Leader invites. An invited Friend accepts or declines, whatever the Join Policy is. The Leader also changes the Party's settings, hands the role to another member and removes a member.

## Acceptance criteria

- [x] A User asks to join an Approval Party, which leaves a request for its Leader, and sees that the request waits. The User can withdraw it. A second request to the same Party is refused, and so is a request to an Open or a Closed Party.
- [x] The Leader lists the requests with who asked, and accepts or declines each. Accepting adds the User within capacity, checked inside the transaction that adds the member; it is refused when the Party is full or the User is in a Party by then.
- [x] A Closed Party admits a User only by invitation, or as a Holder of its marked Quest (ticket 05).
- [x] The Leader invites a Friend. A User who is not the Leader's Friend, and one already a member, cannot be invited. The invited User lists their invitations with the Party and its Leader, and accepts or declines.
- [x] Accepting an invitation adds the User whatever the Join Policy is, within capacity. It is refused when the Party is full or the User is in a Party.
- [x] A request to join and an invitation wait until they are answered. They end when the Party ends and when their User enters any Party.
- [x] A User who enters a marked Party through a request or an invitation becomes a Holder as in ticket 05.
- [x] The Leader changes the title, the capacity and the Join Policy. A capacity below the number of members is refused.
- [x] The Leader hands the role to another member, and removes a member. A removed member may enter again.
- [x] Every action of this ticket that belongs to the Leader is refused for another member.
- [x] `party-changed` goes to the members when the Party's settings, its Leader or its members change, to the Leader when a request arrives or is withdrawn, to a User whose request or invitation was answered, to an invited User, and to a removed member.
- [x] `position-removed` goes at once to and about a removed member, as for one who left.
- [x] Main server tests at the API: the request from asking to each answer, the invitation from sending to each answer, the last free place given to a request and an invitation accepted at the same moment, requests and invitations ending with the Party and with their User's entry elsewhere, each of the Leader's controls and each refused for a member.
- [x] The main server's README records the three Join Policies, the routes for requests and invitations and when they end, and the Leader's controls.

## Comments

### Decisions (2026-10-04)

- **Tables**: `party_join_requests` and `party_invitations`, each `(id, party_id, user_id, sent_at)`, unique
  `(party_id, user_id)`, `party_id` `ON DELETE CASCADE` (they end with the Party). Migration
  `20261004180000_add_party_join_requests_and_invitations`. An invitation stores no inviter: it is the Party's, and the
  invited User sees its Leader now.
- **Ending on entry**: `PartiesService.admit` deletes every request and invitation of the User who enters, so joining,
  a Holder's entry, an accepted request and an accepted invitation end them. `create` does the same, since creating a
  Party enters it. No signal goes to the Leaders whose requests ended this way, nor to Users whose requests or
  invitations ended with a Party.
- **A User in another Party** may ask to join and may be invited; accepting is then refused with `ALREADY_IN_PARTY`
  until they left. A member of the Party itself is refused both (`ALREADY_MEMBER`).
- **A Join Policy changed after a request**: the request stays and the Leader can decline it, but accepting it is
  refused with `PARTY_NOT_APPROVAL` unless the Party is Approval again, so that a Closed Party admits only by
  invitation or a Holder's entry.
- **Routes, the asking User's**: `POST /party-join-requests { partyId }` → 201 `{ id, party: ListedParty, sentAt }`;
  `GET /party-join-requests` → that shape, newest first; `POST /party-join-requests/:id/withdraw` → 204.
- **Routes, the Leader's**: `GET /parties/mine/join-requests` → `[{ id, user: { id, name, department }, sentAt }]`,
  newest first; `POST /parties/mine/join-requests/:id/accept` and `…/decline` → 204;
  `POST /parties/mine/invitations { userId }` → 204; `PATCH /parties/mine { title?, capacity?, joinPolicy? }` → 200
  Party; `PUT /parties/mine/leader { userId }` → 204; `DELETE /parties/mine/members/:userId` → 204.
- **Routes, the invited User's**: `GET /party-invitations` → `[{ id, party: ListedParty, leader: { id, name,
  department }, sentAt }]`, newest first; `POST /party-invitations/:id/accept` → 201 Party;
  `POST /party-invitations/:id/decline` → 204.
- **Refusals**: `PARTY_NOT_APPROVAL` 409, `ALREADY_MEMBER` 409, `JOIN_REQUEST_ALREADY_SENT` 409,
  `JOIN_REQUEST_NOT_FOUND` 404 (also a request of another Party named by its Leader), `FRIEND_NOT_FOUND` 404,
  `PARTY_INVITATION_ALREADY_SENT` 409, `PARTY_INVITATION_NOT_FOUND` 404, `NOT_PARTY_LEADER` 403,
  `CAPACITY_BELOW_MEMBERS` 409, `NOT_PARTY_MEMBER` 404 (handing over to, or removing, a non-member); and from ticket 05
  `NOT_IN_PARTY`, `PARTY_NOT_FOUND`, `ALREADY_IN_PARTY`, `PARTY_FULL`.
- **Locks**: accepting a request and removing a member lock the User who enters or goes, then the Party, and check the
  Leader after the Party's lock (`LeaderService.lockLed`). Accepting an invitation locks the invited User, then the
  Party. Asking, inviting, declining a request, the settings and handing over lock only the Party. Withdrawing locks the
  asking User, so that a request is not both withdrawn and accepted.
- **Module**: `LeaderService` (`ledBy(userId): partyId`, refusing `NOT_IN_PARTY` and `NOT_PARTY_LEADER` without a
  lock; `lockLed(partyId, userId, tx): Party`; the settings, handing over and removal), `JoinRequestsService` and
  `InvitationsService` beside `PartiesService`, whose `lock` is now public and which gains `memberIds(partyId, tx)`.
  The refusal helpers moved to `src/parties/refusals.ts`. Ticket 05's operations behave as before apart from `admit`
  and `create` ending the User's requests and invitations.
- **Signals**: `party-changed` to the Leader when a request arrives or is withdrawn; to the members, the entering User
  included, when a request or invitation is accepted (and `quests-changed` to the Holders when the User became one); to
  the asking User when declined; to the invited User when invited and when they decline; to the members after a
  settings change or a hand-over; to the members before a removal, the removed one included. A removal runs inside
  `VisibilityService.announceRemovals` for the removed member.

### Agent usage (2026-10-04)

- Agent time: about 20 minutes, an estimate: one implementing agent. The session that ran the agents of all P08 tickets is counted once, under ticket 09.
- Tokens, counted from the agent's transcript:
  - Input: 14,213,409, of which 13,989,897 were cache reads, 223,354 cache writes and 158 uncached.
  - Output: 21,321, a lower bound, since the transcript records only part of the output of most steps.
