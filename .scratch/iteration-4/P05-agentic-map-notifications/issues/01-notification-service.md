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

- `schedule` keeps the Notification under its User, kind, and card, and for an answer to an invitation the Friend who answered, overwriting one kept there. `replace` overwrites only when one is kept there, and answers whether it did. `cancel` forgets it. Each then sends the signal `notice` to that User; `replace` sends none when it kept nothing.
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

- [x] An accepted invitation gives the Leader one Notification: kind `accepted`, the title with the accepting User's name, the Quest's title as its line, the time of the acceptance, and `url` `/main?card=party:<questId>`. The accepting User gets none.
- [x] A declined invitation gives the Leader one Notification of kind `declined`, with "못 온대요".
- [x] An invitation the Leader cancels gives nobody a Notification.
- [x] The Leader receives the signal `notice` after each; the route answers as before when Redis fails the keeping.
- [x] `GET /notifications` answers only the signed-in User's, the latest first, and 401 without a sign-in.
- [x] Through the service: a second `schedule` under the same identity overwrites; `replace` without a kept one keeps nothing and answers false; `replace` with one changes its time and words and answers true; `cancel` forgets.
- [x] With 100 kept, one more drops the one with the earliest time. After a `schedule`, the User's hash has a time to live of 7 days.
- [x] Two Friends who accept into one Quest give the Leader two Notifications, the later first.
- [x] Unit tests: the words of both kinds for a name with and without a final consonant; the address, and its refusals (an uppercase kind, an empty id, and an id with `/` or a space).
- [x] No schema change, no new setting, and no push from this service.
- [x] Each changed source file has its AI-generated row; lint, format, type checks, and the touched tests pass in `main-server/`.

## How a reviewer checks it

1. Run the new integration tests and read what `GET /notifications` answers.
2. On the local stack, invite one test account from another, accept, and read `GET /notifications` as the Leader with curl.
3. Read `accept()` and `decline()`: the telling comes after the transaction and cannot fail the route.

## Comments

### Decisions (2026-11-14)

Details the spec left to the implementation, listed so that any of them can be vetoed.

1. **`replace` is one Redis script**: it checks that the field is there, sets it, and sets the expiry, so a replace that arrives after a cancel keeps nothing.
2. **The trim to 100 is not atomic.** A `schedule` writes the field and the 7-day expiry together, then reads the hash and deletes what lies beyond the 100 latest. Two schedules for one User at the same moment can drop one Notification more than needed.
3. **`cancel` sends `notice` whether or not anything was kept.**
4. **A card no address opens is refused when it is scheduled or replaced**, by throwing: nothing is kept and no signal is sent. Otherwise every later reading of that User's list would fail on it.
5. **A stored Notification this version cannot read is left out of the list**, so that a version that does not know a later kind still answers the others.
6. **The Leader is told with the time of the Quests' clock**, after the invitation's own signal, without the answer waiting for it. A failure to keep it is logged as a warning.
7. **`accept()` reads the Leader's id, the Quest's title, and the accepting User's name in the query it already makes**, and `decline()` adds the name to its own.
8. **The notifications module does not import the Quests' module**, which imports it: the service reads no clock, and the caller gives the time.
9. **The words** are one ending for each kind after the name with its subject particle: "수락했어요" and "못 온대요".
10. **An answer to an invitation is kept for each Friend who answered.** Its identity ends with that Friend's id, so a second Friend's answer about the same Quest does not overwrite the first, and `cancel` takes that person too.

### Agent usage (2026-11-14)

Up to the opening of the pull request. One implementing subagent (Opus 5.5) wrote the ticket and made the review's changes. The main session's work on P05 (the reading, the spec, the reviews, and the pull requests) is recorded once, under ticket 02.

- Agent time: about 61 minutes, an estimate from the transcript's timestamps. Much of it was spent waiting for test runs on a loaded machine.
- Tokens: output 48,678; input 11,506,693, of which 11,341,717 were cache reads, 164,822 cache writes, and 154 uncached. Without cache reads: 213,654.
