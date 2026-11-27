# 13: The app's events for the five actions, and `api_request_failed`

Parent: [P08 spec](../spec.md), [Usage data with PostHog](../spec.md#usage-data-with-posthog)
Status: done
Blocked by: 12

Native files: none. Releases: an app over-the-air update.

## What happens now

- Every request to the main server goes through `send` in `mobile/src/api/server/http.ts` (`call` at `:190`). A
  refusal is an `ApiError` with the status and the main server's `code`; nothing answering is status 0. A request
  with `timeoutMs` is aborted by its timer (`:80`), but the abort and a network failure end in the same
  `new ApiError(0)` (`:104`), so the two cannot be told apart yet. A request aborted by its caller's `signal` (a query
  no screen shows any more) is status 0 too. An answer of an unknown shape is status 0 with `UNEXPECTED_ANSWER`.
- The five actions are started here:
  - the Assistant: `apiClient.askAssistant` in `src/features/assistant/use-chat.ts:227` (`POST /assistant/messages`);
  - a 파티 made: the 파티 form's send in `src/screens/party/form/use-send.ts:106` (`makeQuest`) and `:108`
    (`attendGlobalEvent`), and a Plan sent in `src/features/assistant/use-plan-invitation.ts:233` (`makePlanQuest`);
  - a Holder joined: `joinQuest` and `acceptInvitation` in `src/screens/party/use-party-actions.ts:161` and `:166`,
    and the Leader's `acceptJoinRequest` in `src/screens/room/use-room-actions.ts:237`;
  - Friends made: `acceptFriendRequest` and `acceptInviteLink` in `src/features/friends/use-friend-changes.ts:58` and
    `:62`;
  - a seat booked: `library.book` in `src/screens/main/library/seat-booking.ts:75`, which goes to 관정도서관 from the
    phone, never through the main server. A failure is a `LibraryError` with `kind` `network`, `sessionEnded`,
    `notAllowed` or `noSession` (`src/library/errors.ts`), or an answer without `bookingResultInfo`.

## What to build

- **Tell a timeout from no network.** `send` marks a request its own timer gave up, so that its `ApiError` says
  `timeout`; one aborted by the caller's `signal` is marked too, and is not a failure. The `ApiError`'s message and
  what the crash reports do with it stay as they are.
- **One function of the layer for an action**, which sends `<action>_requested`, runs the request, and sends
  `<action>_completed` or `<action>_failed` with `reason` and `code` worked out from what was thrown:
  - status 0 from the timer: `timeout`; status 0 otherwise: `network`;
  - a 4xx with the main server's code: `refused`, with `code`;
  - a 5xx, a 4xx without a code, or `UNEXPECTED_ANSWER`: `server_error`;
  - a `LibraryError` `network`: `network`; `sessionEnded`, `noSession`, `notAllowed`: `refused` with `code`
    `session_ended`, `no_session`, `not_allowed`; an answer without a booking: `refused` with `seat_taken` when the
    seat is no longer free, `not_allowed` otherwise.
    It never changes what the request returns or throws.
- **The five actions** use it at the places above, with `visibility` (`public` for an Open or Approval Quest, `private`
  for a Closed one; for a Plan, `public` for a new recruiting Quest (input `new-quest`, which the main server posts Open,
  `main-server/src/plans/plans.service.ts:173`) and `private` for a meal or a meeting with Friends) and `how` as the spec's table has them. The form's send for a Global Event counts
  whether or not the main server made a new Quest, since its answer does not say; the main server counts only a new
  one, so the two may differ by the few sends that found the User's own Quest for the event, and the pull request
  says so. The seat booking's stages start just
  before `library.book`, so a press the checks before it turn away sends nothing. A group study room's booking is not
  counted.
- **`api_request_failed`** from `send`, for every failed request to the main server: `route` (the request's path by
  the layer's scrubbing, never the query), `method` and `reason`. A request aborted by its caller sends nothing; a
  401 that a renewal mends sends nothing; a successful request sends nothing.
- The mobile README's "Usage data" lists the events and where each is sent.

## Must not break

- What each action shows and does, its toasts and its failures' words.
- The renewal of a Session on 401, the end of a Session, and ONBOARDING_REQUIRED's way to Onboarding.
- The crash reports: a refusal is still not reported to Sentry, and nothing of an action reaches Sentry.
- The Library Session stays on the phone: no event carries anything of the library but the fixed words above.

## Acceptance criteria

- [x] Each kind of failure gives its `reason` and `code`, and a success gives `_completed`, for an `ApiError` of each
      status, a timer's abort, a caller's abort, `UNEXPECTED_ANSWER` and each `LibraryError`. (Unit tests.)
- [x] A 파티 made by the form, a Plan sent, a join, an invitation accepted, a join request accepted, a Friend Request
      accepted, an Invite Link accepted and an Assistant reply each send `_requested` then `_completed` with their
      properties. (Integration tests over the fake main server, with the PostHog fake.)
- [x] A refused join (a Full Quest) sends `party_join_failed` with `refused` and the code, and `api_request_failed`
      with the scrubbed route and the method. (Integration test.)
- [x] A seat booked sends `seat_booking_requested` then `seat_booking_completed`; a seat taken sends `seat_booking_failed` with `refused` and
      `seat_taken`. (Integration test with the library's stand-in.)
- [x] A request aborted by its caller, and a 401 mended by a renewal, send nothing. (Unit tests.)
- [x] A User who chose no, or turned 내 정보's switch off, sends nothing for any of the above. (Integration test.)
- [x] No event holds a message, a title, a name, a Place or a coordinate: the fake's recorded properties are only
      those of the registry. (Unit test over every recorded event of the integration tests.)
- [x] Lint, format and types of the app pass. No native file changes.

## Comments

### Built (2026-11-26)

What was built (app, plus one main server test case). Nothing was run on a phone or an emulator; events reaching
PostHog are ticket 15's check.

**Timeout, network, a caller's abort.** `ApiError` gains `givenUp: 'timeout' | 'caller' | null` (a fourth constructor
argument, null by default); its message is unchanged, so the crash reports see the same text. `send` in
`src/api/server/http.ts` now gives each request a `givingUp(request)`: the first of its own timer (`timeoutMs`) and its
caller's `signal` to abort sets `givenUp` (`timeout` or `caller`), and the `ApiError(0)` it throws carries it. A
network failure keeps `givenUp` null.

**The layer's function** (`src/telemetry/actions.ts`, exported from `src/telemetry/index.ts`):

- `trackAction(action, request)` sends `<action>_requested`, runs the request, and sends `_completed` or `_failed`;
  it returns what the request gave and rethrows what it threw, and a throwing PostHog never reaches the action.
  `action` is `{ action: 'assistant_reply' }`, `{ action: 'party_creation', visibility }`,
  `{ action: 'party_join', how }` or `{ action: 'friendship_creation', how }`.
- `serverFailure(error)`: status 0 with `givenUp` `timeout` → `timeout`; `caller` → null (no `_failed`, no
  `api_request_failed`); other status 0 without a code → `network`; status 0 with a code (`UNEXPECTED_ANSWER`) →
  `server_error`; a 4xx whose code passes `serverCode` → `refused` with it; a 5xx, a 4xx without such a code, or
  anything not an `ApiError` → `server_error`.
- `seatBooking()` sends `seat_booking_requested` and gives `booked()`, `notBooked('seat_taken' | 'not_allowed')` and
  `threw(error)` (`libraryFailure`: `LibraryError` `network` → `network`; `sessionEnded`, `noSession`, `notAllowed` →
  `refused` with `session_ended`, `no_session`, `not_allowed`; anything else → `server_error`).
- `requestFailed(method, path, error)` sends `api_request_failed` with `route: scrubbedRoute(path)`, `method`, `reason`.

**The hooks:**

- `api_request_failed`: `call` in `src/api/server/http.ts` wraps `sendSignedIn` and the shape check, so it is sent
  after the Session followed a refusal: a 401 a renewal mended, and a success, send nothing. The renewal's own
  `POST /auth/refresh` is not counted separately (it is part of the request that `call` reports).
- Assistant: `askAssistant` in `src/features/assistant/tracked-requests.ts`, called by `answerTo` in `use-chat.ts:228`.
- 파티 form: `making(form, request)` in `src/screens/party/form/use-send.ts:80`, around `makeQuest` (`:114`) and
  `attendGlobalEvent` (`:118`), `visibility` = the form's 공개/비공개. An edit is not counted.
- Plan: `sendPlan` in `tracked-requests.ts`, called in `use-plan-invitation.ts:230`; a Plan taken alone (`takenAlone`,
  moved there) sends nothing; `new-quest` → `public`, a meal or a meeting with Friends → `private`.
- Joins: `joining(how, request)` in `src/screens/party/use-party-actions.ts:139`, for `joinQuest` (`:169`,
  `joined_directly`) and `acceptInvitation` (`:176`, `invitation_accepted`); the Leader's `acceptJoinRequest` in
  `src/screens/room/use-room-actions.ts:241` (`request_accepted`).
- Friends: `befriending(how, accept)` in `src/features/friends/use-friend-changes.ts:35`, for `acceptFriendRequest`
  (`request_accepted`) and `acceptInviteLink` (`invite_link_accepted`).
- Seat: `sendBooking` in `src/screens/main/library/seat-booking.ts:78`, just before `library.book`, after the card's
  own checks; the answer without a booking moved into `notBooked`, which reads the seats again and sends `seat_taken`
  when the seat is no longer free, `not_allowed` otherwise (also when that read throws).

**Differences and things inferred:**

- The form's send for a Global Event uses the form's visibility (usually `public`); the main server sends `private`
  for `POST /quests` (a new Global Event Quest is Closed until the form's PATCH), so per-visibility rates differ for
  these sends besides the count difference the ticket names.
- A refusal that is a route's "none", GET /parties/mine's 404 `NOT_IN_PARTY`, is sent as `api_request_failed` with
  `refused`, as the spec's "any request that failed" reads; it will be frequent, and the dashboard (ticket 16) may want
  to leave it out, or the app could skip it later.
- The caller's abort and the mended 401 are tested in `__tests__/api/http-usage.unit.test.ts`, which calls `call` with
  `fetch`, the tokens and the session events replaced, as `http-timeout.unit.test.ts` does.
- "A unit test over every recorded event of the integration tests": each new integration file checks, after each
  test, every event the PostHog stand-in recorded with `outsideRegistry` (`__tests__/support/usage-actions.ts`: only the
  registry's events and properties, each value one of its words or of its shape, `code` only on `refused`), and that
  check has its own unit tests in `__tests__/telemetry/actions.unit.test.ts`.
- The fake main server answers unset routes 404 without a code, so the integration tests compare only the action's
  stages and the `api_request_failed` of its own route (`eventsOfAction`).
- The main server case of ticket 14's review: `test/usage-events.integration.test.ts`, "a booking party's invitation
  accepted through the room request's consent sends nothing" (the room requests' stage on that file's app, its clock
  stood at the stage's day). Checked to fail when `RoomConsentsService.consent` drops `{ forBooking: true }`.
- No dependency and no native file changed, so the fingerprint is unchanged (not recomputed).

**Tests added:** `__tests__/telemetry/actions.unit.test.ts`, `__tests__/api/http-usage.unit.test.ts`,
`__tests__/usage-party-actions.integration.test.tsx` (join, Full Quest refused with `api_request_failed`, invitation,
join request, chose no, switch off), `usage-friend-actions` (Friend Request, Invite Link, refused, chose no),
`usage-party-form` (public, private, refused, Global Event), `usage-assistant-actions` (reply, 503, meal Plan
`private`, new Quest `public`), `usage-seat-booking` (booked, seat taken, refused, network, session ended);
supports `__tests__/support/usage-actions.ts` and `usage-app.ts`.

**Checks run (2026-11-26 and 27, on this machine), each Jest file in its own capped process:**

- App: `tsc --noEmit`, `oxlint --type-aware`, the test-level check and `prettier --check .`: pass. Main server:
  `tsc --noEmit`, `oxlint --type-aware`, the test-level check and `prettier --check .`: pass.
- New: `telemetry/actions.unit` (32), `api/http-usage.unit` (7), `usage-party-actions` (6), `usage-friend-actions`
  (4), `usage-party-form` (4), `usage-assistant-actions` (4), `usage-seat-booking` (5): pass. Main server
  `usage-events.integration.test.ts` (16, the new case among them): pass.
- Existing, of the request path and the hooked call sites: `api/errors.unit`, `api/http-renewal.unit`,
  `api/http-timeout.unit`, `api/server-session`, `api/server-friends`, `api/server-assistant`,
  `api/server-plan-quest`, `main-chat`, `answer-failure-and-waiting`, `answer-invite`, `answer-new-party`,
  `answer-taken-alone`, `party-form`, `events-party-form`, `party-find`, `party-invites`, `room-people`,
  `friends-server`, `friend-requests`, `answer-frame-library-book`, `background-sharing`: pass.
- Ticket 12's: `telemetry/usage.unit`, `usage-events.unit`, `sentry.unit`, `sentry-import-boundary.unit`,
  `sentry-user`: pass. `me-usage-sending` failed once, since its `events()` now also held `api_request_failed` of the
  fake main server's unset routes; it now compares the events but those, and passes.

### Agent usage (2026-11-26)

- Agent time: about 3 hours 30 minutes (estimate), over two sessions (the machine's session restarted between), much
  of it waiting on single-file Jest runs.
- Tokens: 320,279 in all for the implementation sessions, as their usage reports; the split into input, cache reads, cache writes and output was not available.
