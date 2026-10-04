# 04: Quests for Global Events and their Sub Quests

Parent: [P08 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (Friends by Friend ID, and the signal path)

## What to build

A User chooses a published Global Event to attend and gets a Quest for it. The Quest starts with a Sub Quest for attending the event, which shows the event's time and place and follows the event when it is changed or cancelled. The User adds further Sub Quests, marks Sub Quests as done, sees the Quest leave the list once every Sub Quest has ended, and can drop the Quest.

This ticket lays down what Meetup, Party and Matching build on: the Quest with its Holders, the Sub Quests shared by all Holders, the progress each Holder keeps alone, and the rule that a User holds one Quest for a Global Event. The Quests of this ticket have one Holder; tickets 05, 07 and 09 add the others.

## Acceptance criteria

- [ ] Attending a published Global Event creates a Quest with the event's title, the User as its Holder and one Sub Quest for attending. A Global Event that is not published is refused.
- [ ] A User holds at most one Quest for a Global Event, which the database enforces. Attending again, also twice at the same moment, gives the same Quest.
- [ ] The attending Sub Quest stores no time and no place: each read takes them from the Global Event. A changed event shows its new time and place, and a cancelled event shows the Sub Quest as cancelled and ended. A Holder cannot edit or cancel it.
- [ ] A Holder adds a Sub Quest with a title, an optional start, an optional end after the start and an optional place: a Place from the list, or a latitude, a longitude and a label. Adding requires the key described in P04. A User who is not a Holder is refused.
- [ ] A Holder edits or cancels a Sub Quest that a Holder added. The only Sub Quest of a Quest cannot be cancelled.
- [ ] Each Sub Quest has a completion kind as a field: by time when it has an end time, by hand when it has none. The attending Sub Quest takes the Global Event's end, and is by hand when the event has none.
- [ ] A Sub Quest with an end time is ended once that time has passed. This is computed when read and nothing is written. A Holder marks a Sub Quest as done, and the mark is that Holder's alone.
- [ ] The Quest list returns the User's Quests, each with its title, its Global Event when it has one, its Holders and its Sub Quests with their time, place, completion kind and whether each has ended for the User. A Quest whose Sub Quests have all ended for the User is left out. One Quest can be read by itself.
- [ ] Quests whose times overlap are accepted.
- [ ] Dropping a Quest removes the Holder and the Holder's progress. When the last Holder drops it, the Quest is deleted with its Sub Quests.
- [ ] `quests-changed` goes to every Holder of a Quest when its Holders or its Sub Quests change.
- [ ] Main server tests at the API: attending and attending again, the event changed and cancelled under a Quest, each Sub Quest rule, a repeated key that leaves one Sub Quest and answers the same twice, an end time passing, marking done, the list leaving out an ended Quest, and dropping.
- [ ] The main server's README records the Quest and Sub Quest routes, the one-Quest rule, how the attending Sub Quest reads the Global Event, and how a Sub Quest ends.
