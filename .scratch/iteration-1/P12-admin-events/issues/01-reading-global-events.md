# 01: Reading Global Events: the administrative API's lists and the User's list

Parent: [P12 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

The main server serves the Global Events that P07's Collection stores. An Administrator, through the administrative API below `/admin`, lists the Drafts and the published events, reads one event in any state with its source link and its original text, reads the list of Places to choose an event's place from, and reads when each Source was last collected and whether it failed. A User's app lists the published Global Events that have not ended, the list it fetches again on `global-events-changed`.

Nothing changes an event in this ticket; ticket 02 adds the changes. The routes are those the admin site (tickets 04 and 05) and the app read.

An event has ended when its end has passed, or, when it has no end, once the day of its start has passed in Asia/Seoul. The same rule decides both lists of published events.

## Acceptance criteria

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

## Comments

### Decisions (2026-10-06)

- **Where the routes are**: the event routes in `AdminGlobalEventsController` (`src/global-events/admin-global-events.controller.ts`, `@AdministratorOnly()`, `admin/global-events`) of `GlobalEventsModule`. `GET /admin/places` in `AdminPlacesController` of `PlacesModule` and `GET /admin/collection-statuses` in `AdminCollectionController` of `CollectionModule`, each `@AdministratorOnly()`, beside the service that owns the data. `GET /global-events` is an unmarked handler of the existing `GlobalEventsController`.
- **Routes**: `GET /global-events` → `[{ id, title, description, startsAt, endsAt, place, latitude, longitude, sourceUrl }]`; `GET /admin/global-events?state=draft|published` → `[{ id, title, startsAt, endsAt, place, latitude, longitude, state, version, postNumber, sourceUrl, missing }]`; `GET /admin/global-events/:id` → the entry with `description`; `GET /admin/places` → `PlacesService.list()`; `GET /admin/collection-statuses` → `[{ source, lastSucceededAt, lastFailedAt, lastFailureReason }]`. Times are ISO strings in UTC, the other fields as stored (`null` where the column is empty).
- **Ended**: not ended means `endsAt > now`, or `endsAt` null and `startsAt >=` 00:00 Asia/Seoul of today; the private `findListed(state)` of `GlobalEventsService` applies it to both lists of published events. Now is `new Date()`, not the Quests' `CLOCK`.
- **Order**: `startsAt` ascending with nulls last, then `title` in the database's order (`BY_START`).
- **`missing`**: computed only for a Draft, from the stored fields: `startsAt` when it is null, `position` when either coordinate is null. Every other state answers `[]`. Ticket 02 can export the private `missingFor()` for `GLOBAL_EVENT_INCOMPLETE`.
- **Refusals**: an unknown id 404 `GLOBAL_EVENT_NOT_FOUND` through `notFound()` of `src/quests/refusals.ts`, as the parties and timetable modules use it; a non-UUID id and a missing or other `state` 400 from the zod schemas.
- **Collection statuses**: `CollectionService.statuses()` reads every stored row and answers one entry per value of `Object.values(Source)`, so a Source never collected is all `null` without a row.
- **Tests**: `test/global-event-lists.ts` (schemas and callers; `publishedAmong()` and `listedAmong()` keep only a test's own events), `test/published-global-events.e2e-spec.ts`, `test/admin-global-events.e2e-spec.ts`, `test/admin-global-event.e2e-spec.ts`, `test/ended-global-events.e2e-spec.ts` (both lists), `test/admin-places.e2e-spec.ts` (equal to `GET /places`), `test/collection-statuses.e2e-spec.ts` and `test/admin-reading-refusals.e2e-spec.ts`. Every Source is collected by some file of the shared database, so the statuses test runs a second server on a database of its own; `createDatabase()` in `test/containers.ts` now also answers its `url`. Post numbers 920000 and 930000 onwards.
- **Comments of other tests** that said no route serves Global Events or the Collection status are reworded; their tests still read the database directly.

### Agent usage (2026-10-06)

- Agent time: about 50 minutes, an estimate: one implementing agent. The session that ran it is not counted here.
- Tokens, counted from the agent's transcript up to the commit, so an estimate:
  - Input: about 15.5M, of which 15,261,335 were cache reads, 212,457 cache writes and 170 uncached.
  - Output: 2,065, a lower bound, since the transcript records only part of the output of most steps.
