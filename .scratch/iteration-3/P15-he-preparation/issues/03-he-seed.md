# 03: The HE seed: accounts, Friends, Timetables and recruiting Quests

Parent: [P15 spec](../spec.md) ("The HE accounts", "The Timetables", "The recruiting Quests", "The HE seed")
Status: done
Blocked by: 01 (the account table and the sign-in by key)

## What to build

`he-seed`, a main-server command beside the demo seed, writes the confirmed HE data. Every HE account then starts at the first run with Friends, a Timetable and recruiting Quests to join. The data is the table of ticket 01, extended with the spec's tables.

## Acceptance criteria

- [x] **Users:** seven Users that have not finished Onboarding, with the spec's names, departments, Google names and Friend IDs, and the Master Switch off.
- [x] **Friendships:** the accepted friendships of the spec's table and no others, with the default switches. There are no Friend Requests, Quest invitations or Party memberships.
- [x] **Timetables:** the spec's Timetables, Monday to Friday. Monday repeats Wednesday's Classes and Tuesday repeats Thursday's. Each Class time has its campus-map Place and no room.
- [x] **Recruiting Quests:** the eight of the spec's table, each with:
  - the Leader as the only Holder;
  - the Board, the Join Policy and the capacity given;
  - a short recruiting post in Korean;
  - one Sub Quest at the time and Place given.

  #6 goes to the demo `band-show` Global Event through its attending Sub Quest.
- [x] **Dates:** every time is a fixed date of the week of 2026-11-04 in Korean time.
- [x] **Re-runs:** rows have stable ids. A run creates only what is missing and never overwrites, so a second run changes nothing and an onboarded account keeps its answers.
- [x] **Missing prerequisites:** without the campus Places or the demo `band-show` Global Event, the command stops with a message that names what is missing.
- [x] **Where it runs:** inside the main-server container from the built image, as the demo seed's command does.
- [x] **Seed integration test**, with the clock at 2026-11-04 15:30 KST and CI green on the HE branch (prior art: the `demo-seed`, `free-time-judgement` and `recruiting-quests` integration tests):
  - each account signs in by key and finishes Onboarding through the API;
  - the test then checks the account's friend list, its Classes and the eight recruiting Quests, with Leaders, capacities and recruiting state;
  - through the Free Time module, it checks the spec's effects during the evaluation, at Wednesday dinner, for the round partners and at Thursday lunch;
  - a second run changes nothing, and an onboarded account's answers survive it;
  - a missing demo Global Event stops the seed.

## Comments

- **Built (2026-11-03), on `3.0/P15-he-03`.**
  - **Data:** `main-server/src/he/he-accounts.ts` (ticket 01's table) now also holds each account's address, Friend ID, starting Friends (the round accounts' drawn spares) and Timetable as the spec's Wed/Thu/Fri columns; the stand-in reads the address from it. The eight Quests, with their recruiting posts and Sub Quest titles, are in `main-server/src/he/he-quests.ts`.
  - **Seed:** `seedHe` in `main-server/src/he/he.seed.ts`. Ids are UUIDv5 of names of its own (`he:user:<key>`, `he:class:<key>:<course>`, `he:quest:<n>` …). It first checks the campus Places it names and the demo `band-show` (by the demo seed's own id), and stops naming everything missing before writing anything. Then it creates, in one transaction, only the Users, friendships, Classes (with their times) and Quests (with their Holder and Sub Quest) whose rows are absent; a row that is there is left as it is, children included. A Class with a start alone lasts 75 minutes; Wednesday's Classes are also held on Monday and Thursday's on Tuesday. Friendships are accepted at 2026-11-03 12:00 KST; Quests were made on 11-04 from 08:52 to 08:59 KST, #1 the newest.
  - **Command:** `main-server/src/he-seed.ts`, built to `dist/he-seed` like `dist/demo-seed`. On the HE server, after the deploy and the Collections: `dc exec main-server node dist/he-seed`. Locally: `pnpm he:seed`. It logs how many rows it wrote; a second run writes 0. Ran from the built image (`docker build main-server`) against a fresh database: both refusals, then 7 Users, 8 friendships, 29 Classes and 8 Quests, then 0.
  - **Tests:** `main-server/test/he-seed.integration.test.ts` (accounts, friendships, Timetables, a second run, the refusals), `he-seed-quests.integration.test.ts` and `he-seed-free-time.integration.test.ts`, over a stage in `test/he-seed.ts`: seed files, demo data as refreshed at 11-04 04:00, the HE seed, the clock at 11-04 15:30 KST, and every account signed in by key and onboarded through the API. Free Time is read through the Assistant's 공강 tools (`getMyDay`, `findFreeTimeEvents`, `findFreeFriends`) with the scripted model. Every effect the spec lists held as written; no time, Place, Friend or Leader was changed. Lint, format check, typecheck and all 227 test files of `main-server` pass locally.
  - **Not ticked:** CI green on the HE branch, which runs only once the branch is pushed.
- **CI (2026-11-03):** every CI check passed on `a78b952` and on `d0a4ed5`, the pushed `3.0/P15-he`, which holds this ticket. That ticks the last box.

### Agent usage (2026-11-03)

- **Agent time** (estimate): about 35 minutes.
  - The implementing subagent: 30 minutes.
  - The main session: about 5 minutes.
  - The review's seed fixes are counted under ticket 06.
- **Tokens** (measured, subagent): input 246 uncached, plus 28,125,355 cache reads and 313,123 cache writes; output 124,945. The main session that ran all of P15's tickets is counted once, under ticket 06.
