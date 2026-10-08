# 06: Undo a done mark, and keep Quests listed when every Sub Quest is done

Parent: [P27 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

A Holder who marked a Sub Quest done can press it again to unmark it. The mark and its undoing are the Holder's own and tell no other Holder, as marking does today. A done Sub Quest stays faded.

Done marks no longer take a Quest out of the Holder's lists. A Sub Quest is ended only when cancelled or past its end time; its done mark is shown but does not end it. So a Quest leaves 내 파티 and the main screen's Quest list only when its Sub Quests are all cancelled or past their end time, as for every other Holder. When a Quest is deleted does not change: when the Leader ends it, or when its last Holder leaves. No schema changes.

The main server gains the undoing of a done mark, and the mock API follows both rules.

## Acceptance criteria

- [ ] The main server removes the Holder's done mark for a Sub Quest on request; undoing a mark that does not exist succeeds and changes nothing; another Holder's marks are untouched.
- [ ] A Sub Quest's `ended` is true only when it is cancelled or its end time has passed; `done` is the Holder's mark alone.
- [ ] A Quest whose Sub Quests the Holder has all marked done is still in `GET /quests`; one whose Sub Quests are all cancelled or past their end is not.
- [ ] In the room, pressing a done Sub Quest unmarks it and it is no longer faded.
- [ ] After marking every Sub Quest done, the Quest stays in 내 파티 and in the main screen's Quest list.
- [ ] Server end-to-end tests and screen tests cover the above; `quest-progress`, which asserted that done marks hide a Quest, changes with it and the PR names it.
