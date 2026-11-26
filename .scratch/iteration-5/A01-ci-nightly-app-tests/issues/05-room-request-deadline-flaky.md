# 05: room-request-deadline.integration.test.ts fails beside the other room-request files

Parent: [A01 spec](../spec.md)
Status: needs-triage
Blocked by: None

## What happens

`main-server/test/room-request-deadline.integration.test.ts` fails 2 tests when it runs in parallel with the other
room-request files, on two workers. It fails the same way on the base of PR 647 (e9b394fea), so the cause is not
PR 647. It passes alone.

## The cause, as far as ten minutes tell

- The file's own header says it: every room file shares one database, and any read applies the deadlines of every
  request by its own file's clock.
- This file keeps its clock before Wednesday 2026-11-04 20:00, the other files' deadline. It counts on every other
  room file reading at Wednesday 10:05.
- Three files now read room requests at a later clock:
  - `study-group-answers.integration.test.ts` (P10 ticket 07): a room request at a clock in 2087;
  - `room-request-answers.integration.test.ts` (P10 ticket 08): 2026-11-27;
  - `study-room-window.integration.test.ts`: 2026-11-27.
- When one of them reads while this file's requests stand, it applies their deadlines, and this file's asked
  companions go out early.
- Not checked: whether it is a port or the seed. Shared rows plus each file's own clock explain both failures.

## What to build (not now)

One of these, to choose:

- keep every room-request file's clock before the deadline file's;
- or scope the deadline sweep a read does to the reader's own requests;
- or give the room-request files their own database;
- or run them in one worker.

## Built (2026-11-27)

- The cause holds. Before each read of a room request, `expireDue(now)` and `passDeadlines(now)`
  (`src/library/room-request-sync.service.ts`) expire and time out every request in the database by the reading app's
  clock. The files shared one database, so a file whose clock stood later closed the other files' requests. Production
  keeps the sweeps as they are: it has one clock, and their pushes rely on running globally.
- Chosen: every file that makes or reads room requests gets a database of its own.
  - `test/global-setup.ts` copies the migrated and seeded main database into `main_template` (`keepTemplate` in
    `test/containers.ts`) before any test connects. No test connects to the template.
  - `ownDatabase(settings)` in `test/containers.ts` clones it with `CREATE DATABASE … TEMPLATE main_template` under a
    unique name, and gives the settings pointed at the clone and a `drop()` (`DROP DATABASE … WITH (FORCE)`).
  - `RoomStage` always starts on one, connects `stage.prisma` to it and drops it in `stop()`: every file that uses it
    makes room requests. `MealPlanStage.start({ ownDatabase: true })` and
    `StudyStage.start(settings, { ownDatabase: true })` opt in; `study-group-answers` and `study-room-window` do. The
    other files of those two stages are untouched.
  - The deadline file's header no longer counts on the other files' clocks, and `test/study-groups.ts` no longer picks
    its week for them. `main-server/README.md` § Checks names the mechanism.
- Not chosen: scoping the sweep to the reader's requests changes production code; keeping every file's clock before
  the deadline file's breaks with the next file; one worker hides the coupling.
- `room-request-answers.integration.test.ts` (PR 647) uses `RoomStage`, so it gets a database of its own with no change.
- Vitest 4 does not pass `--maxWorkers` on to the projects, which take the config's 8 (`resolveProjects` in Vitest's
  CLI keeps only some options). `VITEST_MAX_WORKERS=2` reaches them. So the "two workers" of the report above were up
  to eight.

## Proof (2026-11-27)

The eight files that make or read room requests on 5.0/Main (`room-request-companions`, `-deadline`, `-declines`,
`-privacy`, `-stays`, `room-requests`, `study-group-answers`, `study-room-window`), together on two workers:
`VITEST_MAX_WORKERS=2 pnpm exec vitest run --project integration --maxWorkers=2 --testTimeout=240000 <files>`.

On the base (e0260b404), three runs: one passed; two failed the deadline file, 1 and 2 tests ("counts a companion
still asked at Tuesday 20:00 as unanswered…", "stays asked at the next read when the booker asks them at Tuesday
21:00…").

With the fix, ten runs in a row:

| Run | Result                                        | Duration |
| --- | --------------------------------------------- | -------- |
| 1   | Test Files 8 passed (8), Tests 56 passed (56) | 52.81 s  |
| 2   | Test Files 8 passed (8), Tests 56 passed (56) | 56.05 s  |
| 3   | Test Files 8 passed (8), Tests 56 passed (56) | 39.74 s  |
| 4   | Test Files 8 passed (8), Tests 56 passed (56) | 34.76 s  |
| 5   | Test Files 8 passed (8), Tests 56 passed (56) | 22.80 s  |
| 6   | Test Files 8 passed (8), Tests 56 passed (56) | 24.63 s  |
| 7   | Test Files 8 passed (8), Tests 56 passed (56) | 25.09 s  |
| 8   | Test Files 8 passed (8), Tests 56 passed (56) | 22.73 s  |
| 9   | Test Files 8 passed (8), Tests 56 passed (56) | 24.06 s  |
| 10  | Test Files 8 passed (8), Tests 56 passed (56) | 27.75 s  |

One more run on up to eight workers (`--maxWorkers` alone) passed too: 8 files, 56 tests, 36.95 s.

The whole integration project once (`pnpm test:integration`, eight workers, the Mac's load average about 40): Test
Files 1 failed | 305 passed (306), Tests 2 failed | 3173 passed (3175), 690.99 s. The two were
`assistant-search-room`'s "finds the later Quest past those Full", which timed out at Vitest's 5 s, and the case after
it, which read that one's leftovers. The file makes no room requests, and alone it passed 16 of 16 right after.

Time added, on a loaded Mac:

- the template copy in the global setup: 0.13 s, once;
- a clone: 0.8 to 1.6 s with eight files cloning at once;
- a drop: 0.06 to 7.3 s, since `DROP DATABASE` waits for a checkpoint of the whole cluster;
- the eight files on two workers: 19.5 to 21.5 s on the base against 22.7 to 25.1 s at the same load, about 3 s more.

## Acceptance criteria

- [x] The room-request files pass together on two workers, three runs in a row (ten, above).
