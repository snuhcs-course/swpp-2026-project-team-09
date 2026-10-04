# 03: Location Sharing between Friends

Parent: [P08 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (Friends by Friend ID, and the signal path)

## What to build

A User turns the Master Switch on and their app uploads positions. A Friend's map shows the User's Avatar moving, as long as both have their Master Switch on, both have the switch for that friendship on, and the User is inside the Campus Boundary. The moment one of these stops holding, the Avatar leaves the Friend's map. The server keeps only the latest position, for 10 minutes, and no history.

One module answers who may see whom. This ticket gives it the friendship; ticket 05 adds the Party.

## Acceptance criteria

- [x] The Master Switch is stored on the User and starts off. A User turns it on and off, the lobby returns it, and signing in and signing out leave it as it is.
- [x] Each Friend has a switch on the friendship, which starts on. A User changes their own, and the list of Friends returns it.
- [x] An upload carries a latitude, a longitude, the accuracy radius in metres and the time it was measured. It is refused, each with a code of its own, when the Master Switch is off, when it was measured more than 60 seconds ago or more than 10 seconds ahead of the server's clock, and when the accuracy radius is over 100 metres. The three numbers are named constants.
- [x] A position outside the Campus Boundary is not kept, the stored one is cleared, and the answer tells the User that they are not shared because they are off campus. The Boundary is checked in server code, without a database query.
- [x] The latest position of a User is kept in Redis and expires 10 minutes after it was stored. No position is written to the database or to a log.
- [x] One module answers whether a viewer may see a subject now: both Master Switches are on, the subject has a position inside the Campus Boundary, and a relationship between the two has its switch on at both ends. It is tested as a table of every combination of the two Master Switches, the two switches of the friendship, the friendship existing or not, and inside or outside the Boundary.
- [x] Each position that is kept is pushed as `position`, with the User, the coordinates and the time it was measured, to the Users who may see the subject at that moment.
- [x] `position-removed`, with the User, goes at once to each viewer who could see the subject and no longer can: when the subject or the viewer turns the Master Switch off, when either turns the friendship's switch off, when the friendship ends, when the subject leaves the Campus Boundary, and when the subject's session ends.
- [x] A session that ends, by a sign-in on another phone, a sign-out or a used refresh token, clears the User's stored position.
- [x] A User fetches the positions they may see now, each with the time it was measured. The list of Friends says for each Friend whether the User can see them now, and never why.
- [x] A viewer cannot tell a Friend who is off campus from one with sharing off or one whose position has expired: all three have no position and are not visible.
- [x] Main server tests at the API: each refusal, a position outside the Boundary, the expiry, the fetch, each removal with the event seen on Redis and the Users it names, and the session's end.
- [x] A socket server test: a position reaches a viewer it names and no other connection.
- [x] The READMEs record their part: the switches, the upload with its refusals and its numbers as provisional until P17, what is stored and for how long, the visibility rule, and `position` and `position-removed` with what the app does on each. The socket server's README states that a connection opened with the token of an ended session stays open until the token expires.

## Comments

### Decisions (2026-10-04)

- **Columns**: `users.master_switch_on` (default false) and `friendships.user_a_sharing`, `friendships.user_b_sharing`
  (default true), each User's switch at their own end. Migration `20261004150000_add_location_sharing`.
- **Routes**: `PUT /users/me/master-switch { on }` → 204; `PUT /friends/:userId/sharing { on }` → 204, refused with
  `FRIEND_NOT_FOUND` 404 for anyone but a Friend; `POST /positions { latitude, longitude, accuracy, measuredAt }` →
  `200 { offCampus: boolean }`; `GET /positions` → `[{ userId, latitude, longitude, measuredAt }]`. `POST /lobby` adds
  `masterSwitch: boolean`, and `GET /friends` adds `sharing` (the User's own switch) and `visible` to each Friend.
- **Upload refusals**: `MASTER_SWITCH_OFF` 409, `POSITION_TOO_OLD` 400, `POSITION_IN_THE_FUTURE` 400,
  `POSITION_TOO_INACCURATE` 400. The numbers are `MAX_POSITION_AGE_MS`, `MAX_POSITION_LEAD_MS` and
  `MAX_ACCURACY_METRES` in `src/location-sharing/location-sharing.service.ts`. A malformed body gets the plain 400.
- **Redis**: `position:<userId>` → `{ latitude, longitude, measuredAt }`, set with `PX 600000`. Accuracy is not kept.
- **Signals**: `position` with `{ userId, latitude, longitude, measuredAt }`, one signal naming every viewer;
  `position-removed` with `{ userId }`, one signal per subject naming the viewers who lost sight of it.
- **Visibility module**: `VisibilityService` (`src/location-sharing/visibility.service.ts`, exported by
  `LocationSharingModule`): `viewersOf(subjectId): Promise<string[]>`, `visibleTo(viewerId): Promise<string[]>` and
  `announceRemovals<T>(userId, change: () => Promise<T>): Promise<T>`. The rule lives in one private method that lists
  the Users linked to a User by a relationship with its switch on at both ends, then keeps those whose Master Switch is
  on (and none when the User's own is off); position presence is read from Redis. Ticket 05 adds the common Party to
  that list beside the friendship. `announceRemovals` records who sees whom among the pairs that include the User, runs
  the change, records again and sends `position-removed` for each pair lost; tickets 05 and 06 wrap leaving, removal
  and the Party's switch in it, passing the User whose membership or switch changes.
- **No `maySee(viewer, subject)`**: no route needs the single question, so the module answers it in the two directions
  the pushes and the lists use; the table test asks both for every row.
- **Session end**: `SessionsService.announceEnd(userId, sessionIds, reason)` now takes the User and also calls
  `LocationSharingService.clearPosition(userId)`, without waiting, like the `session-ended` event: a sign-in or a
  sign-out keeps working while Redis is down.
- **Accepted races**: an upload that crosses a Master Switch turned off can leave a position in Redis that nobody sees
  until it expires or the switch is turned on again; a `position` and a `position-removed` sent at the same moment by
  two main servers may arrive in either order; the clearing after a sign-in on another phone may remove the new phone's
  first position. Each lasts until the next upload or at most 10 minutes.
