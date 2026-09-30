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

- `restaurant_days` holds one restaurant's day, with its source, unique by day, source and restaurant. It keeps the operating hours line and the time of the collection that stored it. `menu_entries` holds the day's entries with their meal, name and price. Each entry also has a `position` that keeps the page's order.
- For each day a message carries, it replaces everything its source had stored for that day (see Design review). In one transaction with the collection status, it deletes the source's entries and restaurant days for those days, inserts the message's restaurant days and inserts their entries: four statements, whatever the message's size.
  - The source's other days and the other sources' restaurants stay.
  - The README therefore tells collectors to send every restaurant the page lists for a day. One that is closed, or has an empty cell, goes with `entries: []` and is served with `meals: []`. That covers ticket 08's closure and empty cell.
  - The same restaurant name sent by two sources for one day is stored and served twice. Ticket 08 collects the dormitory restaurant once.
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

- `test/menus.e2e-spec.ts` has 15 tests and `test/collection.e2e-spec.ts` 2. Each sends messages over Redis with `startWithWorker()` and `sendAsWorker()` from `test/worker.ts`, and reads what the route serves:
  - a valid message is stored and served by restaurant and meal, with prices, an entry without a price as `null`, the hours and the collection time;
  - a restaurant sent without entries is served without meals;
  - eight messages that do not match the schema are refused, with the problem named, and nothing from them is stored, the collection status included;
  - the same message twice is stored once;
  - a later collection of a source's day replaces its restaurants: one it changed is replaced, one it dropped is gone, and another source's restaurant that day and the source's other day stay;
  - a failure message records its time and reason, keeps the success time, and the menus stored before are still served;
  - a failure message without a reason is refused and records nothing;
  - an empty day answers `[]`, a request without an access token gets 401, and a date that is not a calendar day gets 400.
- The menus fixtures are in `test/menus.ts`. `daysOf()` gives each file a month and each test a day, because the files share the database and a day's answer holds every restaurant stored for it.
- Each file starts a Redis container of its own, which takes about a second. Every test file's server subscribes to the same message patterns on the shared test Redis, and Nest's client takes the first answer. The server in `test/health.e2e-spec.ts` whose database is stopped could then answer "Internal server error" first. Two servers storing the same message could also undo a replacement. The database stays the shared one, and each test uses a day of its own.
- No route serves the collection status yet, so the tests read it with their own database connection, as `test/auth.e2e-spec.ts` reads Users.
- Checked that the tests can fail. Without the payload's pipe, the invalid cases failed. Without deleting a day's earlier entries, the repeat and the replacement failed. Deleting only the message's restaurants, or every source's, failed the replacement.
- The whole suite passed: 15 files, 157 tests.

### Review (2026-10-01)

A Standards review and a Spec review ran side by side on the first commit. The second commit acts on them:

- the collection status got a UUID `id`;
- prices are limited to `int32`;
- a refused message is checked to leave the status alone;
- the README says how an emptied restaurant is sent, that a new menu source joins the schema's list, and in what order messages are stored;
- comments that repeated the code or the README were removed.

### Design review (2026-10-01)

김태현 reviewed the design with the agent after the pull request was opened. The decisions:

- **Replacement by source and day.** The ticket says a later collection "replaces that restaurant's entries for that day". Replacing only the restaurants a message carries left a restaurant the page renamed or dropped on the days collected ahead, up to seven, so the app would show the old name beside the new one. The Co-op and dormitory pages list a whole day, so a message now replaces its source's whole day. The ticket's rule still holds within it.
- **The collection time stays per restaurant.** A single time for the answer would make a failed source's menus look fresh.
- **No guard on `collectedAt`.** Messages arrive in order while the worker sends one at a time and waits for each answer, and Redis messaging keeps nothing to deliver late. A guard comes with a worker that retries.
- **A closed restaurant is sent with `entries: []`** and served with `meals: []`, so it does not vanish from the app. Telling closed apart from not posted yet, with a `closed` field, waits for P15's screen.
- Kept as implemented: the validation in `@WorkerMessage`, the one-string refusal, `null` for a missing value, the `CollectionSource` enum, the worker's times in the status, a Redis for each test file, `z.strictObject`, a required `date`, and restaurants identified by name until P15 needs a `restaurants` table.
- When the worker collects is not set here. The spec says twice a day; nobody has checked when the three pages change or how far ahead they are posted. That is worth observing before ticket 07 fixes the hours.

### Left as is (2026-10-01)

- Kept after the review: the names `RestaurantDay` (the stored row) beside `RestaurantMenusDto` (its answer), `MealMenusDto`, the module name `collection`, and the explicit list of menu sources in `menusCollectedSchema`, which ticket 02's events source must not join.
- `CONTEXT.md` has no entries for menu, restaurant, meal or source. They can go to `/domain-modeling` if the team wants them in the glossary.

### Agent usage (2026-10-01)

- Agent time: about 45 minutes, an estimate, in one session in the main checkout. About 30 minutes waiting for 김태현's answers are left out.
  - Implementation, from the start to the pull request: about 28 minutes. Its Standards and Spec review subagents worked about 3 and 2 minutes, at the same time, added on top.
  - The walk-through of the pull request, the design review and the change to replacement by source and day: about 14 minutes up to this section, and the commit, the push and the pull request's update add a few more.
- Tokens, for the session and its two review subagents, counted when this section was written:
  - Input: 31,414,932 in total, of which 30,878,730 were cache reads, 535,896 cache writes and 306 uncached.
  - Output: 178,166. The subagents' transcripts record only a few output tokens for most of their steps, so their share, 1,274, is a lower bound.
