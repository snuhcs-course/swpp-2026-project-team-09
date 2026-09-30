# 01: Menus: receive, store and serve

Parent: [P07 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

The main server receives its first messages from the worker server and stores what they carry. A collector on the worker sends the menus it read as a request-and-response message. The main server checks the message against a schema, refuses one that does not match, stores the menus once however many times the same message arrives, and answers. A User's app then gets one day's menus grouped by restaurant and then by meal, each with its price when the page gave one, each restaurant's operating hours as the original line of text, and the time the menus were last collected. When a collection fails, the worker reports it: the failure is recorded with its time, and the menus already stored stay and are still served.

This ticket sets the conventions every later worker message follows: how a message is named and shaped, how it is validated, what an invalid message gets back, how a source's collection status is recorded, and how a test sends a message to the server. The worker side is ticket 07.

## Acceptance criteria

- [x] A menu entry has a restaurant, a date, a meal (breakfast, lunch or dinner), a menu name and an optional price. Operating hours are kept per restaurant and day as the original line of text, or absent. Dates are calendar days in Asia/Seoul.
- [x] The main server handles a request-and-response message that carries the menus one collection read: the source, the time of collection, and the entries and operating hours per restaurant and day. It validates the message against a schema. A message that does not match is refused with an answer that names the problem, and nothing from it is stored.
- [x] Storing is repeatable: the same message sent twice results in one set of records. A later collection of the same restaurant and day replaces that restaurant's entries for that day, so a menu the site changed or removed does not linger. This rule is recorded in the README.
- [x] The main server records, per source, when it was last collected successfully and, separately, the last failure with its time and its message. A successful collection sets the collected time. A failure message from the worker records the failure and leaves every stored record as it is.
- [x] A User's route returns the menus of one requested day, grouped by restaurant and then by meal, with each entry's name and price, each restaurant's operating hours text, and the time menus were last collected. A day with nothing stored returns an empty list, not an error, so the app can ask for each of the coming days. The route needs a User's access token.
- [x] Nothing in a response invents a price: an entry without one is returned without one.
- [x] The README of the main server records the worker message conventions: the name and shape of the message, how it is validated, what a refused message gets back, how the collection status is kept, and how a test sends a message. Later tickets follow this note.
- [x] Tests at the message boundary, sending messages over the test Redis as the worker would: a valid message is stored and served; an invalid message is refused and nothing is stored; the same message twice is stored once; a changed menu for the same restaurant and day replaces the earlier one; a failure message records the failure and the earlier menus are still served; the collected time is served; a day without menus returns an empty list.

## Comments

### Messages (2026-10-01)

- **Names**: `menus-collected` and `collection-failed`, in kebab case and named after what happened, as `session-ended` is. Both are request-and-response (`@MessagePattern()`), so the worker learns whether a message was stored. Later collectors send `<what>-collected`.
- **Shape**: the payload names its `source` and the time the collection ran (`collectedAt`, `failedAt`) in ISO 8601 with an offset. `menus` is a list of one restaurant's menus on one day: `{ restaurant, date, operatingHours, entries: [{ meal, name, price }] }`, with `date` as `YYYY-MM-DD`. A missing price or hours is `null`, never left out, so the worker's type states every field.
- **Validation**: `@WorkerMessage(schema)` in `src/common/worker-message.ts` puts a `StandardSchemaValidationPipe` on the payload. Ticket P04-10 found that `main.ts` connects messaging without `inheritAppConfig`, so the global pipe never reaches a message handler. Turning `inheritAppConfig` on was not chosen: it would also put `AccessTokenGuard` and the idempotency interceptor in front of every message handler.
  - Schemas are `z.strictObject`, so a misspelt field is refused instead of dropped.
  - A price must fit the `INTEGER` column (`z.int32()`), so a price that is too large is refused with its field named instead of failing in the database.
  - A message in which one restaurant and day appears twice is refused. Otherwise the two entry lists would be merged into one day.
- **Answers**: a handled message answers `{ status: 'ok' }`. A refusal answers `{ status: 'error', message }`, with each problem as `path: problem`, separated by `; `. It is one string, not the list an HTTP 400 carries, because Nest answers an error inside a handler as `{ status: 'error', message: 'Internal server error' }`. The worker then reads one form in both cases.

### Storage and the route (2026-10-01)

- `restaurant_days` holds one restaurant's day, unique by day and restaurant. It keeps the operating hours line and the time of the collection that stored it. `menu_entries` holds the day's entries with their meal, name and price. Each entry also has a `position` that keeps the page's order.
- A message replaces each restaurant and day it carries, in one transaction with the collection status: it upserts the day, deletes the day's entries and inserts the new ones.
  - A restaurant the message leaves out keeps its day.
  - The README therefore tells collectors to send an emptied or closed restaurant with `entries: []`. That covers ticket 08's closure and empty cell.
- `collection_statuses` has one row per source, with a UUID `id` as the README asks of every record.
  - The sources are the `CollectionSource` values `coop_menus`, `dormitory_menus` and `veterinary_menus`, one per page, so that a broken Co-op page and a broken dormitory page are noticed apart (ticket 08).
  - The success time is the message's `collectedAt` and the failure time the worker's `failedAt`, not the times the main server received them.
  - A success does not clear the last failure.
- The route is `GET /menus?date=YYYY-MM-DD`, for Users.
  - `date` is required. There is no default day, because the app asks for each day it shows.
  - The answer is a plain list, so an empty day is `[]`.
  - Restaurants are ordered by name; P15 can arrange them otherwise.
  - `meals` lists only the meals that have entries, from breakfast to dinner.
- "The time the menus were last collected" is served for each restaurant: the `collectedAt` of the collection that stored that restaurant's day.
  - When one source fails, its restaurants keep their older time while the others show the new one. A single time for the whole answer would make the stale menus look fresh.
  - The source's `lastSucceededAt` is recorded but not served. P12's admin site reads it (story 18).

### Tests (2026-10-01)

- `test/menus.e2e-spec.ts` has 16 tests. Each sends messages over Redis with `startWithWorker()` and `sendAsWorker()` from `test/worker.ts`, and reads what the route serves:
  - a valid message is stored and served by restaurant and meal, with prices, an entry without a price as `null`, the hours and the collection time;
  - eight messages that do not match the schema are refused, with the problem named, and nothing from them is stored, the collection status included;
  - the same message twice is stored once;
  - a later collection replaces one restaurant's entries and hours for the day and leaves another restaurant's;
  - a failure message records its time and reason, keeps the success time, and the menus stored before are still served;
  - a failure message without a reason is refused;
  - an empty day answers `[]`, a request without an access token gets 401, and a date that is not a calendar day gets 400.
- The file starts a Redis container of its own, which takes about a second. Every test file's server subscribes to the same message patterns on the shared test Redis, and Nest's client takes the first answer. The server in `test/health.e2e-spec.ts` whose database is stopped could then answer "Internal server error" first. Two servers storing the same message could also undo a replacement. The database stays the shared one, and each test uses a day of its own.
- No route serves the collection status yet, so the tests read it with their own database connection, as `test/auth.e2e-spec.ts` reads Users.
- Checked that the tests can fail. Without the payload's pipe, the invalid cases failed. Without deleting a day's earlier entries, the repeat and the replacement failed.
- The whole suite passed: 14 files, 156 tests.

### Review (2026-10-01)

A Standards review and a Spec review ran side by side on the first commit. The second commit acts on them:

- the collection status got a UUID `id`;
- prices are limited to `int32`;
- a refused message is checked to leave the status alone;
- the README says how an emptied restaurant is sent, that a new menu source joins the schema's list, and in what order messages are stored;
- comments that repeated the code or the README were removed.

### Left as is (2026-10-01)

- A source's messages are stored in the order they arrive, not by `collectedAt`. An older message arriving after a newer one would replace it and move `lastSucceededAt` back. Both reviews raised it. With one worker, whose runs of a source do not overlap (ticket 07) and which waits for each answer, it does not happen, so no guard was added. The README states the order as a rule for the worker.
- A restaurant that disappears from a page altogether keeps its stored day, because replacement is per restaurant and day, as the ticket says.
- The failure tests are in `test/menus.e2e-spec.ts`, not in a `test/collection.e2e-spec.ts` of their own. The ticket frames them as menu tests ("the earlier menus are still served"), and a second file would start a second Redis.
- Kept after the review: the names `RestaurantDay` (the stored row) beside `RestaurantMenusDto` (its answer), `MealMenusDto`, the module name `collection`, and the explicit list of menu sources in `menusCollectedSchema`, which ticket 02's events source must not join.
- `CONTEXT.md` has no entries for menu, restaurant, meal or source. They can go to `/domain-modeling` if the team wants them in the glossary.

### Agent usage (2026-10-01)

- Agent time: about 30 minutes, an estimate. One session in the main checkout worked from the start without waiting for answers. It had worked about 24 minutes when this section was written, and the commit, the push and the pull request add about 4 more. Its Standards and Spec review subagents worked about 3 and 2 minutes, at the same time, added on top.
- Tokens, for the session and its two review subagents, counted when this section was written:
  - Input: 17,699,069 in total, of which 17,274,415 were cache reads, 424,428 cache writes and 226 uncached.
  - Output: 109,044. The subagents' transcripts record only a few output tokens for most of their steps, so their share, 1,274, is a lower bound.
