# 01: Reading Global Events: the administrative API's lists and the User's list

Parent: [P12 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

The main server serves the Global Events that P07's Collection stores. An Administrator, through the administrative API below `/admin`, lists the Drafts and the published events, reads one event in any state with its source link and its original text, reads the list of Places to choose an event's place from, and reads when each Source was last collected and whether it failed. A User's app lists the published Global Events that have not ended, the list it fetches again on `global-events-changed`.

Nothing changes an event in this ticket; ticket 02 adds the changes. The routes are those the admin site (tickets 04 and 05) and the app read.

An event has ended when its end has passed, or, when it has no end, once the day of its start has passed in Asia/Seoul. The same rule decides both lists of published events.

## Acceptance criteria

- [ ] The administrative routes live in the Global Events module, in a controller marked `@AdministratorOnly()` under `admin/global-events`, as the README's Administrators section shows.
- [ ] `GET /admin/global-events?state=draft` answers every Draft. `GET /admin/global-events?state=published` answers the published events that have not ended. Both are ordered by start, the events without a start last, then by title. A missing or other `state` gets 400.
- [ ] Each entry of the list is `{ id, title, startsAt, endsAt, place, latitude, longitude, state, version, postNumber, sourceUrl, missing }`. `missing` names what publishing still needs, `startsAt` and `position` in that order, so a Draft that could not be read fully shows it; a published event's is `[]`.
- [ ] `GET /admin/global-events/:id` answers one event in any state, as a list entry with its `description`. An unknown id gets 404 `GLOBAL_EVENT_NOT_FOUND` and an id that is not a UUID 400.
- [ ] `GET /admin/places` answers every Place in the order and form of `GET /places`, so that the admin site can offer the list without a User's token.
- [ ] `GET /admin/collection-statuses` answers one entry for every Source, in the order of the `Source` enum: `{ source, lastSucceededAt, lastFailedAt, lastFailureReason }`, all three `null` for a Source never collected.
- [ ] Every route of this ticket below `/admin` refuses a request without a token, with a User's access token, or from a removed Administrator, with 401.
- [ ] `GET /global-events`, a User's route, answers the published Global Events that have not ended, ordered by start then title, each `{ id, title, description, startsAt, endsAt, place, latitude, longitude, sourceUrl }`. A Draft, a cancelled, a discarded and an ended event are never in it. An Administrator's access token gets 401, and a User before onboarding 403 `ONBOARDING_REQUIRED`, as on every User's route.
- [ ] Main server tests at the API, with events stored through a database connection as `test/quests.ts` stores them: each list holds the events of its state and leaves out the others; the order, with events without a start last; `missing` for a Draft without a start, one without a position and a published event; an event that ended yesterday, one without an end that started earlier today and one that started yesterday without an end; one event in each state read by id, an unknown id and an id that is not a UUID; the Places; the Collection statuses, a Source never collected among them; a User's token on each `/admin` route and an Administrator's on `GET /global-events` refused. The test files share one database, and other files store events, so a test looks for its own events in a list instead of expecting the whole list.
- [ ] The main server's README records the routes, their shapes and the rule for an ended event in Global Events, and no longer says that no route serves Global Events or the Collection status. The socket server's README names `GET /global-events` as what the app fetches on `global-events-changed`.
- [ ] `pnpm lint`, `pnpm format:check`, `pnpm typecheck` and `pnpm test` pass in `main-server/`, and `pnpm format:check` in `socket-server/`.
