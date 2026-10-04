# 06: Party: Join Policies, invitations and the Leader's controls

Parent: [P08 spec](../spec.md)
Status: ready-for-agent
Blocked by: 05 (Party: forming, joining and leaving)

## What to build

A Leader decides who enters. In an Approval Party a User asks to join and the Leader accepts or declines. A Closed Party is in no list and takes only the Friends its Leader invites. An invited Friend accepts or declines, whatever the Join Policy is. The Leader also changes the Party's settings, hands the role to another member and removes a member.

## Acceptance criteria

- [ ] A User asks to join an Approval Party, which leaves a request for its Leader, and sees that the request waits. The User can withdraw it. A second request to the same Party is refused, and so is a request to an Open or a Closed Party.
- [ ] The Leader lists the requests with who asked, and accepts or declines each. Accepting adds the User within capacity, checked inside the transaction that adds the member; it is refused when the Party is full or the User is in a Party by then.
- [ ] A Closed Party admits a User only by invitation, or as a Holder of its marked Quest (ticket 05).
- [ ] The Leader invites a Friend. A User who is not the Leader's Friend, and one already a member, cannot be invited. The invited User lists their invitations with the Party and its Leader, and accepts or declines.
- [ ] Accepting an invitation adds the User whatever the Join Policy is, within capacity. It is refused when the Party is full or the User is in a Party.
- [ ] A request to join and an invitation wait until they are answered. They end when the Party ends and when their User enters any Party.
- [ ] A User who enters a marked Party through a request or an invitation becomes a Holder as in ticket 05.
- [ ] The Leader changes the title, the capacity and the Join Policy. A capacity below the number of members is refused.
- [ ] The Leader hands the role to another member, and removes a member. A removed member may enter again.
- [ ] Every action of this ticket that belongs to the Leader is refused for another member.
- [ ] `party-changed` goes to the members when the Party's settings, its Leader or its members change, to the Leader when a request arrives or is withdrawn, to a User whose request or invitation was answered, to an invited User, and to a removed member.
- [ ] `position-removed` goes at once to and about a removed member, as for one who left.
- [ ] Main server tests at the API: the request from asking to each answer, the invitation from sending to each answer, the last free place given to a request and an invitation accepted at the same moment, requests and invitations ending with the Party and with their User's entry elsewhere, each of the Leader's controls and each refused for a member.
- [ ] The main server's README records the three Join Policies, the routes for requests and invitations and when they end, and the Leader's controls.
