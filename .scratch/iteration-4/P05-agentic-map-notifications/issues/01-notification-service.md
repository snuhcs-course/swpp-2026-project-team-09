# 01: The notification service keeps the answers to an invitation (main server)

Parent: [P05 spec](../spec.md) ("The notification service", "Ownership and merge order")
Status: ready-for-agent
Blocked by: None (can start immediately)
Native files: no

## What to build

The main server has a notification service that other packages call: `schedule`, `replace`, and `cancel`. It writes a Notification's words from the facts of its kind, gives it the address `/main?card=<kind>:<id>`, keeps it for its User in Redis, and tells the User's open apps with the signal `notice`. `GET /notifications` answers the signed-in User's Notifications, the latest first.

Its first two kinds are the answers to an invitation. When an invited User accepts, the Leader gets "<name>가 수락했어요"; when the User declines, "<name>이 못 온대요". Each has the Quest's title as its line and opens the party's card, `/main?card=party:<questId>`. Neither rings a phone.

## Files

Create (each source file with the AI-generated box):
- `main-server/src/notifications/card-address.ts`: the card of an address (`kind`, `id`) and the one function that makes `/main?card=<kind>:<id>`, refusing a kind outside `[a-z-]+` or an id outside `[A-Za-z0-9.,-]+`.
- `main-server/src/notifications/notification.ts`: the closed list of kinds, the facts of each kind (`accepted` and `declined`: the Quest's id and title, and the Friend's name), and the kept Notification.
- `main-server/src/notifications/notification-words.ts`: the title, the line, and the card of each kind, from its facts.
- `main-server/src/notifications/notification-store.ts`: the Redis store, one hash for each User.
- `main-server/src/notifications/notifications.service.ts`: `schedule(userId, told, at)`, `replace(userId, told, at)`, `cancel(userId, kind, card)`, and `listFor(userId)`.
- `main-server/src/notifications/notifications.controller.ts` and `dto/notification.dto.ts`: `GET /notifications`.
- `main-server/src/notifications/notifications.module.ts`: exports the service.
- `main-server/test/notification-words.unit.test.ts`, `main-server/test/notifications.integration.test.ts`, and `main-server/test/invitation-answers-notified.integration.test.ts`.

Change:
- `main-server/src/app.module.ts`: imports the module.
- `main-server/src/quests/quests.module.ts`: imports the module.
- `main-server/src/quests/invitations.service.ts`: `accept()` and `decline()` each tell the Leader, after the signal they send today. The file is package C's: change only these lines.
- `main-server/README.md`: a section "Notifications": the three calls, what is kept and for how long, the address, the signal, how to add a kind, and that nothing is pushed from here yet.

## Behaviour

- `schedule` keeps the Notification under its User, kind, and card, overwriting one kept there. `replace` overwrites only when one is kept there, and answers whether it did. `cancel` forgets it. Each then sends the signal `notice` to that User; `replace` sends none when it kept nothing.
- A User keeps at most 100 Notifications; the one with the earliest time goes first. The User's hash expires 7 days after the last Notification was kept in it, by Redis's own expiry, so the service reads no clock.
- `GET /notifications` answers `[{ id, kind, title, line, at, url }]`, the latest `at` first: `id` is the identity as one string, `at` is Korea time with the offset, and `url` is the address. A Notification whose time is still to come is in the answer.
- The caller gives the time. `accept()` and `decline()` give the server's clock, the one the Quests read, so a test can set it.
- `accept()` tells the Leader `accepted` with the accepting User's name, and `decline()` tells the Leader `declined`. Each runs after the transaction and after today's signal, is not awaited by the route's answer, and logs a warning when it fails. `cancel()` of an invitation tells nobody.
- The title's name takes the subject particle of its last syllable: "민수가 수락했어요", "지은이 수락했어요", "민수가 못 온대요", and "지은이 못 온대요".

## Must not change

- The answers and status codes of every existing route, and the existing signals.
- `main-server/prisma/schema.prisma`: no table and no migration.
- `main-server/eval/`, the socket server, the worker server, and the app.
- The push of a received invitation, if it has merged: `invite()` is not touched.

## Acceptance criteria

- [ ] An accepted invitation gives the Leader one Notification: kind `accepted`, the title with the accepting User's name, the Quest's title as its line, the time of the acceptance, and `url` `/main?card=party:<questId>`. The accepting User gets none.
- [ ] A declined invitation gives the Leader one Notification of kind `declined`, with "못 온대요".
- [ ] An invitation the Leader cancels gives nobody a Notification.
- [ ] The Leader receives the signal `notice` after each; the route answers as before when Redis fails the keeping.
- [ ] `GET /notifications` answers only the signed-in User's, the latest first, and 401 without a sign-in.
- [ ] Through the service: a second `schedule` under the same identity overwrites; `replace` without a kept one keeps nothing and answers false; `replace` with one changes its time and words and answers true; `cancel` forgets.
- [ ] With 100 kept, one more drops the one with the earliest time. After a `schedule`, the User's hash has a time to live of 7 days.
- [ ] Unit tests: the words of both kinds for a name with and without a final consonant; the address, and its refusals (an uppercase kind, an empty id, and an id with `/` or a space).
- [ ] No schema change, no new setting, and no push from this service.
- [ ] Each changed source file has its AI-generated row; lint, format, type checks, and the touched tests pass in `main-server/`.

## How a reviewer checks it

1. Run the new integration tests and read what `GET /notifications` answers.
2. On the local stack, invite one test account from another, accept, and read `GET /notifications` as the Leader with curl.
3. Read `accept()` and `decline()`: the telling comes after the transaction and cannot fail the route.

## Comments
