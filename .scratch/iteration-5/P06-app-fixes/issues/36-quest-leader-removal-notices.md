# 36: The Leader's removal test counts the one removed's 파티에서 내보내졌어요 Notification

Parent: [P06 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: None.

Native files: none. Releases: none (a test alone).

## What failed

`5.0/Main`'s full CI has been red since PR #701 (72b402fa4, ticket 22), run 46018686843, job main-server:
`test/quest-leader.integration.test.ts > The Leader removing a Holder > takes the Holder out, and tells every Holder, the one removed included` expected 3 signals for the one removed and got 4. PR CI runs no integration tests, so #701 merged green.

## Cause

The test was outdated, not the code. Ticket 22 has 내보내기 keep one ringing `party-removed` Notification for the one removed (`LeaderService.remove` → `tellGone` → `NotificationsService.schedule`), and `schedule` sends that User one `notice` signal. Ticket 22's "Must not break" names this test as one to change. The fourth signal is that `notice`. It is not a duplicate: the one removed has exactly one Notification (`party-removed`), and before #701 removal kept none. The Holder who stays gets no `notice`. `forgetTimeToLeave` sends a `notice` only when it removes a `leave-by`, and the test has none.

## Fix

The test now checks the signals by name, in order: the one removed gets `quests-changed` ×3 (its joining, the third's joining, the removal) and then `notice`, and the third gets `quests-changed` ×2. It also reads `/notifications`: the one removed has `['party-removed']` and the third has `[]`.

## Sweep

Integration tests that remove a Holder or end a 파티 and count signals or Notifications, each run once on this branch:

- `quest-leader` (the fixed test), `quest-end` (counts `quests-changed` only), `quest-removals`, `party-gone-notifications`, `invitee-time-to-leave` (already changed in #701), `room-request-declines`, `room-request-privacy` (their `notices` are 스터디룸 request notices, not Notifications), `class-quest-refusals`.

## Acceptance criteria

- [x] `quest-leader.integration.test.ts` passes and checks what each of the one removed's four signals is, and that one Notification is kept.
- [x] The swept files pass.
- [x] main-server lint, format and types pass. No native file changes.

## Comments

### Agent usage (2026-11-28)

- Agent time: about 20 minutes, one session (an estimate).
- Tokens: about 60k input (about 45k cache reads, 15k cache writes) and 8k output, no subagents (an estimate).
