# 05: Party: opening, entering and leaving

Parent: [P08 spec](../spec.md)
Status: ready-for-agent
Blocked by: 03 (Location Sharing between Friends), 04 (Quests, their Sub Quests and joining them)

## What to build

A Party is the group that is together now. When the time comes, a Holder opens the Party of one of their Quests, or a User opens one tied to no Quest to be with Friends. The other Holders of the Quest are told and enter at once. A Friend of a member sees that the Friend is in a Party and enters it when it is Open. The members see who is in it and who leads, see each other's Avatars under a switch for the Party, and leave when they wish; the Party goes on under its longest-standing member and ends with its last one.

Entering a Party never changes Quests: joining the plan goes through the Quest. Nobody shares a location with a Party before entering it.

Asking to enter an Approval Party, invitations and the Leader's controls are ticket 06.

## Acceptance criteria

- [ ] Opening a Party takes a title, a capacity from 1 to 8 that is 4 when left out, a Join Policy that is Closed when left out, and optionally one of the opener's Quests. The opener is its Leader and its first member. A Quest whose Sub Quests have all passed, a Class Quest and a Quest the opener does not hold cannot be given. The Party's Quest never changes.
- [ ] A User is in at most one Party, which the database enforces. Opening or entering while in a Party is refused with a code that says so.
- [ ] At most one running Party has a given Quest, which the database enforces. A second opening for the same Quest is refused with a code and names the existing Party. After that Party ended, a new one can be opened for the Quest.
- [ ] A Holder of the Party's Quest enters at once, whatever the Join Policy is.
- [ ] A Friend of any member enters an Open Party at once. An Approval or a Closed Party refuses that Friend's entry with a code, and a User who is neither a Holder of its Quest nor a Friend of a member is refused as for an unknown Party.
- [ ] Every entry holds only within capacity, which is checked inside the transaction that adds the member; a full Party refuses with a code.
- [ ] Entering a Party changes no Quest: a User who enters without holding the Party's Quest does not become its Holder, and a Quest the User holds for the same Global Event stays.
- [ ] A User lists the Parties they can see and are not in: the running Parties of the Quests they hold and the Parties their Friends are in. Each has its title, its number of members, its capacity, its Join Policy, its Quest if any, whether the User holds that Quest, and which of the User's Friends are in it. No position is in the list.
- [ ] No list shows a Party to a User who neither holds its Quest nor is a Friend of a member, and no list of Parties exists for a Global Event.
- [ ] A member leaves. When the Leader leaves, the member who entered earliest becomes Leader. When the last member leaves, the Party ends. A Party never ends by itself.
- [ ] Leaving and the Party's end leave every Quest untouched. Dropping the Party's Quest leaves the membership untouched, and when its last Holder drops it the Party goes on tied to no Quest.
- [ ] A User reads their Party: its title, capacity, Join Policy and Quest, and its members in the order they entered, with the Leader marked and, for each member, whether the User can see them now.
- [ ] Each member has a switch for the Party, which starts on. The visibility module counts a common Party whose switch is on at both ends as a relationship, and its table gains the Party's columns: a User hidden from a Friend by the friendship's switch is still seen through the Party. A Holder of the Party's Quest who has not entered sees none of its members through it.
- [ ] Positions are pushed to the Party members who may see the subject, and `position-removed` goes at once when a member leaves, turns the Party's switch off, or the Party ends.
- [ ] `party-changed` goes to the members, the Holders of the Party's Quest and the Friends of its members when the Party opens or ends and when its members change, and to a member who left.
- [ ] Concurrency tests: two Users entering the last free place, two Holders opening a Party for the same Quest, and one User entering two Parties each leave what the rules allow.
- [ ] Main server tests at the API: opening and its refusals, a Holder's entry under each Join Policy, a Friend's entry under each Join Policy, a stranger refused, Quests unchanged by entering, leaving with the Leader's succession, the end and a new Party for the same Quest, the list of Parties a User can see, the Party's switch, and the signals with their recipients.
- [ ] The main server's README records the Party routes and refusals, the two rules the database enforces, who can see and enter a Party, that entering changes no Quest, and the Party as a relationship of Location Sharing.
