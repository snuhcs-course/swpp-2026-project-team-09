# 13: The app's events for the five actions, and `api_request_failed`

Parent: [P08 spec](../spec.md), [Usage data with PostHog](../spec.md#usage-data-with-posthog)
Status: ready-for-agent
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

- [ ] Each kind of failure gives its `reason` and `code`, and a success gives `_completed`, for an `ApiError` of each
      status, a timer's abort, a caller's abort, `UNEXPECTED_ANSWER` and each `LibraryError`. (Unit tests.)
- [ ] A 파티 made by the form, a Plan sent, a join, an invitation accepted, a join request accepted, a Friend Request
      accepted, an Invite Link accepted and an Assistant reply each send `_requested` then `_completed` with their
      properties. (Integration tests over the fake main server, with the PostHog fake.)
- [ ] A refused join (a Full Quest) sends `party_join_failed` with `refused` and the code, and `api_request_failed`
      with the scrubbed route and the method. (Integration test.)
- [ ] A seat booked sends `seat_booking_requested` then `seat_booking_completed`; a seat taken sends `seat_booking_failed` with `refused` and
      `seat_taken`. (Integration test with the library's stand-in.)
- [ ] A request aborted by its caller, and a 401 mended by a renewal, send nothing. (Unit tests.)
- [ ] A User who chose no, or turned 내 정보's switch off, sends nothing for any of the above. (Integration test.)
- [ ] No event holds a message, a title, a name, a Place or a coordinate: the fake's recorded properties are only
      those of the registry. (Unit test over every recorded event of the integration tests.)
- [ ] Lint, format and types of the app pass. No native file changes.

## Comments
