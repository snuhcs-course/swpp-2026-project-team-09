# 14: Quest: requests, invitations and the Leader's controls

Parent: [P08 spec](../spec.md)
Status: ready-for-agent
Blocked by: 04 (Quests, their Sub Quests and joining them)

## What to build

A Leader decides who joins a Quest beyond an Open Quest's walk-in. A User asks to join an Approval Quest and the Leader accepts or declines. The Leader invites Friends whatever the Join Policy is, so that a Closed Quest takes the people the Leader knows, and the invited User accepts or declines. The Leader also changes the Quest's settings, which is how a Quest from attending a Global Event starts gathering people, hands the role to another Holder and removes a Holder.

Every entry follows ticket 04's rules: within capacity, and a User holds one Quest for a Global Event.

## Acceptance criteria

- [ ] A User asks to join an Approval Quest, which leaves a request for its Leader, and sees that the request waits. The User can withdraw it. A second request to the same Quest is refused, and so are a request to an Open or a Closed Quest, one to a Quest the User holds, and one from a User who holds a Shared Quest for the Quest's Global Event.
- [ ] The Leader lists the requests of the Quest with who asked, and accepts or declines each. Accepting adds the User as a Holder within capacity, checked inside the transaction that adds the Holder, under ticket 04's one-Quest rule. It is refused when the Quest is full, has no Sub Quest ahead, or the User holds a Shared Quest for its Global Event by then.
- [ ] The Leader invites a Friend whatever the Join Policy is. A User who is not the Leader's Friend, and one already a Holder, cannot be invited. The invited User lists their invitations with the Quest and its Leader, and accepts or declines.
- [ ] Accepting an invitation adds the User as a Holder within capacity under the one-Quest rule. It is refused when the Quest is full, has no Sub Quest ahead, or the User holds a Shared Quest for its Global Event, and the invitation then still waits.
- [ ] A request and an invitation wait until they are answered. They end with the Quest and when their User becomes a Holder of that Quest in any way.
- [ ] The Leader changes the capacity and the Join Policy, and the title of a Quest without a Global Event. A capacity outside 1 to 8 or below the number of Holders is refused, and so is a new title for a Quest with a Global Event. A Class Quest's settings cannot be changed.
- [ ] The Leader hands the role to another Holder, and removes a Holder. A removed Holder loses their progress as one who dropped the Quest, and may join again.
- [ ] Every action of this ticket that belongs to the Leader is refused for another Holder.
- [ ] No action of this ticket opens, enters or changes a Party.
- [ ] `quests-changed` goes to the Holders when the settings, the Leader or the Holders change, to the Leader when a request arrives or is withdrawn, to a User whose request or invitation was answered, to an invited User and to a removed Holder.
- [ ] Main server tests at the API: the request from asking to each answer, the invitation from sending to each answer, a Quest held alone replaced on either entry, a Shared Quest blocking either entry, the last free place given to a request and an invitation accepted at the same moment, requests and invitations ending with the Quest and with their User's entry, each setting with its refusals, an attended Quest made Open and then joined, handing over, removal and joining again, and each of the Leader's actions refused for a Holder.
- [ ] The main server's README records the routes for requests and invitations and when they end, and the Leader's controls with their refusals.
