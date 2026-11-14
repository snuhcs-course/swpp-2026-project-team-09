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

- [ ] One migration, the only one in the pull request, made from the schema of the iteration's Main at merge time.
- [ ] Everything the service's integration tests of tickets 01 and 04 check holds against the table, with Redis holding nothing of a Notification.
- [ ] A `leave-by` whose time has not come sends nothing at a step; once the clock passes its time one step sends exactly one push to the stand-in for Expo, with the title, the body, and `data.url` of the Notification, and a second step sends nothing.
- [ ] A `leave-by` rescheduled to a later time after it was sent is sent again at the new time.
- [ ] An `accepted` Notification is never pushed.
- [ ] Two steps run at once send a Notification once.
- [ ] A step deletes a Notification whose time is 31 days ago and keeps one of 29 days ago.
- [ ] With the setting at 0 no timer runs; the settings' test covers the new setting.
- [ ] The README's "Notifications" says the table, the sender, the interval, what rings a phone, and that a Notification is sent at most once.
- [ ] Each changed source file has its AI-generated row; lint, format, type checks, and the touched tests pass in `main-server/`.

## Comments
