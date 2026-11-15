# 05: Notifications are stored, sent at their time, and listed (main server)

Parent: [P05 spec](../spec.md) ("Part 2", "Notifications at their time")
Status: ready-for-agent
Blocked by: 04. Its migration is made from the schema of the iteration's Main after the invitations package's migration has merged, and it starts from the Main that holds the push spec's follow-up.
Native files: no

## What to build

A Notification is a row of a table, and one that rings a phone is sent when its time comes: the main server pushes "지금 나서요" at the time to leave, even to a closed app, and the Notification is in "알림" from the moment it is scheduled. The three calls of the notification service and `GET /notifications` keep their shapes, so no caller and no app changes.

## Behaviour

- **The table** `notifications`: the User, the kind, the card's kind and id, the person it is about (empty when none), the time, the title, the title while the time is still to come, the line, the push's body, whether it rings a phone, when it was sent, and when it was made. Unique on the User, the kind, the card, and the person. Deleted with its User.
- **The store** behind the service reads and writes the table. `schedule` upserts and clears the sent mark, `replace` updates only an existing row, and `cancel` deletes. What Redis holds is not carried over, and the Redis store is removed.
- **The sender** has one step: in one statement it marks as sent the rows that ring a phone, whose time has come by the Quests' clock, and that are not sent, skipping rows another transaction holds, at most 100 a step; then, outside the transaction, it sends each through `PushService.send` with the title, the body, and the address, and sends the signal `notice` to its User. It also deletes rows whose time is more than 30 days ago.
- **The interval.** A provider calls the step every `NOTIFICATIONS_TICK_SECONDS` seconds (15 by default). 0 never starts it; the tests' settings give 0 and call the step themselves. The timer does not keep the process alive and stops at shutdown.
- **What rings a phone**: `leave-by`. `accepted` and `declined` do not. Each kind says it with its words.
- **The push of the time to leave**: title "지금 나서요", body "<Place>까지 걸어서 <N>분이에요.".
- A step that fails logs a warning and the next step runs; one Notification whose push fails does not stop the others.

## Must not change

- The shapes of `schedule`, `replace`, `cancel`, and `GET /notifications`, and the words and ids of the kinds.
- The push of a received invitation.
- `main-server/eval/` and the app.

## Acceptance criteria

- [x] One migration, the only one in the pull request, made from the schema of the iteration's Main at merge time.
- [x] Everything the service's integration tests of tickets 01 and 04 check holds against the table, with Redis holding nothing of a Notification.
- [x] A `leave-by` whose time has not come sends nothing at a step; once the clock passes its time one step sends exactly one push to the stand-in for Expo, with the title, the body, and `data.url` of the Notification, and a second step sends nothing.
- [x] A `leave-by` rescheduled to a later time after it was sent is sent again at the new time.
- [x] An `accepted` Notification is never pushed.
- [x] Two steps run at once send a Notification once.
- [x] A step deletes a Notification whose time is 31 days ago and keeps one of 29 days ago.
- [x] With the setting at 0 no timer runs; the settings' test covers the new setting.
- [x] The README's "Notifications" says the table, the sender, the interval, what rings a phone, and that a Notification is sent at most once.
- [x] Each changed source file has its AI-generated row; lint, format, type checks, and the touched tests pass in `main-server/`.

## Comments

### Decisions (2026-11-15)

Details the ticket left to the implementation, listed so that any of them can be vetoed.

1. **Column types.** `at` and `sent_at` hold a time with its zone, since the sender's statement compares and sets them
   with a time from the server; `created_at` is as in every other table.
2. **A replace and the sent mark.** A replace that keeps the time leaves a sent Notification sent, so the change is not
   pushed twice; one that moves the time clears the mark, so it is sent at the new time. A schedule always clears it.
3. **A row of a kind this version does not know** is left out of `GET /notifications`.
4. **The list's order**: the latest time first, then the latest made.
5. **The sender.** A row whose push cannot be made is logged and the others are sent; a ringing kind without a body is
   pushed with an empty one; the rows of more than 30 days ago are deleted only after a step's claim succeeded; a
   failure logs the error's name only.
6. **The setting.** An empty `NOTIFICATIONS_TICK_SECONDS` is refused at start-up instead of being read as 0, which
   would stop the sending without a word.
7. **Tests.** A step claims and deletes the rows of every User, so the sender's integration tests keep their
   Notifications in January 2000, before every other test file's. The interval is a unit test of the timer on fake
   timers, not a wait on a real one.
8. **The migration** `20261115072042_add_notifications` is made from the schema of the iteration's Main after the
   Friend levels' migration, and is the only one in the pull request.

### Agent usage (2026-11-15)

Up to the review, before the migration is made again. One implementing subagent (Opus 5.5) wrote the table, the
store, the sender, and their tests; the review's changes were made in the reviewing session.

- Agent time: about 17 minutes for the subagent, an estimate from the transcript's timestamps; the review's share is
  counted with the package's last ticket.
- Tokens (the subagent): output 63,676; input 14,230,447, of which 14,055,909 were cache reads, 174,360 cache
  writes, and 178 uncached. Without cache reads: 238,214.
