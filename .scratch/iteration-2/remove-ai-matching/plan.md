# Removing AI matching and the match server

The team decided on 2026-10-23 to delete the "AI 매칭" feature (GLOSSARY: Matching) and the match server entirely.
This file is a plan, not a spec: an inventory of what exists only for Matching, how each piece goes, what stays because
other features use it, and the decisions left to the team. Branch: `2.0/remove-ai-matching`, from `2.0/Main`.

## What Matching is today

A User asks for Matching on a Global Event with a group size of 2 to 4 (`POST /matching-requests`). The main server
checks the request and passes it to the match server, which keeps the requests in its own database (`match`). Every
minute the match server runs a round: it asks the main server which requests still stand, which Open Quests they can be
placed into, places them (`POST /matching-requests/placements`) or forms a match and asks for its Shared Quest
(`POST /matches/:matchId/quest`). The main server stores the match id on that Quest (`quests.match_id`) and signals
`matching-changed`. The app shows `AI 매칭` on each event card, a sheet for the size, and a list of waiting requests.

## Inventory and how each piece goes

### match-server (whole package)

- `match-server/` — the NestJS server, its Prisma schema and three migrations (`matching_requests`, `matches`,
  `placements`), tests, Dockerfile, README, lockfile. **Delete the folder.**

### Building, running, testing and deploying it

- `compose.yaml` — the `match-server` service, `MATCH_SERVER_URL` in main-server's environment, `MATCH_DB_PASSWORD` in
  postgres's. **Remove them.**
- `compose.deploy.yaml` — `MATCH_DB_PASSWORD`, `MATCH_SERVER_TOKEN` and the `match-server` service. **Remove them.**
- `flow-tests/compose.test.yaml` — `MATCH_SERVER_TOKEN` and the `match-server` service. **Remove them.**
- `infra/postgres/init-databases.sh`, `infra/postgres/Dockerfile` — the `match` role and database created on a fresh
  volume, and a comment. **Stop creating them** (see Database below for existing volumes).
- `.github/workflows/ci.yml` — `match-server` in the check matrix. **Remove it.**
- `.github/release/release.sh` and `release.bats` — `match-server` in `SERVERS` and `TARGETS`, `MATCH_DATABASE_URL`
  and `MATCH_SERVER_TOKEN` in the secrets it writes; the bats expectations and the CI job list. **Remove them.**
- `infra/deploy/deploy.sh` — `match-server` in `REQUIRED_CHECKS`. `bootstrap.sh` — generates `MATCH_DB_PASSWORD` and
  `MATCH_SERVER_TOKEN`. `snu-now.env.example` — both, and `ROUND_INTERVAL_SECONDS`. Tests: `test/deploy.bats`,
  `test/bootstrap.bats`, `test/fixtures/check-runs.json`. `README.md`. **Remove the match server from each.**
- `infra/production/k8s/` — `parts/match-server/` and `targets/match-server/` (**delete**); `targets/all` (drop the
  part); `parts/shared/kustomization.yaml` (`MATCH_SERVER_URL`, `ROUND_INTERVAL_SECONDS`); `parts/main-server/main-server.yaml`
  (`MATCH_SERVER_URL`, `MATCH_SERVER_TOKEN`); `parts/main-server/network-policy.yaml` (ingress from and egress to the
  match server); `database-setup.yaml` (the `match` role and database); `test/targets.sh`, `test/cluster.sh`,
  `test/allowed-connections.txt`. **Remove the match server from each.**
- `infra/production/terraform/ecr.tf` — `match-server` in the image repositories. **Remove it** (see Risks: an apply
  deletes the repository with its images, `force_delete = true`).
- `infra/production/README.md` — the match server's Deployment, ports, roles, Parameter Store entries, network
  policies, Release target, migrations, restore steps. **Rewrite those passages for four servers less one.**
- `main-server/.env.example` — `MATCH_SERVER_URL`, `MATCH_SERVER_TOKEN`. **Remove them.**

### main-server

- `src/matching/` — `matching.controller.ts`, `matches.controller.ts`, `matching.service.ts`, `match-server.ts`,
  `matching.module.ts`, `dto/matching-request.dto.ts`, `dto/match-server-calls.dto.ts`. **Delete the folder** and
  `MatchingModule` from `app.module.ts`.
- `src/quests/matching-quests.service.ts` — what only Matching reads of the Quests. **Delete it** and its entry in
  `quests.module.ts`.
- `src/common/match-server-only.decorator.ts`, `src/auth/match-server.guard.ts` — **delete them**, the guard from
  `auth.module.ts`, and `'match-server'` from `RouteAccess` in `src/common/route-access.ts`.
- `src/common/settings.ts` — `MATCH_SERVER_URL`, `MATCH_SERVER_TOKEN`. **Remove them** (also from
  `test/global-setup.ts`).
- `src/quests/quests.service.ts` — the `matchId` setting of `createForGlobalEvent` and `create`. **Remove it.**
- Tests: `test/match-server.ts` (the stub), `test/matching-placements.e2e-spec.ts`, `matching-quests`,
  `matching-requests`, `matching-standing`, `matching-states`, `matching-unanswered`. **Delete them.** `test/start-app.ts`
  takes `fetchMatchServer` as its fourth argument: **drop the parameter** and the `refuseMatchServer` argument at every
  call (`test/assistant*.e2e-spec.ts`, `eval-cases`, `eval-tool-errors`, `shuttle`, `eval/runner.ts`).
- `prisma/schema.prisma` — `Quest.matchId`. See Database.
- Seed and demo data: none for Matching (checked: no `matchId` or request in `src/seed*` or the demo data).
- `README.md` — the Matching section, the match-server parts of Run it, Quests (`settings.matchId`,
  `MatchingQuestsService`, "Matching adds the Quests with several Holders", "from a match"), Folder layout, Database,
  the test example. **Remove or reword them.**

### socket-server and worker-server

- `socket-server/README.md` — the `matching-changed` row of the signals table. **Remove it.** The code passes signals
  by name and has nothing of its own for Matching.
- worker-server: nothing.

### mobile

- **Delete:** `src/api/matching-types.ts`, `src/app/(signed-in)/matching.tsx` (the `/matching` route),
  `src/screens/events/matching-screen.tsx` (AI 매칭 신청 list), `src/screens/events/matching-sheet.tsx`,
  `src/features/events/matching-watch.tsx`, `__tests__/events-matching-test.tsx`.
- **Edit:** `src/api/client.ts` (the four Matching operations), `src/api/server/event-client.ts`,
  `src/api/mock/events.ts` (the in-memory requests and `forgetMockMatching`), `src/api/queries.ts`
  (`MATCHING_REQUESTS_KEY`, `matchingRequestsQuery`), `src/live/live-updates.tsx` (`matching-changed`),
  `src/app/(signed-in)/_layout.tsx` (`MatchingWatch`, the `matching` screen), `src/features/events/adapter.ts`
  (`matching` on the event view, `MatchingRowView`), `src/features/events/use-events.ts`,
  `src/features/quests/refusals.ts` (the three `MATCHING_REQUEST_*` words), `src/screens/events/event-item.tsx` (the
  `AI 매칭` / `매칭 중` button), `events-bar.tsx` (the sparkle button with the count), `events-screen.tsx`,
  `event-sheets.tsx` (the match sheet and `openMatchingRequests`), `use-event-actions.ts` (request and withdraw),
  `src/screens/main/chat-event-cards.tsx` and `chat-sheet.tsx` (the chat's event cards open the same sheets),
  `src/design-system/icon.tsx` (the `sparkle` icon, used only by Matching), the catalogue and `bottom-sheet.tsx`'s
  example label "AI 매칭" (relabel), and the tests and their support (`__tests__/support/app.tsx`, `events.ts`,
  `mocks.ts`, `server.ts`, `events-tab-test.tsx`, `chat-event-cards-test.tsx`,
  `design-system/bottom-sheet-test.tsx`).
- `mobile/README.md` — the 행사 tab's AI 매칭 passages, the `/matching` route, the client table rows, the
  `matching-changed` signal. **Remove them.**

### admin

- Nothing. `users-matching.ts` and `placesMatching` filter lists by a search word; they are not AI matching.

### flow-tests

- `test/event.flow.ts` — the two students are matched into a Shared Quest before they meet in its Party. **Replace the
  Matching step** with the recruiting path: 김민지 attends the event, opens her Quest (`PATCH /quests/:id`,
  `joinPolicy: open`, a board), 이준 finds it in `GET /quests/recruiting?globalEventId=` and joins it. The rest of the
  flow (the Party, positions, the Master Switch) stays.
- `test/answers.ts` (`matchingRequest`), `test/settings.ts` and `test/stack.flow.ts` (`MATCH_SERVER_TOKEN`),
  `test/deploy-stack.flow.ts` (`MATCH_DB_PASSWORD`), `test/stack.ts` (emptying the `match` database), `README.md`.
  **Remove the match server from each.**

### Docs

- `GLOSSARY.md` — **Matching**: mark it retired the way **Meetup** is ("(retired in Iteration 2)", past tense, what
  takes its place). **Shared Quest**: drop "matched Users" from its example.
- `docs/adr/` — no ADR is about Matching itself. ADRs are not deleted. **Add ADR 0007** recording that Matching and the
  match server were removed and what that leaves (three servers, one database). ADR 0004 and 0005 mention the match
  server and "AI matching" in passing: **add a one-line note** pointing to 0007 rather than rewriting them.
- Root `README.md` — the four servers, Matching in the overview and the demo, Setup, settings tables, tests, folder
  layout. **Remove or reword.**
- `AGENTS.md` / `CLAUDE.md` — no mention of Matching or the match server; nothing to change.
- `.scratch/` — the specs and tickets of earlier iterations stay as history.

## Database

### The main database: `quests.match_id`

Only Matching writes `quests.match_id` (and its unique index `quests_match_id_key`). The Quests made by matches are
ordinary Closed Quests with Holders and stay; only the link to a match goes.

Proposal, in two commits so the team can hold back the second:

1. **Non-destructive** (with the main-server commit): no code reads or writes `matchId` any more. The field stays in
   `prisma/schema.prisma` with a comment that nothing uses it, so the schema and the migrations agree and nothing is
   dropped.
2. **Destructive, its own commit** `feat!: drop quests.match_id (destructive)`: remove the field from the schema and add
   the migration `20261023120000_drop_quest_match_ids` (`DROP INDEX "quests_match_id_key"; ALTER TABLE "quests" DROP
COLUMN "match_id";`). The main server applies it at its next start in every environment, Production included, and
   it cannot be undone (the ids are lost; they point at matches in a database that is going away anyway).

**Decision for the team:** take both commits now, or revert the second and drop the column in a later Release once the
removal has run in Production for a while. Either way the first commit alone is safe to release.

### The match database (`match`) and its role

It lives on the local and Dev Server PostgreSQL container (created by `infra/postgres/init-databases.sh` on a fresh
volume) and in Production on RDS (created by the database Job in `infra/production/k8s/database-setup.yaml`).

- In the repository: stop creating it (init script, database Job, Release secrets). Done in this branch.
- **Not done here, a manual step for the team after the release:** take a `pg_dump` of `match` if anyone wants the
  requests kept, then `DROP DATABASE match; DROP ROLE match;` on the Dev Server and on RDS, and delete the Parameter
  Store entries `/snunow/production/match-db-password` and `/snunow/production/match-server-token`. Nothing in this
  branch runs against a real environment.

## Rolling it out (for whoever releases)

- **Production:** a Release applies with `kubectl apply` and no pruning, so the match server's Deployment, Service and
  NetworkPolicy stay until deleted by hand: `kubectl --namespace snunow delete deployment,service,networkpolicy
match-server`. Then an `all` Release (or main-server's), then the database step above, then `terraform apply` for the
  ECR repository.
- **Dev Server:** `compose up` keeps the old `match-server` container as an orphan; remove it once with
  `sudo docker rm --force snu-now-match-server-1` (Compose no longer knows the service, so `compose rm` cannot), and
  drop the database as above. Both runbooks now hold these steps (`infra/production/README.md`, `infra/deploy/README.md`).
- **GitHub:** if branch protection on the main lines requires the `match-server` check, remove it there, or no PR can
  merge once the job is gone.

## What must not be removed

Each was checked to be independent of Matching:

- **Open and Approval recruiting, joining, join requests, invitations** (`RecruitingService.enter`,
  `JoinRequestsService`, `InvitationsService`). Matching's placement called `enter`, which stays as it is.
- **Shared Quests** and `QuestsService.freeForSharedQuest`, `holderIds`, `createForGlobalEvent`, `lock`: joining a Quest
  for a Global Event uses them; only the `matchId` setting goes.
- **The refusal `SHARED_QUEST_HELD`** in `src/quests/refusals.ts`: joining another's Quest for an event raises it.
- **`UsersService.lock`** and **hashtags on profiles**: the party finder sorts recruiting posts by shared tags.
- **Boards, Parties, the 행사 tab's 파티 찾기/모집** sheet and the recruiting count on cards.
- **The `quests-changed` signal**, **`MAIN_SERVER_URL`** (the worker and admin use it).
- **`users-matching.ts` / `placesMatching` in admin**, the timetable OCR's "matched" counts: plain word matching.
- **The Assistant's event cards**: they keep 파티 찾기/모집; only their AI 매칭 button goes.

## Risks

- **Apps already installed** call `GET /matching-requests` on start and on `matching-changed`; after the release they
  get 404. The 행사 tab's query fails quietly and the rest works, but the card button stays in old builds until the new
  APK is installed.
- **Dropping `quests.match_id`** is irreversible; see the decision above.
- **`terraform apply`** deletes the `match-server` ECR repository with its images (`force_delete = true`). Images can
  be rebuilt from git, so this is acceptable, but it is a real deletion.
- **Orphans:** the running match server keeps calling the main server's removed routes (404 or refused by the network
  policy) until it is deleted by hand, as above.
- **Required checks:** see GitHub above.

## Commits

1. `docs: plan the removal of AI matching and the match server` (this file).
2. main-server: the module, guard, settings, tests, README (`matchId` kept in the schema).
3. main-server: `feat!: drop quests.match_id (destructive)`, schema and migration only.
4. mobile: the button, sheet, list, client, signals, tests, README.
5. match-server, compose, CI, Release, infra, flow-tests.
6. docs: README, GLOSSARY, ADR 0007, socket-server README.
