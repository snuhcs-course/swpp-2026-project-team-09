# 03: Told anywhere when a 파티 is gone; AI matching leaves the app

Parent: [spec](../spec.md) ("Global watch", "AI matching removed")
Status: ready-for-agent
Blocked by: None (can start immediately).
Prepared before the acceptance tests: yes (UAT-2 criteria 4 and 6). Done when the pull request into `4.0/Main` is open; whether it merges and ships before 11/16 is decided by the team later. If it does not, criteria 4 and 6 run on today's app that day.
Native files: no
PR assignee: Jaehyun0320

## What to build

A Holder whose 파티 disappears from their list, because the Leader removed them or ended it, sees "○○ 파티에서 빠졌어요" on whatever screen of the signed-in app they are on. A watcher in the signed-in layout takes over the logic the room screen uses to close when its Quest is gone. The User's own leave and end do not toast. With the room open, the room closes and the toast shows once. Removal and ending are not told apart, and what happened while the app was closed is not told (package D's notification table, Iteration 5).

In the same pull request, AI matching leaves the app: the "✦ AI 매칭" entry on event cards, the matching screen and its route, the watcher that toasts a match, and the "결과는 알림으로 와요" toast. The main server's matching module and the match server stay.

## Acceptance criteria

- [ ] When `quests-changed` brings a list without a Quest the User held, the toast shows once on any tab or screen.
- [ ] Leaving or ending a 파티 oneself shows no such toast.
- [ ] With the room open, the room closes and no second toast shows.
- [ ] No matching entry, screen, route, watcher or toast remains; tests that covered only them are removed; servers untouched.
- [ ] Tests (ADR 0007): app integration over a fake server for the toast on another tab, the own-action case and the open-room case.
- [ ] Wiki Requirements: the entries on AI matching in the main UI match the removal.
- [ ] The "A 파티 that is gone" and "AI matching in the main UI" rows of `he-revision-log.md` get this pull request.

## Comments
