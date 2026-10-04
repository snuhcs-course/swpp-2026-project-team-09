# 05: Party: forming, joining and leaving

Parent: [P08 spec](../spec.md)
Status: ready-for-agent
Blocked by: 03 (Location Sharing between Friends), 04 (Quests for Global Events and their Sub Quests)

## What to build

A User creates a Party, alone or marked with one of their Quests, and others find it in a list and join. The members see who is in it and who leads, see each other's Avatars under a switch for the Party, and leave when they wish; the Party goes on under its longest-standing member and ends with its last one.

This ticket covers a Party that is Open, and the entry of a Holder of the marked Quest under any Join Policy. Asking to join, invitations and the Leader's controls are ticket 06.

## Acceptance criteria

- [ ] Creating a Party takes a title, a capacity from 1 to 8 that is 4 when left out, a Join Policy and an optional mark naming one of the creator's Quests. The creator is its Leader and its first member. A Quest whose Sub Quests have all passed, and a Quest the creator does not hold, cannot be the mark. The mark never changes.
- [ ] A User is in at most one Party, which the database enforces. Creating or joining while in a Party is refused with a code that says so.
- [ ] At most one running Party carries a Quest as its mark, which the database enforces. A second creation for the same Quest is refused with a code and names the existing Party. After that Party ended, a new one can be created for the Quest.
- [ ] A User joins an Open Party at once. A Holder of the marked Quest joins at once whatever the Join Policy is. Both hold only within capacity, which is checked inside the transaction that adds the member; a full Party refuses with a code.
- [ ] A User who enters a marked Party without holding its Quest becomes a Holder of it. A Quest the User held alone for the same Global Event is deleted, with its Sub Quests and the User's progress. A User who holds a Shared Quest for that Global Event keeps it and does not become a Holder.
- [ ] A member leaves. When the Leader leaves, the member who joined earliest becomes Leader. When the last member leaves, the Party ends. A Party never ends by itself.
- [ ] Leaving and the Party's end leave every Quest untouched, and dropping the marked Quest leaves the membership untouched.
- [ ] A User reads their Party: its title, capacity, Join Policy and mark, and its members in the order they joined, with the Leader marked and, for each member, whether the User can see them now.
- [ ] A list returns the Open and Approval Parties, and the same for one Global Event: the Parties marked with a Quest of that event while the Quest has Sub Quests ahead. A Closed Party is in neither.
- [ ] Each member has a switch for the Party, which starts on. The visibility module counts a common Party whose switch is on at both ends as a relationship, and its table gains the Party's columns: a User hidden from a Friend by the friendship's switch is still seen through the Party.
- [ ] Positions are pushed to the Party members who may see the subject, and `position-removed` goes at once when a member leaves, turns the Party's switch off, or the Party ends.
- [ ] `party-changed` goes to the members when the Party or its membership changes, and to a member who left. `quests-changed` goes to the Holders when a User becomes a Holder by entering.
- [ ] Concurrency tests: two Users joining the last free place, two Holders creating a Party for the same Quest, and one User joining two Parties each leave what the rules allow.
- [ ] Main server tests at the API: creation and its refusals, each way of entering, the Quest gained or kept on entering, leaving with the Leader's succession, the end and a new Party for the same Quest, the lists, and the Party's switch.
- [ ] The main server's README records the Party routes and refusals, the two rules the database enforces, how entering a marked Party changes Quests, and the Party as a relationship of Location Sharing.
