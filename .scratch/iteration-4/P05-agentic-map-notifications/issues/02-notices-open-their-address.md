# 02: "알림" lists the kept Notifications, and a row opens its address (app)

Parent: [P05 spec](../spec.md) ("'알림' in the app")
Status: ready-for-agent
Blocked by: 01 (`GET /notifications` and the signal `notice`), and ticket 04 of the push spec (the main screen's reading of `?card=`). Its pull request merges after both.
Native files: no

## What to build

"알림" shows the Notifications the main server keeps for the User above the rows it shows today, the latest first, each with its time at the right. A press on a row that has an address goes to the main screen with that card: the map opens the card, or the app opens the screen the push spec names when the map holds no such card. The row of a received invitation has the address `/main?card=invitation:<invitationId>`, the one its push opens. The list fetches again when the signal `notice` arrives.

## Files

Create (each with the AI-generated box):
- `mobile/src/features/notifications/address.ts`: the address of a card, `/main?card=<kind>:<id>`, and the one function that opens an address (reading it with the push module's reader, and going to `/main` as a tapped push does).
- `mobile/__tests__/notifications-kept.integration.test.tsx`.

Change:
- `mobile/src/api/waiting-types.ts`: the kept Notification as `GET /notifications` answers it.
- `mobile/src/api/client.ts`, the server client, and the mock client: `notifications()`. The mock client answers an empty list.
- `mobile/src/api/queries.ts`: the query and its key.
- `mobile/src/features/notifications/adapter.ts`: a row gains its address and its time; the kept kinds join the kinds; the kept Notifications come first.
- `mobile/src/features/notifications/use-notices.ts`: the kept Notifications join the lists; the badge counts as today.
- `mobile/src/screens/me/notifications-screen.tsx`: a row with an address opens it; a kept row shows its time.
- `mobile/src/screens/me/me-screen.tsx`: the count leaves kept Notifications out.
- `mobile/src/live/live-updates.tsx`: the signal `notice` fetches the kept Notifications again, and so does a connection that opens again. The file is package C's: change only these lines.
- `mobile/__tests__/features/notifications-adapter.unit.test.ts` and the fake main server of the tests' support (a route for `GET /notifications`).
- `mobile/README.md`: what "알림" is composed from and what a row opens.

## Behaviour

- The rows: the kept Notifications, the latest time first, then today's rows in today's order. A kept row's icon and tone follow its kind (`accepted` and `declined` take the invitation's).
- The time: "HH:MM" for a time on today's date in Korea, and "M월 D일" for another day.
- A press: a row with an address calls the one opening function. The invitation's row has `/main?card=invitation:<id>`. A row without an address (a Friend Request, a Party turned on, requests to join) leads where it leads today.
- The badge on "파티" and the count on "알림" in 내 정보 leave the kept Notifications out.
- A failed fetch of the kept Notifications leaves them out, and the rest of the list stays.

## Must not change

- What `?person=`, `?quest=`, and `?tutorial=` do on `/main`, and the push module's files.
- `mobile/src/screens/main/main-screen.tsx` and the map's card ids.
- Native files. The Maestro flows run as before.
- `main-server/`.

## Acceptance criteria

- [ ] Unit tests: kept Notifications come first, the latest first; the time's two forms, at the boundary of midnight in Korea; the invitation's row has the address `/main?card=invitation:<id>`; a failed list of kept Notifications gives the other rows alone.
- [ ] Integration test: with one kept Notification of kind `accepted` served by the fake main server, "알림" shows its title, its line, and its time.
- [ ] Integration test: a press on that row goes to the main screen and opens the party's card when the map holds the Quest.
- [ ] Integration test: a press on the invitation's row ends at the "파티" tab's invitations while the map holds no invitation card.
- [ ] Integration test: the signal `notice` makes the app fetch `GET /notifications` again.
- [ ] Integration test: the badge on "파티" and the count on "알림" do not count a kept Notification.
- [ ] The whole mobile suite passes. An existing test changes only where a row's press is now its address.
- [ ] Each changed source file has its AI-generated row; lint, format, type checks, and the touched tests pass in `mobile/`; CI's `app-fingerprint` passes without a native change.

## How a reviewer checks it

1. On the local stack with two test accounts, invite the second from the first and accept on the second. The first account's "알림" gains "<name>가 수락했어요" without a pull to refresh, and a press opens the party's card on the map.
2. Invite again and open "알림" on the second account: the invitation's row leads to the "파티" tab's invitations, where the invitation is.

## Comments
