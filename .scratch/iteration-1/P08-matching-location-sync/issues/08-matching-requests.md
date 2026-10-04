# 08: Matching: asking, withdrawing and the state of a request

Parent: [P08 spec](../spec.md)
Status: ready-for-agent
Blocked by: 04 (Quests for Global Events and their Sub Quests)

## What to build

A User asks for Matching on a Global Event with a group size from 2 to 4, is answered at once that the request waits, and goes on using the app. The User sees the state of the request and can withdraw it while it waits. Grouping the requests and creating the Shared Quest are ticket 09.

The app speaks to the main server only. The main server decides whether a request can be made and passes it to the match server, which keeps it in its own database. This ticket sets how the two servers call each other: over HTTP with a secret both hold, as the worker server calls the main server, so that one instance handles each call.

## Acceptance criteria

- [x] The main server and the match server call each other over HTTP with a shared secret, which is a setting of both and is listed in each example settings file. The match server's routes take the main server alone and refuse a call without the secret. The match server takes no part in messaging over Redis: its listener, its client and their settings are removed.
- [x] A User asks for Matching on a Global Event with a size from 2 to 4. The main server refuses, each with a code of its own, a Global Event that is not published or has started, a size outside the range, and a User who holds a Shared Quest for that event. A User who holds a Quest for it alone can ask.
- [x] The main server passes an accepted request to the match server with the User, the Global Event, the size and the User's interest hashtags. The match server stores it as waiting, with the time it arrived.
- [x] A User has at most one open request per Global Event, which the match server's database enforces. A second request while one waits is refused with a code.
- [x] A User withdraws a waiting request. A request in another state cannot be withdrawn.
- [x] A User reads the state of their request for a Global Event: waiting, matched, withdrawn or expired, or that there is none. A User reads their open requests as a list.
- [x] Being in a Party does not prevent a request.
- [x] When the match server does not answer, the main server answers the app with an error it can tell apart from a refusal, and nothing is stored.
- [x] Main server tests at the API, with the match server replaced at the fetch boundary: each refusal, what is passed on, a withdrawal, each state read back, and a match server that does not answer.
- [x] Match server tests at its routes: a request stored, the second one refused, a withdrawal, the states, and a call without the secret refused.
- [x] The READMEs record their part: the routes and refusals in the main server's, and in the match server's the routes for the main server, the secret, the states of a request, and how a route for the main server is written and tested.

## Comments

### Decisions (2026-10-04)

- **Settings**: `MATCH_SERVER_TOKEN` (at least 32 characters) in both servers, the one secret for calls in both
  directions; ticket 09's calls from the match server to the main server send it too. `MATCH_SERVER_URL` in the main
  server (`http://match-server:3003` inside Compose). The match server's `REDIS_HOST` and `REDIS_PORT` are gone with
  its messaging, its Redis readiness check, `@nestjs/microservices` and `ioredis`.
- **Main server routes** (a User's): `POST /matching-requests { globalEventId, size }` → 201 request (no
  `Idempotency-Key`: a repeat is refused while the first waits); `GET /matching-requests` → the waiting requests,
  oldest first; `GET /matching-requests/:globalEventId` → the latest request for the event; `POST
  /matching-requests/:globalEventId/withdraw` → 204. A request is `{ globalEventId, size, state, arrivedAt }`, `state`
  one of `waiting`, `matched`, `withdrawn`, `expired`; ticket 09 adds the Quest of a matched request.
- **Refusals**: `MATCHING_SIZE_OUT_OF_RANGE` 400, `GLOBAL_EVENT_NOT_FOUND` 404 (unknown, draft, cancelled, discarded),
  `GLOBAL_EVENT_STARTED` 409, `SHARED_QUEST_HELD` 409, and the match server's, passed on as it gives them:
  `MATCHING_REQUEST_WAITING` 409, `MATCHING_REQUEST_NOT_FOUND` 404, `MATCHING_REQUEST_NOT_WAITING` 409. A match server
  that cannot be reached, answers anything else (a refusal without a `code`, 5xx, another shape) or takes over 5 seconds
  gives 502 `{ statusCode, error: 'Bad Gateway', message: 'The match server did not answer.' }` without a `code`.
- **Has started**: the Global Event's `startsAt` is at or before `CLOCK.now()`. A published Global Event without a
  start time counts as not started, so Matching stays open for it until it is cancelled.
- **The standing question**: `QuestsService.matchingRefusals(requests: readonly { userId, globalEventId }[], tx?)` →
  `(MatchingRefusal | null)[]` in the order given, `MatchingRefusal` being `'GLOBAL_EVENT_NOT_FOUND' |
  'GLOBAL_EVENT_STARTED' | 'SHARED_QUEST_HELD'`. Two queries for any number of requests; ticket 09's "which still
  stand" uses it as it is. A Shared Quest is one with more than one Holder.
- **Main server client**: `MatchServer.call(method, path, schema, body?)` in `main-server/src/matching/match-server.ts`,
  fetch behind the token `FETCH_MATCH_SERVER`, 5-second timeout through `AbortSignal.timeout`.
- **Match server routes** (the main server's, behind `MainServerGuard`, global, with `@Public()` for the health checks):
  `POST /users/:userId/matching-requests { globalEventId, size (2–4), hashtags }` → 201;
  `GET /users/:userId/matching-requests` → waiting ones; `GET /users/:userId/matching-requests/:globalEventId` →
  latest; `POST /users/:userId/matching-requests/:globalEventId/withdraw` → 204.
- **Match server table**: `matching_requests` (`user_id`, `global_event_id`, `size` with CHECK 2–4, `hashtags`,
  `state` enum `matching_request_state`, `arrived_at`), partial unique index
  `matching_requests_user_id_global_event_id_key` on `(user_id, global_event_id) WHERE state = 'waiting'`. A User asks
  again once the request no longer waits; the latest row is the one read.
- **Tests**: main server `MatchServerStub` in `main-server/test/match-server.ts`, given to `startApp` as its fourth
  argument (`answers`, `refuses`, `hangs`, `calls`; an unanswered call fails); `storeSharedQuest()` in
  `test/quests.ts`. Match server `test/main-server.ts` (`asMainServer`, route helpers, `connectToDatabase()` for the
  states only rounds write).
- **No signal** is sent on asking or withdrawing: only the User's own app changes, and it has the answer.
- **Party**: nothing consults Parties, so being in one does not prevent a request. Parties are not on this branch, so no
  test covers it.
