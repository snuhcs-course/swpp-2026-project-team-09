# 01: Friends by Friend ID, and the signal path

Parent: [P08 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

A User has a Friend ID and gives it to someone. That person enters it, sees whose it is and sends a Friend Request. The User sees the request with its sender and accepts or declines it; accepting makes the two Friends. Either can end the friendship. The Invite Link is ticket 02, and what Friends see of each other on the map is ticket 03.

The other User's app learns of each step without asking. This is the first signal, so the ticket also builds the path every later ticket uses: the main server names the Users a signal is for, the signal travels as one NestJS event over Redis to every socket server, and each socket server sends it to the connections of those Users.

## Acceptance criteria

- [x] Every User has a Friend ID: 8 characters from capital letters and digits, without 0, O, 1, I and L. The main server makes it when the User is created, the database keeps it unique, and it never changes. The profile and the lobby return it. The migration removes the Users stored before it, with their sessions, since no database is deployed yet.
- [x] Looking up a Friend ID returns its owner's name and department, and says so when nobody holds it.
- [x] Sending a Friend Request to a Friend ID leaves one waiting request. It is refused, each with a code of its own, for the sender's own ID, an ID nobody holds, a User who is already a Friend, and a request to that User already waiting.
- [x] A request to a User whose own request to the sender is waiting makes the two Friends at once and leaves no request.
- [x] A User lists the Friend Requests sent to them, each with its sender's name and department, and the ones they sent.
- [x] Accepting creates the friendship. Declining removes the request, and so does cancelling by its sender. Only the receiver accepts or declines, and only the sender cancels.
- [x] A User lists their Friends, each with the name and the department. Ending a friendship removes it for both.
- [x] Two requests that cross, and two answers to one request sent at the same moment, leave one friendship or none: the database allows one friendship and one waiting request between two Users.
- [x] A socket connection joins its User's own room, beside the room of its session.
- [x] The main server sends a signal by naming the Users it is for, the signal and what it carries. It travels as one NestJS event over Redis, and every socket server sends it under the signal's name to those Users' rooms. A signal that names no Users goes to every connection. `session-ended` and `shuttle-vehicles-updated` stay as they are.
- [x] `friends-changed` goes to both Users when a Friend Request is sent, accepted, declined or cancelled, and when a friendship ends. It carries nothing.
- [x] Main server tests at the API: each refusal, the crossing requests, the lists, ending a friendship, and the event seen on Redis with the Users it names.
- [x] Socket server tests: a signal reaches every connection of a User it names and no connection of another User, and a signal that names nobody reaches every connection.
- [x] The READMEs record their part: the Friend ID, the routes and their refusals in the main server's, and the User's room, the event from the main server and the signals in the socket server's, with what the app does on each signal.

## Comments

### Decisions (2026-10-04)

- **Signal operation**: `SignalsService.send(to: readonly string[] | 'everyone', name: string, payload?: unknown): void`
  in `main-server/src/common/signals.service.ts`, provided by the global `SignalsModule`, so any module injects it.
  Call it after the transaction commits; it does not wait and logs a lost signal as a warning. An empty list sends
  nothing.
- **Redis event**: `signal`, with `{ userIds?: string[], name: string, payload?: unknown }`. Without `userIds` it goes to
  every connection; an empty `userIds` goes to none. The socket server's `SignalsGateway` emits it under `name` to the
  rooms `user:<userId>`, with `payload` as its one argument or none. It knows no signal by name.
  `session-ended` and `shuttle-vehicles-updated` keep their own events.
- **Rooms**: each connection joins `session:<sessionId>` and `user:<userId>`.
- **Friend ID**: `users.friend_id`, unique, made by `newFriendId()` in `src/users/friend-id.ts` at creation; in the
  profile (and so the lobby) as `friendId`. Looked up in capitals, so small letters are found too.
- **Table**: `friendships` holds one row for two Users: a waiting Friend Request while `accepted_at` is null, a
  friendship once set. `user_a_id < user_b_id` (CHECK), `sender_id` one of the two (CHECK), unique
  `(user_a_id, user_b_id)`. Every change between two Users locks both `users` rows in id order first
  (`UsersService.lock`), so crossing requests and simultaneous answers run one after the other. Ticket 03 can add a
  switch column per end (`user_a_…`, `user_b_…`).
- **Are two Users Friends**: `FriendsService.areFriends(userId, otherUserId, tx?)`, exported by `FriendsModule`.
- **Routes**: `GET /friend-ids/:friendId` → `{ name, department }`; `POST /friend-requests { friendId }` →
  `201 { status: 'waiting' | 'friends' }`; `GET /friend-requests` → `{ received: [{ id, sender, sentAt }], sent: [{ id,
  receiver, sentAt }] }`; `POST /friend-requests/:id/accept|decline|cancel` → 204; `GET /friends` →
  `[{ id, name, department }]`; `DELETE /friends/:userId` → 204.
- **Refusals**: `FRIEND_ID_NOT_FOUND` 404, `OWN_FRIEND_ID` 400, `ALREADY_FRIENDS` 409, `FRIEND_REQUEST_ALREADY_SENT`
  409, `FRIEND_REQUEST_NOT_FOUND` 404 (also for the wrong User and for a request already answered),
  `FRIEND_NOT_FOUND` 404.
- **`friends-changed`** goes to both Users on send (including the crossing one), accept, decline, cancel and end.
- **A decline reaches the sender as `friends-changed`**, as this ticket's criterion says, though the spec says a decline is not announced to the sender. The signal carries nothing, so the sender's app sees only that the request left its list.

### Agent usage (2026-10-04)

- Agent time: about 28 minutes, an estimate: the implementing agent about 25 minutes, the review's fixes included, and a Standards reviewer and a Spec reviewer about 1.5 minutes each at the same time. The session that ran the agents of all P08 tickets is counted once, under ticket 09.
- Tokens, counted from the three agents' transcripts:
  - Input: 27,653,121, of which 27,189,275 were cache reads, 463,552 cache writes and 294 uncached.
  - Output: 56,577, a lower bound, since the transcripts record only part of the output of most steps.
