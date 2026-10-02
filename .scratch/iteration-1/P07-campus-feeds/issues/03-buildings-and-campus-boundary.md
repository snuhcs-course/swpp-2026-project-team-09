# 03: Buildings and the Campus Boundary

Parent: [P07 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

The main server holds the campus buildings and places, loaded once as seed data from the university's campus map, and the Campus Boundary, one polygon from OpenStreetMap. A User's app lists the buildings with their numbers, names and coordinates and searches them by name or number, so that a User picks a place without typing coordinates (P06, P08). Ticket 02 matches the place of a collected event against the same list. The Campus Boundary is a file of the main server that P08 reads in server code to decide whether a position is on campus. Only what lies inside the Boundary is in the list.

This ticket also sets up what ticket 04 reuses: the way a seed file is exported, kept with its origin, and loaded into the database, and how the tests get the seed.

## Acceptance criteria

- [x] The Campus Boundary seed is OpenStreetMap relation 11917142 as one polygon, exported with one Overpass query that names the project in its User-Agent, as OpenStreetMap asks. It is a file of the main server, read into memory once when the server starts, and is not stored in the database. Another feature of the main server can read it as a polygon, so that P08 checks positions without a database query.
- [x] The building seed comes from the campus map's building list (`.scratch/research/external-sources.md` §6.2), fetched once: every entry inside the Campus Boundary, with its name, its coordinates and, where the map gives one, its building number. The entries without a number that are places, such as `종합운동장` and `자하연`, are kept; the map's `Test` entry is not. No coordinate is taken from Kakao, Naver or Google maps.
- [x] The two buildings the map does not list, 71-1동 and 901동, are in the seed with OpenStreetMap's name and coordinates, marked as coming from OpenStreetMap.
- [x] A name the map wraps, such as `관악 223동[우석경제관]`, is stored as `우석경제관`. Every other name is stored as its source writes it.
- [x] Each seed file is kept beside the address or query it came from and the date of the export, so that the export can be repeated.
- [x] Each entry keeps the identifier its source gives it: the campus map's own for its entries, OpenStreetMap's for the two added buildings. The entry's own identifier in the database never changes once it is loaded.
- [x] One command loads the seed into any database and is repeatable: running it twice leaves one set of records, and a corrected seed file updates the entries it names in place, so that a timetable entry or a Meetup that points at a building still does. The one command that starts the system loads the seed, and the tests have it.
- [x] Buildings are stored in ordinary columns, with a latitude and a longitude. No spatial type and no spatial SQL is used.
- [x] A User's route lists the buildings with name, number and coordinates, and a search route finds buildings by a part of the name or by the number. Both need a User's access token.
- [x] Tests against the real database: the seed loads, and loads again without duplicates; an entry whose name is corrected in the seed keeps its identifier; an entry outside the Campus Boundary is not loaded; the list and the search answer, and a request without a User's access token is refused. A test reads the Campus Boundary and finds a point inside it and one outside.
- [x] The main server's README records how a seed is exported and loaded, where each seed comes from, and that the app shows OpenStreetMap's attribution (P15).

## Comments

### What this ticket sets for tickets 02 and 04 (2026-10-02)

The main server's README holds the full text: Buildings, Campus Boundary and Seed data.

- **Seed files**: `main-server/seed/`, one file per origin. Each keeps the address or Overpass query it came from (`exportedFrom`, `query`) and the day of the export (`exportedOn`, in Asia/Seoul); the GeoJSON file keeps them in `properties`. A file holds the answer as near as its format allows: the campus map's rows are kept as served, decoded from EUC-KR. What is loaded is decided by the loader, where the seed's tests reach it.
- **Exporting**: `pnpm seed:export <name>…` (`scripts/export-seed.ts`) sends one request per file with the worker's User-Agent and writes the file formatted by Prettier, so that `format:check` also checks a hand correction. A seed that a request gives adds an entry to `EXPORTS`. A seed a person makes, such as ticket 04's route line, is written by hand with the same fields.
- **Loading**: `pnpm db:seed` builds the server and runs `src/seed.ts`, which calls `loadSeed(prisma, directory)` in `src/load-seed.ts`, which loads every seed; ticket 04 adds its loading there. `readSeedFile()` beside `SEED_DIRECTORY` reads a seed file and checks it against its schema. The image, built already, runs `pnpm db:migrate && node dist/seed` before the server starts.
- **Identity**: an entry is upserted by its origin and the identifier its origin gives it (`@@unique([origin, originId])`), all in one transaction, and keeps its own UUID. Nothing is deleted. Ticket 04's stops can keep their identifiers the same way.
- **Tests**: the global setup loads the seed into the shared test database (`seed()` in `test/containers.ts`), so ticket 02's tests match places against the real list. A test that changes a seed loads it into a database of its own, created in the shared PostgreSQL and migrated, as `test/seed.e2e-spec.ts` does with `connect()` and `migrate()` from `test/containers.ts`.
- **For ticket 02**: the list is the `buildings` table, model `Building`: `number` as text (`302`, `25-1`, `71-1`) or `null` for the 8 places, `name` unwrapped, `latitude` and `longitude`. Inside the Boundary the numbers are unique and three names are shared: `(관악사)대학원 생활관` by 900, 902 to 906 and 918, `(관악사)학부 생활관` by 919 and 921 to 926, and `행정대학원` by 57 and 57-1. A place that names one of them matches several entries, which makes a Draft by the spec. `BuildingsModule` does not export `BuildingsService` yet: export it, as the README's step 6 says, or read `prisma.building`.
- **For P08**: inject `CampusBoundary` (global, `src/common/campus-boundary.module.ts`); `contains({ latitude, longitude })` checks a position in memory.

### Decisions made while implementing (2026-10-02)

- **The seed keeps all 250 of the campus map's rows, and the loader decides what is loaded**: what lies inside the Boundary, without `Test`, with the wrapped names unwrapped. Widening the Boundary therefore needs no new export, and each rule is reached by the seed command's tests.
- **The Boundary is a GeoJSON Feature with one Polygon ring**, joined from the relation's four outer ways at export. GitHub and geojson.io draw it, so that a person can look at it. The export refuses a relation with an inner ring, or ways that do not join into one ring.
- **The two OpenStreetMap buildings carry numbers**, `71-1` and `901`, read off their names into a table in the export script: the ticket calls them 71-1동 and 901동, and ticket 02 matches a place by number. Their names stay as OpenStreetMap writes them, so 901동 is named `901`. Their coordinates are the centre of the outline's bounding box, which Overpass's `out center` gives.
- **They are found by name within the campus extent**, in one query; the export refuses an answer without exactly one element of each name.
- **Identifiers**: `origin` is `campus_map` or `openstreetmap`, and `originId` the map's `inst_seq` as text or OpenStreetMap's `way/456356713`. They are no Source, which is what the worker collects (see Review).
- **Loading deletes nothing.** An entry that leaves the files, or that a correction moves outside the Boundary, stays as it was, so that whatever points at it still does. Removing one is a person's decision.
- **`Test` is left out by its name.** It is the map's own test row, and it lies inside the Boundary.
- **A wrapped name is one of the form `관악 <number>동[<name>]`**, the form of all eight. Five of them lie inside the Boundary.
- **The list is ordered by number as a reader counts** (`25`, `25-1`, `26`), with `Intl.Collator('ko', { numeric: true })`, then the places by name. The database's collation would put `100` before `2`.
- **The search runs over the list in memory**: 225 rows, and no `LIKE` wildcard in `q` to escape. A name matches when it holds `q`, whatever the case of its Latin letters (`lg` finds `LG연구동`), and a number when it is `q`, with or without `동`, since a User writes 302동. A part of a number matches only through a name. `q` without text gets 400.
- **The Boundary is checked by counting crossings**, with latitude and longitude as plane coordinates across a campus of about 2.5 km. `outline` exposes the polygon itself, as the ticket asks.
- **`pnpm db:seed` builds, then runs the built code.** The generated Prisma Client imports its files as `.js`, so Node cannot run `src/seed.ts` from source. The image runs the built command itself, and the tests call `loadSeed()` in-process.
- **The seed files are formatted by Prettier, not ignored like saved pages**, so that `format:check` catches a broken hand correction.
- **The files made from OpenStreetMap carry Overpass's ODbL notice** (`copyright`), since the repository holds a database derived from OpenStreetMap.
- **The README points at `.scratch/research/external-sources.md` §6.1 for where OpenStreetMap's guidelines ask for the attribution.** §6.1 notes that an information screen alone, where the spec puts it for P15, does not meet them.
- `seed data`, `origin`, `building` and `place` are not in `GLOSSARY.md`; they can go to `/domain-modeling`.

### Tests (2026-10-02)

- Seed command, on a database of its own: `test/seed.e2e-spec.ts` (4). The seed loads 225 entries, among them a numbered building, a wrapped name, a place and the two from OpenStreetMap, and not `Test`; 서울대입구역, 교수아파트1 and 관악 915동, outside the Boundary, are not loaded; loading again leaves the same records with the same identifiers; a name corrected in a copy of the seed is updated in place and keeps its identifier.
- Routes, on the shared database that the global setup seeded: `test/buildings.e2e-spec.ts` (8). The list's fields and order and the places last; the search by a part of the name, by number with and without `동`, and whatever the case of Latin letters; each route refused without an access token; a search without text.
- Campus Boundary: `test/campus-boundary.e2e-spec.ts` (1). The started server's `CampusBoundary` holds 중앙도서관 and not 교수아파트1, which lies inside the outline's bounding box, so that a box would not pass.
- Written first and seen to fail: the first seed test (no loader yet) and the five search tests (404). The list and Boundary tests were written before the routes and the provider but first run with them, and the three later seed tests were already true after the first slice. So each behaviour was broken once by hand and its test was seen to fail: no Boundary filter, `Test` kept, names not unwrapped, entries replaced instead of updated, a correction not applied, the list unsorted, numbers compared as text, places first, `동` not read, the case of Latin letters kept, the search open to anyone, and the Boundary as its bounding box. One break survived at first, lowercasing the query alone, because `lg` is lower case already; the test asks for `Lg` now.
- The main server on this branch: 23 files and 244 tests pass, and lint, format:check and typecheck pass. `prisma migrate diff` from the migrated database to the schema is empty. The ticket's one migration, `20261002065948_add_buildings`, was made in a temporary container, `p07-03-buildings-postgres`, since removed with its volume.

### The exports (2026-10-02)

Each address was asked with the project's User-Agent and its answer saved. The committed `scripts/export-seed.ts` then wrote the seed files from the saved answers, with `fetch` replaced, so that the files come from the script's own code without asking an address again.

- Overpass, the Boundary's query: 504 at 15:55:10 and at 15:56:57 KST, both `The server is probably too busy to handle your request`, with no data. The third request, at 16:06:29, answered 200 with the data as of 2026-10-02T07:05:18Z. The query was therefore sent three times.
  - The relation's four outer ways, 173556800, 875251693, 1481312602 and 1481312601, of 182, 71, 2 and 2 points, join into one closed ring of 254 points, 253 of them distinct. external-sources.md §6.1 counted 256.
- The campus map: 200 at 15:55:41, 250 rows in EUC-KR, as §6.2 describes them: 237 numbered, 215 of them inside the Boundary, and the 22 outside are those §6.2 lists; 13 without a number, of which 8 places and `Test` lie inside; 8 wrapped names.
- Overpass, the two buildings: 200 at 16:07:03, 34 seconds after the Boundary's answer: way 456356713, `체육문화교육연구동(71-1동)`, `building=yes`, and way 482220682, `901`, `building=dormitory`. Both lie inside the Boundary.

### The first start with the seed (2026-10-02)

One run, at 16:20 KST, of `docker compose -p p07-03-seed-check up --build -d postgres redis main-server` from this branch merged with `1.0/P07-02-05-integration` as it then was, with a local `.env` (keys of its own, and a placeholder for the key that ticket 05 requires), under a project name of its own so that the developer database `snu-now_postgres-data` was not touched. Only the stores and the main server were started, and the image loaded the seed with `pnpm db:seed`, which the review has since replaced by `node dist/seed`.

- The server applied the three migrations, logged `Loaded 225 buildings` and started. Readiness answered 200, `GET /buildings` and `GET /buildings/search?q=302` without a token 401, and the table held 225 rows: 2 from OpenStreetMap and 8 without a number.
- A restart of the main server loaded the seed again: no pending migration, `Loaded 225 buildings`, and the same 225 rows with the same identifiers and names.
- The routes' answers with a User's token were not looked at, because signing in needs a Google ID token; the tests cover them.
- `docker compose -p p07-03-seed-check down -v --rmi local` removed the run's containers, volume and images, and the local `.env` was deleted.

### Review (2026-10-02)

A Standards review and a Spec review ran side by side on `0d4ea14b`, this ticket's commits alone on `1.0/Main`. The commit that adds this section acts on them.

- Spec: every criterion is implemented, and nothing blocks. Acted on:
  - `pnpm db:seed` ran the built code, so a fresh checkout needed `pnpm build` first. It builds first now, so one command loads the seed into any database. The image, built already, runs the same code with `node dist/seed`, so that a start does not build again. Checked once from a checkout without `dist/`, on a database of its own: it built, loaded 225 buildings, and left the same 225 when run again. The Compose start was not run again.
  - The Tests section gave the 24 files and 265 tests of the tree merged with the integration branch. It gives this branch's 23 files and 244 tests now, and the first start says which tree it ran.
- Spec, left as they are:
  - The extras it lists, the order, `동`, the case of Latin letters, the 400 and the OpenStreetMap numbers: each is a decision recorded above, and no criterion rules it out.
  - The seed file keeps all 250 rows, `Test` and the 26 rows outside included. The loader applies the criterion, so the database holds what it asks, and widening the Boundary needs no new request to the map.
  - Loading deletes nothing, so an entry that a correction or a narrower Boundary puts outside stays with its old values. Deleting would break what points at a building, and the spec only ever widens the Boundary. Ticket 04 deletes stops, at which nothing lasting points.
  - Its note that the tests count 225 buildings in the shared database is now in the README: a test that needs other buildings loads a database of its own.
- Standards: no hard violation in the code. Acted on:
  - **`source` became `origin`.** `GLOSSARY.md`'s Source is a page or feed that the worker collects, and seed data is not collected, yet `Building.source` sat beside `RestaurantDay.source`, which holds a Source. The renames: the enum `BuildingSource` → `BuildingOrigin` (`building_source` → `building_origin`), `Building.source` → `origin`, `Building.sourceId` → `originId` (`source_id` → `origin_id`), and the key `source_sourceId` → `origin_originId` (`buildings_source_source_id_key` → `buildings_origin_origin_id_key`). The one migration was edited in place, and `prisma migrate diff` from a database that ran it to the schema is empty. The README and the sections above say origin, and the word joins the terms for `/domain-modeling`.
  - Schemas are named `…Schema`, as everywhere else: `campusMapFile`, `openStreetMapFile` and `boundaryFile` became `campusMapFileSchema`, `openStreetMapFileSchema` and `boundaryFileSchema`, and the export script's `point`, `copyright`, `boundaryAnswer` and `buildingsAnswer` gained `Schema` too. The collator `order` is `koreanOrder`, as in menus.
  - A seed file is read in one place, `readSeedFile()` beside `SEED_DIRECTORY`: the helper ticket 04 had written, with the same signature. `readCampusBoundary()` uses it and returns a Promise now, which the provider's factory and `loadSeed()` await. The test's `correctRow()` reads with it.
  - Comments: `loadSeed()`'s says why it takes a directory instead of naming its callers, and the search's says why it filters in memory. The comments that restated `byNumber()`, the search and the glossary's Campus Boundary are gone.
  - `src/seed.ts` has PrismaService's 5-second connection timeout. Without it the command waited 75 seconds for a database that did not answer, with it about 6.
  - In the seed test, `main` is `sharedDatabase`, `database` is `databaseName` and `corrected` is `correctedSeed`. The corrected seed's test compares the count with the one before the correction instead of 225, and the README's Buildings no longer gives the count: a re-export now changes 225 in two tests and in the README's Seed data.
- Standards, left as they are:
  - `src/seed.ts` reads `DATABASE_URL` itself and starts no Nest application, as `pnpm db:migrate` reads it through `prisma7.config.ts`. A Nest application would check every setting of the server, such as the Google client IDs, before it could load data. The README's steps 5 and 7 are for feature modules.
  - `seed()` in `test/containers.ts` repeats the command's connect, load and disconnect, four lines. The command's module runs on import, and sharing the lines would put a connection in `load-seed.ts`, which the tests call with clients of their own.
  - The collator stays in the feature: menus' has no `numeric`, and changing the order of the menus is not this ticket's.
  - The export script spells out each file's origin fields at its one `write()`. The files differ in shape, with `properties` in the GeoJSON and `copyright` for OpenStreetMap alone, and each shape reads in one place.
  - The global `CampusBoundary` provider has no consumer yet: P08 is the one the criterion names.
  - (a)1, the agent usage, is the orchestrating session's.
- After the changes: 23 files and 244 tests pass, and lint, format:check and typecheck pass.

### Agent usage (2026-10-02)

Tickets 02 to 05 were built in one orchestrated run: one session placed the agents and kept the branches and the PRs, and each ticket had an implementing agent in a worktree of its own.

- Agent time: about 81 minutes, an estimate. Nobody was waited for.
  - The implementing agent worked about 58 minutes: 44 from reading the ticket to its report, and 14 acting on the review.
  - A merging agent worked about 3 minutes. The run first merged its tickets into one branch, before the user asked for a PR for each: it ran the four checks on this ticket merged with the others and looked for the one migration and for leftover containers.
  - The Standards reviewer worked about 11 minutes and the Spec reviewer about 9, at the same time.
- Tokens, for the four agents, counted from their transcripts when this section was written:
  - Input: 70,717,335 in total, of which 69,217,540 were cache reads, 1,499,295 cache writes and 500 uncached.
  - Output: 64,353. The transcripts record only part of the output of most steps, so this is a lower bound.
- The orchestrating session's share is recorded once for the run, under ticket 04.
