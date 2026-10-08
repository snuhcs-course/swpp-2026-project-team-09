# 09: The waiting requests to join on 내 파티

Parent: [P27 spec](../spec.md)
Status: ready-for-agent
Blocked by: 06 (Undo a done mark, and keep Quests listed), as both change the User's Quests answer and 내 파티

## What to build

A Leader sees, at the top right of each Quest's block in 내 파티 that they lead, a red circle with a white number: the requests to join that wait for their answer. The number goes down as they accept or decline, and the badge is gone when none waits. A Holder who does not lead the Quest sees no badge.

Each Quest in the main server's answer for the User's Quests carries that number, counted only when the User leads it (0 otherwise). The existing `quests-changed` signal on a new, withdrawn or answered request already refetches the list, so the number follows without reopening the screen. The mock API follows.

## Acceptance criteria

- [ ] `GET /quests` gives each Quest the number of its waiting requests to join when the User leads it, and 0 otherwise.
- [ ] 내 파티 shows the badge on a led Quest with waiting requests, with the number, and none at 0.
- [ ] Accepting or declining a request, or its withdrawal, updates the number after `quests-changed`.
- [ ] A Holder who does not lead the Quest sees no badge.
- [ ] Server end-to-end tests and screen tests cover the above; the existing tests pass unchanged.
