# 06: Party: requests from Friends, invitations and the Leader's controls

Parent: [P08 spec](../spec.md)
Status: ready-for-agent
Blocked by: 05 (Party: opening, entering and leaving)

## What to build

A Leader decides who enters beyond the Holders of the Party's Quest. A Friend of a member asks to enter an Approval Party and the Leader accepts or declines. A Closed Party takes only the Holders of its Quest and the people its Leader invites. The Leader invites a Friend or a Holder of the Party's Quest whatever the Join Policy is, and the invited User accepts or declines. The Leader also changes the Party's settings, hands the role to another member and removes a member.

As in ticket 05, entering a Party changes no Quest.

## Acceptance criteria

- [ ] A Friend of a member asks to enter an Approval Party, which leaves a request for its Leader, and sees that the request waits. The User can withdraw it. A second request to the same Party is refused, and so is a request to an Open or a Closed Party. A User who is not a Friend of any member is refused as for an unknown Party.
- [ ] The Leader lists the requests with who asked, and accepts or declines each. Accepting adds the User within capacity, checked inside the transaction that adds the member; it is refused when the Party is full or the User is in a Party by then.
- [ ] A Closed Party admits a User only by invitation, or as a Holder of its Quest (ticket 05).
- [ ] The Leader invites a Friend or a Holder of the Party's Quest. Any other User, and one already a member, cannot be invited. The invited User lists their invitations with the Party and its Leader, and accepts or declines.
- [ ] Accepting an invitation adds the User whatever the Join Policy is, within capacity. It is refused when the Party is full or the User is in a Party.
- [ ] A request and an invitation wait until they are answered. They end when the Party ends and when their User enters any Party.
- [ ] A User who enters through a request or an invitation does not become a Holder of the Party's Quest.
- [ ] The Leader changes the title, the capacity and the Join Policy. A capacity below the number of members is refused.
- [ ] The Leader hands the role to another member, and removes a member. A removed member may enter again.
- [ ] Every action of this ticket that belongs to the Leader is refused for another member.
- [ ] `party-changed` goes to the members, the Holders of the Party's Quest and the Friends of its members when the Party's settings or its members change, and to the members when its Leader changes; to the Leader when a request arrives or is withdrawn; to a User whose request or invitation was answered; to an invited User; and to a removed member.
- [ ] `position-removed` goes at once to and about a removed member, as for one who left.
- [ ] Main server tests at the API: the request from asking to each answer, the invitation of a Friend and of a Holder from sending to each answer, the last free place given to a request and an invitation accepted at the same moment, requests and invitations ending with the Party and with their User's entry elsewhere, Quests unchanged by either entry, each of the Leader's controls and each refused for a member.
- [ ] The main server's README records who asks and who is invited under each Join Policy, the routes for requests and invitations and when they end, and the Leader's controls.
