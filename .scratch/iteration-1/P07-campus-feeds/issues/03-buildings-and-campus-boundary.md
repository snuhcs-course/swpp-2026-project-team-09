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

- **Seed files**: `main-server/seed/`, one file per origin. Each keeps the address or Overpass query it came from (`exportedFrom`, `query`) and the day of the export (`exportedOn`, in Asia/Seoul); the GeoJSON file keeps them in `properties`. A file holds what its source answered, as near as its format allows: the campus map's rows are kept as served, decoded from EUC-KR. What is loaded is decided by the loader, where the seed's tests reach it.
- **Exporting**: `pnpm seed:export <name>…` (`scripts/export-seed.ts`) sends one request per file with the worker's User-Agent and writes the file formatted by Prettier, so that `format:check` also checks a hand correction. A seed that a request gives adds an entry to `EXPORTS`. A seed a person makes, such as ticket 04's route line, is written by hand with the same fields.
- **Loading**: `pnpm db:seed` (`src/seed.ts`, run from `dist/` like the worker's `pnpm collect`) calls `loadSeed(prisma, directory)` in `src/load-seed.ts`, which loads every seed; ticket 04 adds its loading there. Compose runs `pnpm db:migrate && pnpm db:seed` before the server starts.
- **Identity**: an entry is upserted by its source and the source's identifier (`@@unique([source, sourceId])`), all in one transaction, and keeps its own UUID. Nothing is deleted. Ticket 04's stops can keep their identifiers the same way.
- **Tests**: the global setup loads the seed into the shared test database (`seed()` in `test/containers.ts`), so ticket 02's tests match places against the real list. A test that changes a seed loads it into a database of its own, created in the shared PostgreSQL and migrated, as `test/seed.e2e-spec.ts` does with `connect()` and `migrate()` from `test/containers.ts`.
- **For ticket 02**: the list is the `buildings` table, model `Building`: `number` as text (`302`, `25-1`, `71-1`) or `null` for the 8 places, `name` unwrapped, `latitude` and `longitude`. Inside the Boundary the numbers are unique and three names are shared: `(관악사)대학원 생활관` by 900, 902 to 906 and 918, `(관악사)학부 생활관` by 919 and 921 to 926, and `행정대학원` by 57 and 57-1. A place that names one of them matches several entries, which makes a Draft by the spec. `BuildingsModule` does not export `BuildingsService` yet: export it, as the README's step 6 says, or read `prisma.building`.
- **For P08**: inject `CampusBoundary` (global, `src/common/campus-boundary.module.ts`); `contains({ latitude, longitude })` checks a position in memory.

### Decisions made while implementing (2026-10-02)

- **The seed keeps all 250 of the campus map's rows, and the loader decides what is loaded**: what lies inside the Boundary, without `Test`, with the wrapped names unwrapped. Widening the Boundary therefore needs no new export, and each rule is reached by the seed command's tests.
- **The Boundary is a GeoJSON Feature with one Polygon ring**, joined from the relation's four outer ways at export. GitHub and geojson.io draw it, so that a person can look at it. The export refuses a relation with an inner ring, or ways that do not join into one ring.
- **The two OpenStreetMap buildings carry numbers**, `71-1` and `901`, read off their names into a table in the export script: the ticket calls them 71-1동 and 901동, and ticket 02 matches a place by number. Their names stay as OpenStreetMap writes them, so 901동 is named `901`. Their coordinates are the centre of the outline's bounding box, which Overpass's `out center` gives.
- **They are found by name within the campus extent**, in one query; the export refuses an answer without exactly one element of each name.
- **Identifiers**: `source` is `campus_map` or `openstreetmap`, and `sourceId` the map's `inst_seq` as text or OpenStreetMap's `way/456356713`.
- **Loading deletes nothing.** An entry that leaves the files, or that a correction moves outside the Boundary, stays as it was, so that whatever points at it still does. Removing one is a person's decision.
- **`Test` is left out by its name.** It is the map's own test row, and it lies inside the Boundary.
- **A wrapped name is one of the form `관악 <number>동[<name>]`**, the form of all eight. Five of them lie inside the Boundary.
- **The list is ordered by number as a reader counts** (`25`, `25-1`, `26`), with `Intl.Collator('ko', { numeric: true })`, then the places by name. The database's collation would put `100` before `2`.
- **The search runs over the list in memory**: 225 rows, and no `LIKE` wildcard in `q` to escape. A name matches when it holds `q`, whatever the case of its Latin letters (`lg` finds `LG연구동`), and a number when it is `q`, with or without `동`, since a User writes 302동. A part of a number matches only through a name. `q` without text gets 400.
- **The Boundary is checked by counting crossings**, with latitude and longitude as plane coordinates across a campus of about 2.5 km. `outline` exposes the polygon itself, as the ticket asks.
- **`pnpm db:seed` runs the built code.** The generated Prisma Client imports its files as `.js`, so Node cannot run `src/seed.ts` from source. The tests call `loadSeed()` in-process instead.
- **The seed files are formatted by Prettier, not ignored like saved pages**, so that `format:check` catches a broken hand correction.
- **The files made from OpenStreetMap carry Overpass's ODbL notice** (`copyright`), since the repository holds a database derived from OpenStreetMap.
- **The README points at `.scratch/research/external-sources.md` §6.1 for where OpenStreetMap's guidelines ask for the attribution.** §6.1 notes that an information screen alone, where the spec puts it for P15, does not meet them.
- `seed data`, `building` and `place` are not in `GLOSSARY.md`; they can go to `/domain-modeling`.

### Tests (2026-10-02)

- Seed command, on a database of its own: `test/seed.e2e-spec.ts` (4). The seed loads 225 entries, among them a numbered building, a wrapped name, a place and the two from OpenStreetMap, and not `Test`; 서울대입구역, 교수아파트1 and 관악 915동, outside the Boundary, are not loaded; loading again leaves the same records with the same identifiers; a name corrected in a copy of the seed is updated in place and keeps its identifier.
- Routes, on the shared database that the global setup seeded: `test/buildings.e2e-spec.ts` (8). The list's fields and order and the places last; the search by a part of the name, by number with and without `동`, and whatever the case of Latin letters; each route refused without an access token; a search without text.
- Campus Boundary: `test/campus-boundary.e2e-spec.ts` (1). The started server's `CampusBoundary` holds 중앙도서관 and not 교수아파트1, which lies inside the outline's bounding box, so that a box would not pass.
- Written first and seen to fail: the first seed test (no loader yet) and the five search tests (404). The list and Boundary tests were written before the routes and the provider but first run with them, and the three later seed tests were already true after the first slice. So each behaviour was broken once by hand and its test was seen to fail: no Boundary filter, `Test` kept, names not unwrapped, entries replaced instead of updated, a correction not applied, the list unsorted, numbers compared as text, places first, `동` not read, the case of Latin letters kept, the search open to anyone, and the Boundary as its bounding box. One break survived at first, lowercasing the query alone, because `lg` is lower case already; the test asks for `Lg` now.
- The main server, after merging `1.0/P07-02-05-integration`: 24 files and 265 tests pass, and lint, format:check and typecheck pass. `prisma migrate diff` from the migrated database to the schema is empty. The ticket's one migration, `20261002065948_add_buildings`, was made in a temporary container, `p07-03-buildings-postgres`, since removed with its volume.

### The exports (2026-10-02)

Each address was asked with the project's User-Agent and its answer saved. The committed `scripts/export-seed.ts` then wrote the seed files from the saved answers, with `fetch` replaced, so that the files come from the script's own code without asking an address again.

- Overpass, the Boundary's query: 504 at 15:55:10 and at 15:56:57 KST, both `The server is probably too busy to handle your request`, with no data. The third request, at 16:06:29, answered 200 with the data as of 2026-10-02T07:05:18Z. The query was therefore sent three times.
  - The relation's four outer ways, 173556800, 875251693, 1481312602 and 1481312601, of 182, 71, 2 and 2 points, join into one closed ring of 254 points, 253 of them distinct. external-sources.md §6.1 counted 256.
- The campus map: 200 at 15:55:41, 250 rows in EUC-KR, as §6.2 describes them: 237 numbered, 215 of them inside the Boundary, and the 22 outside are those §6.2 lists; 13 without a number, of which 8 places and `Test` lie inside; 8 wrapped names.
- Overpass, the two buildings: 200 at 16:07:03, 34 seconds after the Boundary's answer: way 456356713, `체육문화교육연구동(71-1동)`, `building=yes`, and way 482220682, `901`, `building=dormitory`. Both lie inside the Boundary.

### The first start with the seed (2026-10-02)

One run, at 16:20 KST, of `docker compose -p p07-03-seed-check up --build -d postgres redis main-server` from this branch, with a local `.env` (keys of its own and a placeholder for the Kakao key), under a project name of its own so that the developer database `snu-now_postgres-data` was not touched. Only the stores and the main server were started.

- The server applied the three migrations, logged `Loaded 225 buildings` and started. Readiness answered 200, `GET /buildings` and `GET /buildings/search?q=302` without a token 401, and the table held 225 rows: 2 from OpenStreetMap and 8 without a number.
- A restart of the main server loaded the seed again: no pending migration, `Loaded 225 buildings`, and the same 225 rows with the same identifiers and names.
- The routes' answers with a User's token were not looked at, because signing in needs a Google ID token; the tests cover them.
- `docker compose -p p07-03-seed-check down -v --rmi local` removed the run's containers, volume and images, and the local `.env` was deleted.

### Agent usage (2026-10-02)

Tickets 02 to 05 were built in one orchestrated run: one session placed the agents and managed the merges, and each ticket had an implementing agent in a worktree of its own and a merging agent.

- Agent time: about 47 minutes, an estimate. Nobody was waited for.
  - The implementing agent worked about 44 minutes, from reading the ticket to its report.
  - The merging agent worked about 3 minutes: the merge into the integration branch, the four checks on the merged branch, and a look for the one migration and for leftover containers.
- Tokens, for the two agents, counted from their transcripts after the merge:
  - Input: 42,082,127 in total, of which 41,468,940 were cache reads, 612,867 cache writes and 320 uncached.
  - Output: 39,987. The transcripts record only part of the output of most steps, so this is a lower bound.
- The orchestrating session's share is recorded once, under the ticket of this run that was merged last.
