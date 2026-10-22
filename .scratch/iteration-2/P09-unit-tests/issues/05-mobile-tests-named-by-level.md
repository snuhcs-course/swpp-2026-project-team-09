# 05: mobile: tests named by level, run and measured apart

Parent: [P09 spec](../spec.md)
Status: resolved
Blocked by: P09-01 (The shared pieces of the test levels)
Touches: mobile only (the names of its `__tests__/` files, `package.json` with its Jest config and scripts, `.gitignore`, `README.md`), plus mobile's row of the root README's test table. P20's open pull requests #118 to #122 change mobile tests too.

## What to build

This is the P09 spec's foundation change for mobile. Each `__tests__/**/*-test.ts(x)` is renamed in place with `git mv` to `.unit.test.ts(x)` or `.integration.test.ts(x)`, following ADR 0007's rule. A test is a unit test when it calls one module and that module's collaborators are stand-ins or in-process libraries that behave the same on every run, such as the React renderer or a QueryClient without retries. A screen component is a unit only when every hook and data source it uses is a stand-in. A test that runs the app's router over the fake server, such as the whole-app renders, is an integration test. Support files (`__tests__/support/`, `__tests__/fixtures/`) keep their names.

Jest gets the projects `unit` and `integration`, and each selects its files by suffix. The scripts follow the spec's "Projects and scripts" table, with `--selectProjects`. CI's four shards still run `pnpm test --shard`, and no workflow changes. Coverage follows the Jest part of the spec's "Coverage configuration": `coverageProvider: 'babel'` (Istanbul), `collectCoverageFrom` `src/**/*.{ts,tsx}` without `*.d.ts`, the same four reporters and no thresholds. `mobile/.gitignore` gains `/coverage`. `pnpm lint` calls P09-01's level check on mobile's files.

P20's pull requests #118 to #122 change mobile tests (the spec's "Open pull requests"). Each one merges before this ticket lands, or rebases after it and renames its new test files. The level check fails any file still under an old name.

## Acceptance criteria

- [x] Every test file under `mobile/__tests__/` ends in `.unit.test.ts(x)` or `.integration.test.ts(x)` under ADR 0007, and none ends in `-test.ts(x)`. Each was renamed with `git mv`, no import changed, and `git log --follow` shows a renamed file's history.
- [x] `pnpm test` passes the same number of tests before and after the rename, and `pnpm test:unit` and `pnpm test:integration` together run exactly the tests that `pnpm test` runs. The counts are recorded in `## Comments`.
- [x] Jest has the projects `unit` and `integration`, and `test`, `test:unit`, `test:integration`, `test:cov:unit` and `test:cov` each run what the spec's table says.
- [x] `pnpm test --shard=1/4` to `--shard=4/4` together run every test that `pnpm test` runs, as CI's four shards do. No CI workflow file changes.
- [x] The coverage settings are the spec's, with no thresholds. A file under `src/` that no test loads shows 0%, and `mobile/.gitignore` has `/coverage`, so git ignores the reports that `pnpm test:cov` writes.
- [x] `pnpm lint` runs the level check. It passes on the renamed tree and fails on a test file planted under an old name, naming that file, and both runs are recorded in `## Comments`. `pnpm format:check` and `pnpm typecheck` pass.
- [x] When this ticket lands, every mobile test file on the branch has a level suffix, including any that P20's merged pull requests added.
- [x] `mobile/README.md` names no test file by an old name. mobile's row of the root README's test table says that `pnpm test:unit` needs no Docker.
- [x] A file that is only renamed gets no new box row, and every other changed source file gets one (`CLAUDE.md`).
- [x] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.

## Comments

### Decisions (2026-10-22)

- **The rule as applied.** A file is a unit test when every test in it calls one module of ours (a function, hook or component) and every other module of ours that runs is pure or a stand-in: `jest.mock` and `jest.spyOn` doubles, jest-expo's native mocks, AsyncStorage's Jest mock, a native handle that only records. It is an integration test when it starts the app's router (`startApp`, `openMain` and the support helpers built on them), renders a route file (`src/app/catalogue`, `src/app/map-check`) or `AppProviders`, or its subject runs one of our stateful modules for real: the API client with its in-app mock or its HTTP adapter over the fake server, the token store, the kept storage, the Session. So these are integration tests too: the hooks over the in-app mock (`features/screen-data`, `screen-data-failure`, `main-controls-data`, `walking-route`) and the timetable versions over it (`timetable-versions*`), the in-app mock's own tests (`api/client`, `api/mock-me`, `api/sign-in`, `auth/google-sign-in`, which read and keep the kept storage), the API client over the fake main server (`api/server-*`, `api/quest-parts`, `api/room-parts`, `auth/server-sign-in`), and `storage/kept-ids` (through `hidden-posts` and `seekers`). A file whose pure tests sit beside one stateful test (`background-sharing`, `onboarding-rules`) takes the wider level. This follows the spec's (f), which asks for `http.ts`'s unit test with the token store and Session events as stand-ins.
- **The 48 unit files:** `design-system/*` (23); `api/errors`, `auth/id-token`, `auth/google` (Google's library mocked); `features/next-quest`, `quest-rows`, `party-finding`, `short-name`, `marker-looks`, `timetable-week`, `timetable-import-plan`; the six `timetable-ocr-*` (the pure reading pipeline on saved ML Kit outputs) and `native-ocr` (`expo` mocked); the map component's `map`, `map-camera`, `map-glide`, `map-native`, `map-native-view`, `marker-images`; the main screen's hooks `main-map-moves` and `main-selection`. The other 99 are integration tests. Unit-only statements come to 29.6 %, the spec's survey's "about 30%".
- **Jest config.** Inline `projects` in `package.json`, each with `preset`, the AsyncStorage `moduleNameMapper` and a `testMatch` by suffix. `testTimeout`, `coverageProvider`, `collectCoverageFrom` and `coverageReporters` stay at the top level: Jest 29 reads them as global options. The `testPathIgnorePatterns` entry for `__tests__/support/` went, since the suffixes select no support file.
- **Two changes outside the Touches.** (1) Four integration tests' comments named other test files by their old names (`live`, `party-invites`, `party-mine`, `timetable-server`); they now name the new ones. (2) `timetable-ocr-screenshots.unit.test.ts` checks that a reading's median of 5 is under 500 ms. Under the first `pnpm test:cov:unit` the instrumented pipeline took 564 to 886 ms on a loaded machine, so 3 tests failed on a speed the app never runs at. The check is now skipped when `__coverage__` is defined and runs as before otherwise: 4 tests show as skipped under coverage. These five files got a box row; the other 142 are renamed only.
- **READMEs.** mobile's: the `pnpm lint` row, a paragraph on the two levels and the scripts, and `map-native-view.unit.test.tsx`. Root: mobile's row says "neither it nor `pnpm test:unit` needs Docker", in worker-server's words from P09-03. mobile needs no Docker at all, so the spec's run with Docker stopped does not apply here.
- **P20's pull requests** #118 to #122 have not merged into this branch's base, so no file of theirs is here. Their new test files get renamed when the orchestrator merges `2.0/Main`; the level check fails any left under an old name.

### Evidence (2026-10-22)

Counts, from Jest's `--json` output:

| Run (in `mobile/`) | Files | Tests |
|---|---|---|
| `pnpm test` before the rename (`4ac779a7`) | 147 | 1,307: 1,306 passed, 1 todo |
| `pnpm test:unit` | 48 | 282: 281 passed, 1 todo |
| `pnpm test:integration` | 99 | 1,025 passed |
| `pnpm test --shard=1/4` to `--shard=4/4` | 37 + 37 + 37 + 36 = 147 | 386 + 292 + 359 + 270 = 1,307: 1,306 passed, 1 todo |
| `pnpm test:cov:unit` (after the timing change) | 48 | 282: 277 passed, 4 skipped, 1 todo |
| `pnpm test:cov` (after the timing change) | 147 | 1,307: 1,302 passed, 4 skipped, 1 todo |

Compared by file (old names mapped to new) and full test name, the unit and integration runs together ran exactly the tests run before the rename, none in both; so did the four shards, none in two, each with its earlier result. `--listTests`: `test` and `test:cov` select the same 147 files, `test:unit` and `test:cov:unit` the same 48 `.unit.test` files, `test:integration` the 99 `.integration.test` files, and none selects a support or fixture file; the four shards' lists partition `test`'s. `.github/` is unchanged.

Renames: `git diff -M --name-status 4ac779a7 HEAD -- mobile` shows 142 `R100` and the five edited files at `R095` to `R098`. `git log --follow -- mobile/__tests__/map-native-view.unit.test.tsx` lists 6 commits, back to `04daf34f` (P06-09). No import changed: the files moved within their folders.

Coverage (Istanbul, `src/**/*.{ts,tsx}` without `*.d.ts`, reporters `text-summary`, `json-summary`, `html`, `lcov`, no thresholds):

| Run | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| `pnpm test:cov:unit` | 29.58 % | 23.27 % | 17.57 % | 29.80 % |
| `pnpm test:cov` | 93.84 % | 86.17 % | 93.89 % | 94.06 % |

The report counts 383 files of `src/`. Under `pnpm test:cov`, 7 that no test loads show 0 %, among them `src/polyfills.ts` (0/19) and `src/position/background-task.ts` (0/8); under `pnpm test:cov:unit`, `src/features/events/adapter.ts` shows 0 % (0/48). After `pnpm test:cov`, `git status` is clean and `git check-ignore -v coverage/index.html` prints `mobile/.gitignore:7:/coverage`.

`pnpm lint` on the renamed tree:

```
$ oxlint --type-aware && node ../scripts/check-test-levels.ts
147 test file(s), each named by its test level.
exit 0
```

With `__tests__/api/planted-test.ts`, a copy of `api/errors.unit.test.ts` under an old name:

```
$ oxlint --type-aware && node ../scripts/check-test-levels.ts
__tests__/api/planted-test.ts: declares a test but its name does not end in .unit.test.ts(x), .integration.test.ts(x) or .e2e.test.ts
1 file(s) not named by test level (ADR 0007).
exit 1
```

`pnpm format:check` and `pnpm typecheck` pass. The merge of the integration tip (`c931c016`) changed nothing in `mobile/` or `scripts/`.

### Unit-only coverage of the pure modules, for P09-10 (2026-10-22)

From `pnpm test:cov:unit`, least covered first by statements; also in the P09–P11 notes as `P09-05-coverage.md`.

| Adapter | Statements | Lines |
|---|---|---|
| `src/features/events/adapter.ts` | 0.0 % (0/48) | 0.0 % (0/44) |
| `src/features/notifications/adapter.ts` | 0.0 % (0/12) | 0.0 % (0/10) |
| `src/features/parties/adapter.ts` | 0.0 % (0/5) | 0.0 % (0/4) |
| `src/features/quests/room-adapter.ts` | 1.6 % (1/61) | 1.9 % (1/52) |
| `src/features/map/adapter.ts` | 3.6 % (2/56) | 3.8 % (2/53) |
| `src/features/dining/adapter.ts` | 5.7 % (3/53) | 6.8 % (3/44) |
| `src/features/friends/adapter.ts` | 9.1 % (2/22) | 10.5 % (2/19) |
| `src/features/shuttle/adapter.ts` | 17.0 % (8/47) | 18.2 % (8/44) |
| `src/features/footprints/adapter.ts` | 28.6 % (2/7) | 28.6 % (2/7) |
| `src/features/timetable/adapter.ts` | 95.1 % (39/41) | 97.1 % (34/35) |
| `src/features/quests/adapter.ts` | 96.8 % (92/95) | 97.6 % (82/84) |
| **Total** | 33.3 % (149/447) | 33.8 % (134/396) |

Other pure modules, chosen by their imports (no hook, storage, API client, socket, position watch or timer):

| Module | Statements | Lines |
|---|---|---|
| `src/features/map/event-points.ts` | 0.0 % (0/18) | 0.0 % (0/17) |
| `src/features/party/posts.ts` | 0.0 % (0/38) | 0.0 % (0/28) |
| `src/features/quests/rules.ts` | 0.0 % (0/3) | 0.0 % (0/2) |
| `src/screens/onboarding/length.ts` | 0.0 % (0/3) | 0.0 % (0/3) |
| `src/features/shuttle/line.ts` | 2.6 % (1/38) | 2.7 % (1/37) |
| `src/features/party/making.ts` | 3.1 % (2/64) | 3.2 % (2/62) |
| `src/features/party/mine.ts` | 4.4 % (3/68) | 4.9 % (3/61) |
| `src/position/background-rules.ts` | 5.9 % (1/17) | 5.9 % (1/17) |
| `src/features/timetable/class-form.ts` | 7.1 % (3/42) | 7.7 % (3/39) |
| `src/screens/onboarding/department-search.ts` | 11.1 % (1/9) | 12.5 % (1/8) |
| `src/screens/onboarding/interests.ts` | 16.1 % (5/31) | 18.5 % (5/27) |
| `src/features/quests/walking-times.ts` | 19.0 % (4/21) | 19.0 % (4/21) |
| `src/features/party/boards.ts` | 20.0 % (1/5) | 33.3 % (1/3) |
| `src/features/places/picked-place.ts` | 25.0 % (1/4) | 25.0 % (1/4) |
| `src/features/timetable/version-parts.ts` | 29.4 % (5/17) | 31.2 % (5/16) |
| `src/features/party/event-kinds.ts` | 29.4 % (5/17) | 33.3 % (5/15) |
| `src/features/party/held-proposal.ts` | 33.3 % (1/3) | 33.3 % (1/3) |
| `src/korea-time.ts` | 48.5 % (16/33) | 48.5 % (16/33) |
| `src/features/quests/refusals.ts` | 60.0 % (3/5) | 60.0 % (3/5) |
| `src/features/party/finding.ts` | 88.6 % (39/44) | 88.1 % (37/42) |
| `src/features/map/short-name.ts` | 90.3 % (28/31) | 90.3 % (28/31) |
| `src/map/campus.ts` | 93.8 % (15/16) | 93.8 % (15/16) |
| `src/features/timetable/version-checks.ts` | 96.2 % (25/26) | 96.2 % (25/26) |
| `src/features/dining/restaurant-places.ts` | 100.0 % (1/1) | 100.0 % (1/1) |
| `src/map/projection.ts` | 100.0 % (44/44) | 100.0 % (41/41) |
| **Total** | 34.1 % (204/598) | 35.7 % (199/558) |

### Agent usage (2026-10-22)

- Agent time: about 70 minutes, an estimate: the implementer subagent, measured just before its last commit. Most of it went to waiting for the Jest runs on a heavily loaded machine.
- Tokens: input 31,442 thousand in all (cache reads 30,460 thousand, cache writes 981 thousand, uncached under 1 thousand); output 9 thousand, a lower bound, since the transcript keeps only partial output counts.
