# 01: The administrative API: Global Events, Places, Collection status, Users and friendships

Parent: [P12 spec](../spec.md)
Status: ready-for-agent
Blocked by: None

## What to build

The main server serves the Global Events that P07's Collection stores, through the administrative API below `/admin` and one route for Users. The admin site (tickets 02 and 03) and the app read these routes.

An Administrator lists the Drafts and the published events, reads one event in any state with its source link and its original text, reads the Places with each one's origin and outlines, so that the admin site can show how the seed placed and outlined them, and reads when each Source was last collected and whether it failed. A User's app lists the published Global Events that have not ended, the list it fetches again on `global-events-changed`. An event has ended when its end has passed, or, when it has no end, once the day of its start has passed in Asia/Seoul; the same rule decides both lists of published events. `GET /places` keeps its form, without outlines.

An Administrator creates an event by hand from an organizer's submission, corrects a Draft and publishes it, discards a Draft that is not an event, corrects a published event and cancels one that will not happen. A Draft can be published or discarded, a published event can be cancelled, and nothing else changes an event's state; a published event that is edited stays published. Publishing needs a title, a start and a position, and a published event keeps all three. Every change to an existing event carries the version the Administrator loaded, so that one who edited from an older version is told instead of overwriting another's work. Publishing, editing a published event and cancelling send `global-events-changed`, and the app fetches `GET /global-events` again. The attending Sub Quest of every Quest for the event follows, as P08 built it, and the Holders of those Quests get `quests-changed`.

So that demo accounts are set up without two phones, an Administrator lists the Users with their Friends, makes two Users Friends at once and ends a friendship. Making Friends is what an accepted Friend Request does: the same row of `friendships`, both switches of Location Sharing on, a Friend Request waiting between the two turned into the friendship, as `FriendsService.befriend()` does for an Invite Link, and `friends-changed` to both. Ending is what `DELETE /friends/:userId` does: Location Sharing between the two stops at once, the Meetups still proposed between them are withdrawn, and both get `friends-changed`. Both go through `FriendsService`, so a change by an Administrator and one by either User lock the two Users alike and run one after the other. Nothing else about a User is read or changed: no profile edits, no sign-outs, no removals. `GET /admin/auth/me` answers the signed-in Administrator.

## Acceptance criteria

### Reading Global Events

- [x] The administrative routes live in the Global Events module, in a controller marked `@AdministratorOnly()` under `admin/global-events`, as the README's Administrators section shows.
- [x] `GET /admin/global-events?state=draft` answers every Draft. `GET /admin/global-events?state=published` answers the published events that have not ended. Both are ordered by start, the events without a start last, then by title. A missing or other `state` gets 400.
- [x] Each entry of the list is `{ id, title, startsAt, endsAt, place, latitude, longitude, state, version, postNumber, sourceUrl, missing }`. `missing` names what publishing still needs, `startsAt` and `position` in that order, so a Draft that could not be read fully shows it; a published event's is `[]`.
- [x] `GET /admin/global-events/:id` answers one event in any state, as a list entry with its `description`. An unknown id gets 404 `GLOBAL_EVENT_NOT_FOUND` and an id that is not a UUID 400.
- [x] `GET /admin/places` answers every Place in the order and form of `GET /places`, so that the admin site can offer the list without a User's token.
- [x] `GET /admin/collection-statuses` answers one entry for every Source, in the order of the `Source` enum: `{ source, lastSucceededAt, lastFailedAt, lastFailureReason }`, all three `null` for a Source never collected.
- [x] Every route of this ticket below `/admin` refuses a request without a token, with a User's access token, or from a removed Administrator, with 401.
- [x] `GET /global-events`, a User's route, answers the published Global Events that have not ended, ordered by start then title, each `{ id, title, description, startsAt, endsAt, place, latitude, longitude, sourceUrl }`. A Draft, a cancelled, a discarded and an ended event are never in it. An Administrator's access token gets 401, and a User before onboarding 403 `ONBOARDING_REQUIRED`, as on every User's route.
- [x] Main server tests at the API, with events stored through a database connection as `test/quests.ts` stores them: each list holds the events of its state and leaves out the others; the order, with events without a start last; `missing` for a Draft without a start, one without a position and a published event; an event that ended yesterday, one without an end that started earlier today and one that started yesterday without an end; one event in each state read by id, an unknown id and an id that is not a UUID; the Places; the Collection statuses, a Source never collected among them; a User's token on each `/admin` route and an Administrator's on `GET /global-events` refused. The test files share one database, and other files store events, so a test looks for its own events in a list instead of expecting the whole list.
- [x] The main server's README records the routes, their shapes and the rule for an ended event in Global Events, and no longer says that no route serves Global Events or the Collection status. The socket server's README names `GET /global-events` as what the app fetches on `global-events-changed`.
- [ ] `pnpm lint`, `pnpm format:check`, `pnpm typecheck` and `pnpm test` pass in `main-server/`, and `pnpm format:check` in `socket-server/`.
  - Not confirmed in one run: `pnpm lint`, `pnpm format:check` and `pnpm typecheck` in `main-server/` and `pnpm format:check` in `socket-server/` pass, but no whole `pnpm test` run passed on this machine while other test suites ran beside it (load averages of 60 to 140). Each run failed in other files than this ticket's, different ones each time: 5 s test timeouts and Prisma's P2028 (a transaction not started in time). Every file that failed passed when run alone, and a run with `--maxWorkers=4` failed only on one P2028. To be confirmed by a run on a quiet machine or in CI.

### Changing Global Events

- [x] `POST /admin/global-events` with `{ title, description, startsAt?, endsAt?, place?, latitude?, longitude? }` creates a Draft and answers 201 with it as `GET /admin/global-events/:id` answers it: version 1, `postNumber` and `sourceUrl` `null`. It is marked `@Idempotent({ required: true })` with the module's interceptor as the README's "Making a handler safe to repeat" says: a request without an `Idempotency-Key` gets 400 `IDEMPOTENCY_KEY_REQUIRED`, and the same key again answers the same event and stores no second one.
- [x] `PATCH /admin/global-events/:id` with `{ version, title?, description?, startsAt?, endsAt?, place?, latitude?, longitude? }` edits a Draft or a published event and answers 200 with the event, its version raised by one. A field left out stays, and `null` clears an optional one. A published event stays published.
- [x] The fields, on creating and editing: `title` 1 to 200 characters after trimming; `description` any text, empty included; `startsAt` and `endsAt` times with their offset, the end after the start; `place` 1 to 200 characters after trimming, or `null`; `latitude` and `longitude` given together, both `null` to clear the position, and inside the Campus Boundary. A body that breaks a rule gets 400 with a message naming the field, and nothing changes.
- [x] `POST /admin/global-events/:id/publish` with `{ version }` turns a Draft into a published event and answers 200 with it, its version raised. A Draft without a start or a position gets 409 `GLOBAL_EVENT_INCOMPLETE` with `missing` as in Reading Global Events above. An edit that would leave a published event without its start or its position gets the same refusal.
- [x] `POST /admin/global-events/:id/discard` with `{ version }` turns a Draft into a discarded event, and `POST /admin/global-events/:id/cancel` with `{ version }` a published event into a cancelled one; each answers 200 with the event, its version raised.
- [x] Any other change of state, and an edit of a cancelled or a discarded event, gets 409 `GLOBAL_EVENT_STATE` with the event's `state` in the body.
- [x] A change whose `version` is not the stored one gets 409 `GLOBAL_EVENT_CHANGED` with the stored `version` in the body, and nothing changes. The version is compared and raised in the statement that writes the change, so of two changes made from the same version at the same moment one is applied and the other refused.
- [x] The checks run in this order: 404 `GLOBAL_EVENT_NOT_FOUND`, `GLOBAL_EVENT_STATE`, `GLOBAL_EVENT_CHANGED`, `GLOBAL_EVENT_INCOMPLETE`.
- [x] After the change commits, `GlobalEventsService.signalChanged()` sends `global-events-changed` once for publishing, for an edit of a published event and for cancelling. Creating, editing a Draft, discarding and a refused change send none.
- [x] After an edit of a published event or its cancelling commits, `quests-changed` goes to the Holders of every Quest for the event. A Holder's `GET /quests` then shows the edited title, time and place on the attending Sub Quest, and `cancelled` after cancelling.
- [x] Main server tests at the API: a hand-made Draft, its repeat with the same key, and one without a key; each field rule; an edit of a Draft and of a published event, with a field left out and one cleared; publishing, with the start missing, the position missing, and an edit that removes the position from a published event; discarding and cancelling; each forbidden change of state and an edit of a cancelled and of a discarded event; an edit from an older version, and two edits from the same version at the same moment; that a published event then appears in `GET /global-events` and a Draft, a cancelled and a discarded one do not; the signal for each change that sends it and none for the others; a Holder's attending Sub Quest after an edit and after cancelling, with `quests-changed` to the Holders; a User's token refused on each route.
- [x] The test that a change sends no `global-events-changed` is not broken by another test file's signal. Today only `test/global-events.e2e-spec.ts` publishes events and frames each check between two signals of its own; every test that now publishes, edits or cancels either joins that file or the checks of no signal are made so that another file's signals cannot break them.
- [x] The main server's README records the routes, the field rules, the allowed changes of state, the version check, the refusals and the signals in Global Events, and the Quests section says that the Holders get `quests-changed` when their event is edited or cancelled.
- [ ] `pnpm lint`, `pnpm format:check`, `pnpm typecheck` and `pnpm test` pass in `main-server/`.
  - Not confirmed in one run: `pnpm lint`, `pnpm format:check` and `pnpm typecheck` pass. The whole suite, run once with `--maxWorkers=4` while other test suites ran beside it (load averages of 50 to 100), failed in 9 files this ticket does not touch, every one with 5 s test timeouts but `collection-statuses.e2e-spec.ts`, whose database could not be dropped (`permission denied to terminate process`); 1311 tests passed, every file of this ticket's among them. Those 9 files, run again one at a time, passed (284 tests). To be confirmed by a run on a quiet machine or in CI.

### Users and friendships: the API

- [x] The routes live in the Friends module, in a controller marked `@AdministratorOnly()`, as Reading Global Events above puts the administrative routes of Global Events in their module.
- [x] `GET /admin/users` answers every User as `{ id, name, email, department, friendId, onboarded, friendCount }`, where `friendCount` is the number of their Friends. The order is by name in the Korean order, then by email; Users before onboarding, whose name is empty, come last.
- [x] `GET /admin/users/:id/friends` answers the User's Friends in the order of `GET /friends`, each as `{ id, name, email, department, friendId, since }`, `since` being when the friendship started. An unknown id gets 404 `USER_NOT_FOUND` and an id that is not a UUID 400.
- [x] `POST /admin/friendships` with `{ "userAId": "...", "userBId": "..." }`, in either order, makes the two Friends and answers 204. A waiting Friend Request between them becomes the friendship and keeps its sender; otherwise the sender is `userAId`. Both switches start on, and `friends-changed` goes to both once the friendship is stored. A repeat is refused as already Friends, so it takes no `Idempotency-Key`.
- [x] Refusals, in this order: an id that is not a UUID 400; the same User twice 400 `SAME_USER`; a User that does not exist 404 `USER_NOT_FOUND`; a User before onboarding 409 `USER_NOT_ONBOARDED`; two Friends 409 `ALREADY_FRIENDS`. A refusal stores nothing and sends no signal.
- [x] `DELETE /admin/friendships/:userAId/:userBId`, in either order, ends the friendship through `FriendsService.end()` and answers 204: `friends-changed` to both, `position-removed` to each who saw the other, and the Meetups still proposed between them withdrawn with `meetups-changed`. Two Users who are not Friends, unknown Users included, get 404 `FRIEND_NOT_FOUND`, and an id that is not a UUID 400.
- [x] Every route of this ticket refuses a request without a token, with a User's access token, or from a removed Administrator, with 401.
- [x] Main server tests with Vitest at the API: the Users list with its order, a User before onboarding and the count of Friends; a User's Friends, an unknown id and one that is not a UUID; making two Users Friends, after which each sees the other in `GET /friends` with sharing on; making Friends of two Users with a Friend Request waiting, which leaves no request; each refusal; `friends-changed` to both, and no signal after a refusal; ending a friendship, with `position-removed` between two Users who saw each other and a proposed Meetup withdrawn; ending one that does not exist; a User's token refused on each route. The test files share one database, so a test looks for its own Users in the list instead of expecting the whole list.
- [x] The main server's README records the routes, their shapes and the refusals in Friends, and says that an Administrator's friendship is stored and announced as an accepted Friend Request's. The admin site's README records the Users page. `GLOSSARY.md` says that an Administrator can also make two Users Friends.
  - The main server's README (Friends) and `GLOSSARY.md` (Administrator, Friend) were updated with the API; the admin site's README records the Users pages in Users and friendships.
- [x] `pnpm lint`, `pnpm format:check`, `pnpm typecheck` and `pnpm test` pass in `main-server/` and `admin/`.
  - In `main-server/` the four passed with the API, the whole suite in one run with `--maxWorkers=4` (105 files, 1380 tests); in `admin/` the four pass with the Users pages.

### Places with their outlines: the API

- [ ] Loading the seed stores each outline of a Place as `{ "source": "national_map", "id": "B0010000000RF2ENL", "ring": [...] }` or `{ "source": "openstreetmap", "id": "way/193893586", "ring": [...] }`, the id being the one its outline file gives. Loading again rewrites every Place's outlines in this form. `PlaceLookup` reads the rings of this form and answers as before, and the comment on `Place.outlines` in the schema describes it.
  - Dropped: the outlines stay stored as rings; see Differences below.
- [x] `GET /admin/places` answers each Place, in the order of `GET /places`, as `{ id, number, name, latitude, longitude, origin, outlines }`, where `origin` is `campus_map`, `openstreetmap` or `national_map` and `outlines` the stored list, `[]` for a Place without one. `GET /places`, `GET /places/search` and `GET /places/at` answer as before, without outlines.
- [x] Main server tests at the API: a Place with an outline of the national map, `100` with OpenStreetMap's `way/193893586` from `place-outlines.json`, and `253`, which the file leaves without one; the order of `GET /places`; `GET /places` without outlines; a User's token on `GET /admin/places` refused. The tests of `PlaceLookup` and `GET /places/at` pass unchanged.
- [x] The main server's README records the stored form of an outline and `GET /admin/places` in Places and Seed data, and no longer says that no route serves the outlines. The admin site's README records the Places page.
- [x] `pnpm lint`, `pnpm format:check`, `pnpm typecheck` and `pnpm test` pass in `main-server/` and `admin/`.
  - In `main-server/` the three checks and `test/admin-places.e2e-spec.ts` alone were run, not the whole suite.

## Comments

### Decisions (2026-10-06, reading)

- **Where the routes are**: the event routes in `AdminGlobalEventsController` (`src/global-events/admin-global-events.controller.ts`, `@AdministratorOnly()`, `admin/global-events`) of `GlobalEventsModule`. `GET /admin/places` in `AdminPlacesController` of `PlacesModule` and `GET /admin/collection-statuses` in `AdminCollectionController` of `CollectionModule`, each `@AdministratorOnly()`, beside the service that owns the data. `GET /global-events` is an unmarked handler of the existing `GlobalEventsController`.
- **Routes**: `GET /global-events` → `[{ id, title, description, startsAt, endsAt, place, latitude, longitude, sourceUrl }]`; `GET /admin/global-events?state=draft|published` → `[{ id, title, startsAt, endsAt, place, latitude, longitude, state, version, postNumber, sourceUrl, missing }]`; `GET /admin/global-events/:id` → the entry with `description`; `GET /admin/places` → `PlacesService.list()`; `GET /admin/collection-statuses` → `[{ source, lastSucceededAt, lastFailedAt, lastFailureReason }]`. Times are ISO strings in UTC, the other fields as stored (`null` where the column is empty).
- **Ended**: not ended means `endsAt > now`, or `endsAt` null and `startsAt >=` 00:00 Asia/Seoul of today; the private `findListed(state)` of `GlobalEventsService` applies it to both lists of published events. Now is `new Date()`, not the Quests' `CLOCK`.
- **Order**: `startsAt` ascending with nulls last, then `title` in the database's order (`BY_START`).
- **`missing`**: computed only for a Draft, from the stored fields: `startsAt` when it is null, `position` when either coordinate is null. Every other state answers `[]`. Changing Global Events can export the private `missingFor()` for `GLOBAL_EVENT_INCOMPLETE`.
- **Refusals**: an unknown id 404 `GLOBAL_EVENT_NOT_FOUND` through `notFound()` of `src/quests/refusals.ts`, as the parties and timetable modules use it; a non-UUID id and a missing or other `state` 400 from the zod schemas.
- **Collection statuses**: `CollectionService.statuses()` reads every stored row and answers one entry per value of `Object.values(Source)`, so a Source never collected is all `null` without a row.
- **Tests**: `test/global-event-lists.ts` (schemas and callers; `publishedAmong()` and `listedAmong()` keep only a test's own events), `test/published-global-events.e2e-spec.ts`, `test/admin-global-events.e2e-spec.ts`, `test/admin-global-event.e2e-spec.ts`, `test/ended-global-events.e2e-spec.ts` (both lists), `test/admin-places.e2e-spec.ts` (equal to `GET /places`), `test/collection-statuses.e2e-spec.ts` and `test/admin-reading-refusals.e2e-spec.ts`. Every Source is collected by some file of the shared database, so the statuses test runs a second server on a database of its own; `createDatabase()` in `test/containers.ts` now also answers its `url`. Post numbers 920000 and 930000 onwards.
- **Comments of other tests** that said no route serves Global Events or the Collection status are reworded; their tests still read the database directly.

### Decisions (2026-10-06, changing)

- **Routes**, in `AdminGlobalEventsController`, each answering the event as `GET /admin/global-events/:id` does: `POST /admin/global-events` (201, `@Idempotent({ required: true })`), `PATCH /admin/global-events/:id` (200), and `POST /admin/global-events/:id/publish`, `/discard` and `/cancel` with `{ version }` (200). The body schemas are in `src/global-events/dto/change-global-event.dto.ts`; times are parsed into `Date`s there.
- **Create**: `title` and `description` are required; the other fields left out are `null`.
- **One write path**: `GlobalEventsService.change(id, version, from, change)` reads the event, refuses in the ticket's order (404, `GLOBAL_EVENT_STATE` with `state`, `GLOBAL_EVENT_CHANGED` with `version`, `GLOBAL_EVENT_INCOMPLETE` with `missing`, the exported `missingFor()` of Reading Global Events), then writes with `updateManyAndReturn` where `{ id, version }` and `version: { increment: 1 }`. When that statement changes no row, the event changed between the read and the write, and the change is checked again as the event now is, which refuses it. No transaction or row lock is needed: every write raises the version, so the fields checked are those written over.
- **Refusal bodies** carry their extra field through `conflict(code, message, details)` of `src/quests/refusals.ts`, which gained the optional `details` argument.
- **Rules that need the stored event or the Campus Boundary** are checked in the service with the validation pipe's 400 shape (`message: ['field: …']`): a position outside the Campus Boundary (`latitude: …`), checked before the event is read, and, for an edit that sends a time, an end not after the start once merged with the stored one (`endsAt: …`), checked after `GLOBAL_EVENT_CHANGED` and before `GLOBAL_EVENT_INCOMPLETE`. Publishing, discarding and cancelling do not check the stored times.
- **Signals**, after the write: `signalChanged()` when the event was or became published (publish, edit of a published event, cancel); `quests-changed` to `QuestsService.holderIdsFor(globalEventId)`, the Holders of every Quest for the event read from `quest_holders`, when it was published (edit, cancel). `GlobalEventsModule` now imports `QuestsModule`.
- **Signal framing**: `signalsWhile(app, watcher, name, act)` moved from `test/global-events.e2e-spec.ts` to `test/signals.ts`. That file and the new `test/admin-global-event-signals.e2e-spec.ts`, the two that check that no `global-events-changed` is sent, each start a Redis container of their own and run their server and `SignalWatcher` on it (`SignalWatcher.start()` takes the Redis settings), so no other file's signal reaches them. The Administrator's signal tests did not join `test/global-events.e2e-spec.ts`, which would have passed lint's 300 lines.
- **Tests**: `test/global-event-changes.ts` (callers), `test/admin-global-event-creation.e2e-spec.ts`, `-fields`, `-edits`, `-states`, `-quests`, `-signals` and `test/admin-changing-refusals.e2e-spec.ts`. Published, cancelled and discarded events a test starts from are stored through a database connection, as before, so they send nothing.
- **Comments of other code** that said no route creates or changes a Global Event (`test/quests.ts`, the README's Quests section, `prisma/schema.prisma`'s comment on `version`) are reworded.

### Decisions (2026-10-06, Users and friendships API)

- **API half only** in this commit: the admin site's Users page, its tests and its README are still to build.
- **Routes**, in `AdminFriendsController` (`src/friends/admin-friends.controller.ts`, `@AdministratorOnly()`, `admin`) of `FriendsModule`: `GET /admin/users` → `[{ id, name, email, department, friendId, onboarded, friendCount }]`; `GET /admin/users/:id/friends` → `[{ id, name, email, department, friendId, since }]`; `POST /admin/friendships` `{ userAId, userBId }` → 204; `DELETE /admin/friendships/:userAId/:userBId` → 204.
- **Service**: the reads and the checks before making Friends are in `AdminFriendsService` (`src/friends/admin-friends.service.ts`), since `friends.service.ts` is at lint's 300 lines; `FriendsService` only exports `ofUser()`. Making Friends calls `FriendsService.befriend(userAId, userBId, () => Promise.resolve())`, which locks both Users, refuses two Friends, turns a waiting request into the friendship with its sender kept, and sends `friends-changed` after the commit. Ending calls `FriendsService.end(userAId, userBId)` as it is.
- **Refusal checks before the lock**: `SAME_USER`, then `USER_NOT_FOUND` (either User missing) and `USER_NOT_ONBOARDED` (either User before onboarding), read without a lock: no route deletes a User or undoes onboarding, so neither can change before `befriend()` locks them.
- **Order of the Users**: onboarded first, then `localeCompare(…, 'ko')` on the name, then the email by code units. A User's Friends use `byName()` of `src/friends/dto/friends.dto.ts`, the same comparison as `GET /friends`, which keeps its own inline copy so that `friends.service.ts` stays within 300 lines.
- **`friendCount`** counts accepted friendships through Prisma's filtered relation counts (`friendshipsAsA` and `friendshipsAsB`); a waiting request is not a Friend.
- **`GET /admin/auth/me`** → `{ id, email }`, in `AdministratorAuthController`, read through `AdministratorAuthService.account()`; the DTO is `src/auth/dto/administrator-account.dto.ts`. An Administrator removed between the guard and the read gets 401, as the guard would answer.
- **Tests**: `test/admin-users.ts` (callers and Users with an email address of their own, since the list is ordered and found by email), `test/admin-users.e2e-spec.ts`, `test/admin-friendships.e2e-spec.ts` (no signal after a refusal is checked with `signalsWhile()` and the User's own signals, which no other file sends), `test/admin-friendship-ending.e2e-spec.ts`, `test/admin-friends-refusals.e2e-spec.ts`, and `GET /admin/auth/me` in `test/administrator-auth.e2e-spec.ts`. `removedAdministratorToken(app)` moved from `test/admin-reading-refusals.e2e-spec.ts` to `test/sign-in.ts` for both refusal files.

### Differences (2026-10-06, campus map)

- The outlines stay stored as they are, rings of `{ latitude, longitude }`, with no source or id per outline and no
  reseed. `GET /admin/places` serves the rings, and the record shows each outline's number of points instead of its
  file and id. The tests of "outlines of each source" check the record of Places of different origins instead.

### Decisions (2026-10-06, campus map API)

- **API**, in its own commit: `AdminPlacesController` (`src/places/admin-places.controller.ts`) answers
  `PlacesService.listForAdministrators()`, the Places in `byNumber` order as `AdminPlaceDto`
  (`src/places/dto/admin-place.dto.ts`): `PlaceDto` with `origin` and `outlines`, parsed from the stored JSON.
  `test/admin-places.e2e-spec.ts` checks the order and fields against `GET /places`, that `GET /places` has no
  outlines, 301's outlines, 100's one outline (`way/193893586` in `place-outlines.json`), 253's none, and a User's
  token refused with 401.

### Agent usage (2026-10-06)

Every figure below is an estimate.

- Reading Global Events:
  - Agent time: about 50 minutes, an estimate: one implementing agent. The session that ran it is not counted here.
  - Tokens, counted from the agent's transcript up to the commit, so an estimate:
    - Input: about 15.5M, of which 15,261,335 were cache reads, 212,457 cache writes and 170 uncached.
    - Output: 2,065, a lower bound, since the transcript records only part of the output of most steps.
- Changing Global Events:
  - Agent time: about 35 minutes, an estimate: one implementing agent, which also implemented the API half of Users and friendships afterwards in the same session. The session that ran it is not counted here.
  - Tokens, counted from the agent's transcript up to this ticket's commit, so an estimate:
    - Input: about 14.3M, of which 13,807,325 were cache reads, 462,630 cache writes and 152 uncached.
    - Output: 876, a lower bound, since the transcript records only part of the output of most steps.
- Users and friendships, the API half:
  - Agent time: about 15 minutes for the API half, an estimate: the same implementing agent as Changing Global Events, after its commit. The session that ran it is not counted here. The Users page is not counted.
  - Tokens, counted from the agent's transcript between Changing Global Events' commit and this one, so an estimate:
    - Input: about 10.0M, of which 9,974,598 were cache reads, 59,194 cache writes and 66 uncached.
    - Output: 352, a lower bound, since the transcript records only part of the output of most steps.
- The campus map's API: counted in ticket 03 (Agent usage, the campus map), whose figure covers its API commit too.
- Total, an estimate:
  - Agent time: about 1 hour 40 minutes.
  - Input: about 39.8M, of which 39,043,258 were cache reads, 734,281 cache writes and 388 uncached.
  - Output: 3,293, a lower bound.
