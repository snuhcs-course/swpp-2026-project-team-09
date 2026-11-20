# 01: The match server and AI 매칭 leave the code, CI and Production

Parent: none. A04 is an additional task with no spec; this ticket is its whole record.
Follows: P06-03 (#260, merged 2026-11-16), which took AI 매칭 out of the app's UI and kept the match server.
Status: in-progress
Blocked by: None

Branch: `4.0/A04-01-remove-match-server`, cut fresh from `origin/4.0/Main`. The pull request targets `4.0/Main`, follows `.github/pull_request_template.md` in English, and has assignee `Jaehyun0320`.

## Why

The match server was built for AI 매칭 and has been frozen since Iteration 2: it runs in every deployment and does nothing. Checked on 2026-11-20:

- **The app calls nothing.** After #260, `apiClient.requestMatching`, `listMatchingRequests`, `getMatchingRequest` and `withdrawMatchingRequest` have no caller outside `mobile/src/api/` and the test support's `forgetMockMatching`.
- **No other server or the admin site touches it.** In `main-server/src`, only `app.module.ts` imports `MatchingModule`. The admin site, the worker, the socket server and the Assistant do not reference Matching.
- **Production is idle.** The match server's pod (`match-server-877cfdb9c-gn5nc`) wrote 0 log lines in the 72 hours before the check.
- **The links in the server diagram are as drawn.** main → match: `MatchServer` posts to `MATCH_SERVER_URL` with `MATCH_SERVER_TOKEN`. match → main: the `@MatchServerOnly()` routes `/matches/:matchId/quest` and `/matching-requests/{standing,eligible-quests,placements}`. match → PostgreSQL: its own `match` database.

## Decisions

- **Keep the `Quest.matchId` column.** There is no migration: the field stays in `schema.prisma` and only its comment changes, to say it is left from the removed AI 매칭 and that no code writes it. Dropping it is a later, separate change if anyone wants it.
- **Remove every code path that writes or reads `matchId`:**
  - the `matchId` option of `QuestsService` (`quests.service.ts` around lines 200 and 303);
  - `MatchingQuestsService`, which only `src/matching/` uses, together with its export from `quests.module.ts`.
- **Mark the glossary term as retired.** `GLOSSARY.md`'s **Matching** becomes "**Matching** (retired in Iteration 4)", in the way **Meetup** is marked. Its definition stays.
- **Leave history alone.** ADRs and `.scratch/` files of earlier iterations are not edited.
- **App: JavaScript only.** No native file changes, so the change ships over the air (CLAUDE.md § The app's native files). `app-fingerprint` must stay green with no fingerprint change.
- **The cluster's objects are removed by the Release, not by hand.** The Release's `clean` step (or a step next to it) deletes `deployment/match-server`, `service/match-server` and `networkpolicy/match-server` in `snunow` with `--ignore-not-found`.
  - It deletes them **by name**, because the live objects carry no `app=match-server` label.
  - The deploy role has `AmazonEKSAdminPolicy` on the namespace, so it may delete them.
  - The step does nothing once the objects are gone, and it is removed in a later change.

## What to remove or change

Line numbers are from `origin/4.0/Main` on 2026-11-20. They are a guide only; search again when you implement.

### match-server

- Delete `match-server/` entirely.

### main-server

- Delete `src/matching/`: `match-server.ts`, `matching.module.ts`, `matching.service.ts`, `matching.controller.ts`, `matches.controller.ts`, `dto/matching-request.dto.ts`, `dto/match-server-calls.dto.ts`.
- `src/app.module.ts`: remove the `MatchingModule` import and its entry.
- Delete `src/auth/match-server.guard.ts` and its `APP_GUARD` entry in `src/auth/auth.module.ts`.
- Delete `src/common/match-server-only.decorator.ts`. Remove `'match-server'` from `RouteAccess` in `src/common/route-access.ts`, and its mention in the comment.
- `src/common/settings.ts`: remove `MATCH_SERVER_URL` and `MATCH_SERVER_TOKEN`.
- `src/quests/matching-quests.service.ts`: delete it, and remove it from `quests.module.ts`'s providers and exports.
- `src/quests/quests.service.ts`: remove the `matchId` option.
- `prisma/schema.prisma`: keep `matchId` and rewrite only its comment (see Decisions).
- `.env.example`: remove the `MATCH_SERVER_*` lines.
- `README.md`: remove the Matching section and every other mention, about 52 hits; search for `match server`, `Matching` and `matching-requests`.
- `eval/runner.ts`: drop the `refuseMatchServer` argument.
- Tests:
  - Delete `test/match-server.ts` and the six `test/matching-*.integration.test.ts` files.
  - `test/start-app.ts`: remove the `fetchMatchServer` parameter and the `FETCH_MATCH_SERVER` override. That changes `startApp`'s positional signature, so update every caller: about 25 `assistant-*`, `eval-*` and other integration tests, plus `test/library.ts`, `free-time.ts`, `meal-plan.ts`, `room-requests.ts` and `study-groups.ts`. Each passes `refuseMatchServer` as the fourth argument.
  - `test/global-setup.ts`: remove `MATCH_SERVER_URL` and `MATCH_SERVER_TOKEN`.
  - `test/containers.ts`: remove `MATCH_DB_PASSWORD`, if `infra/postgres` no longer needs it.
  - `test/settings.unit.test.ts`: remove both settings from the fixture and from the `describe.each` lists, and update the partition comment on line 12.
  - `test/settings-model.unit.test.ts`, `settings-llm-keys.unit.test.ts`, `settings-notifications.unit.test.ts`: remove `MATCH_SERVER_TOKEN` from their fixtures.

### mobile (JavaScript only)

- Delete `src/api/matching-types.ts`.
- `src/api/client.ts`: remove the four Matching methods and the `MatchingRequest` import.
- `src/api/server/event-client.ts`: remove the Matching operations and `isMatchingRequest`, and update the file's opening comment.
- `src/api/mock/events.ts`: remove the Matching mock and `forgetMockMatching`. Also remove `forgetMockMatching` from `__tests__/support/mocks.ts`.
- `src/api/queries.ts`: remove `MATCHING_REQUESTS_KEY`.
- `src/live/live-updates.tsx`: remove the `'matching-changed'` entry and `MATCHING_REQUESTS_KEY`.
- `README.md`: remove the three `apiClient` rows on lines 1331 to 1333, and any other mention.
- `__tests__/events-tab.integration.test.tsx`: keep the check that no AI 매칭 entry is shown.

### socket-server

- `README.md`: remove the `matching-changed` row on line 161. The server only relays signal names, so no code changes.

### flow-tests

- `compose.test.yaml`: remove the `match-server` service and `MATCH_SERVER_TOKEN`.
- `test/settings.ts` and `test/stack.integration.test.ts`: remove `MATCH_SERVER_TOKEN` from the generated settings.
- `test/deploy-stack.e2e.test.ts`: remove `MATCH_DB_PASSWORD`.
- `test/answers.ts`: remove `matchingRequest`.
- **`test/event.e2e.test.ts` needs a new path, not just deletions.** Today two Users reach the same Shared Quest through Matching. Replace that with the app's own path to a 파티 for a Global Event, and keep the rest of the flow (Party, positions, walking route, Master Switch) unchanged:
  1. One User recruits: `POST /quests` for the event, or `POST /quests/own`; check which one the app's 파티 모집 uses.
  2. The other joins it: `POST /quests/:questId/join`, or a join request and its acceptance, depending on the Quest's JoinPolicy.
- `README.md`: update the `event.e2e.test.ts` row on line 47, and remove the match server's round on line 30 and the "Not covered" note on lines 56 to 58.

### scripts

- `coverage-by-file-set.ts`: remove the `match-server` entries on lines 29 and 35.
- `test/coverage-by-file-set.integration.test.ts`: its fixtures use `match-server` on lines 71 and 160. Move them to a package that still exists, keeping what each case tests.
- `test/check-test-levels.integration.test.ts`: its `src/matching/round.unit.test.ts` is only a sample path, so leave it.

### CI and Release

- `.github/workflows/ci.yml`: remove `match-server` from the `check` matrix on line 46. Also update the comment that says "the four servers".
- `.github/ci/changes.sh` and `test/changes.bats`:
  - remove `match-server` from `JOBS` and `PACKAGE_JOBS`;
  - remove the `match-server/*` rule;
  - make `infra/postgres/*` reach `main-server flow-tests` only.
- `.github/release/release.sh` and `test/release.bats`:
  - remove `match-server` from `SERVERS` and `TARGETS`;
  - `write_secrets` stops reading `match-db-password` and `match-server-token`, and stops writing `MATCH_DATABASE_URL` and `MATCH_SERVER_TOKEN`;
  - add the one-time deletion of the cluster's match-server objects (see Decisions);
  - update the comment on line 31 that says "the five servers", and the matching sentence in `release.yml`.

### Kubernetes

- Delete `infra/production/k8s/parts/match-server/` and `infra/production/k8s/targets/match-server/`.
- `targets/all/kustomization.yaml`: remove `../../parts/match-server`.
- `parts/shared/kustomization.yaml`: remove `MATCH_SERVER_URL` and `ROUND_INTERVAL_SECONDS`. Check that nothing else reads `ROUND_INTERVAL_SECONDS` first.
- `parts/main-server/main-server.yaml`: remove the `MATCH_SERVER_URL` and `MATCH_SERVER_TOKEN` env entries.
- `parts/main-server/network-policy.yaml`:
  - remove `match-server` from the ingress `In` list;
  - remove the egress rule to `app: match-server`;
  - update the comment on line 9.
- `k8s/test/allowed-connections.txt`, `cluster.sh` and `targets.sh`: remove match-server's rows and target.
- `k8s/database-setup.yaml`: stop creating the `match` role and database. The Job is run only by hand, for a new database.

### Terraform

- `infra/production/terraform/ecr.tf`: remove `"match-server"` from `image_repositories`. The repository has `force_delete = true`, so the apply deletes its 16 images too.

### Dev Server and local Compose

- `compose.yaml`: remove the `match-server` service, its `MATCH_SERVER_URL`, and `MATCH_DB_PASSWORD` from postgres.
- `compose.deploy.yaml`: remove the `match-server` service, `MATCH_DB_PASSWORD` and `MATCH_SERVER_TOKEN`.
- `infra/postgres/init-databases.sh`: stop creating `match`. The script runs only on a new volume.
- `infra/deploy/deploy.sh`:
  - remove `match-server` from `REQUIRED_CHECKS`;
  - make sure the Dev Server's running `match-server` container goes away, for example with `compose up --remove-orphans`. Check how `deploy.sh` treats services that Compose recreated.
- `infra/deploy/bootstrap.sh`: stop generating `MATCH_DB_PASSWORD` and `MATCH_SERVER_TOKEN`.
- `infra/deploy/snu-now.env.example`: remove the two values.
- Tests: update `bootstrap.bats`, `deploy.bats` and `fixtures/check-runs.json` to match.
- `infra/deploy/README.md`: update.

### Docs

- Root `README.md`, about 15 hits:
  - the architecture text and any diagram;
  - line 313, "Left in the code";
  - line 802, the directory table;
  - the setup steps that create `match-server/.env`.
  - Say that AI 매칭 was removed in Iteration 4 (A04).
- `infra/production/README.md`, about 22 hits:
  - the server list on line 101, ports on line 132, `Recreate` on line 122, and network policies on lines 396 to 399;
  - the database roles on lines 265 to 326;
  - the migration note on lines 351 to 354;
  - the SSM parameters on lines 469 and 311;
  - the account-B steps.
- `GLOSSARY.md`: mark **Matching** as retired (see Decisions).
- The server diagram the team uses is an image outside the repo. Tell the person who owns it that `match-server` and its arrows are gone.

## Order of operations

The pull request cannot merge while the rulesets still require a check that no longer exists. Steps 1 and 3 change Production or repository settings, so the agent runs them only after a person approves each one.

1. **Before the merge queue** (repo admin): remove `match-server` from the required status checks of both rulesets, **Iteration Main** (`25631643`) and **main** (`25632199`). This is harmless to other open pull requests, which still run the job.
2. Merge the pull request through the merge queue.
3. **After the merge:**
   1. Tag and run an `all` Release. Its `clean` step deletes the cluster's match-server objects, and the new secrets no longer hold `MATCH_*`. Every server's job runs `clean`, so the first Release of **any** server from a commit with this change deletes them; only an `app` Release leaves them.
   2. Check with `kubectl get deploy,svc,networkpolicy -n snunow` that the match-server objects are gone.
   3. Then, in any order:
      - Run `terraform plan`, then `terraform apply`, in `infra/production/terraform`. The plan should show the match-server ECR repository and its lifecycle policy being destroyed, and `aws_iam_role_policy.deploy` updated in place, because its `EcrImages` statement lists every repository's ARN: 2 to destroy, 1 to change.
      - Delete the two SSM parameters: `aws ssm delete-parameters --region ap-northeast-2 --names /snunow/production/match-db-password /snunow/production/match-server-token`.
      - Drop the `match` database and role in RDS, from a psql pod as the master user (`infra/production/README.md` § psql as the master user): `DROP DATABASE match;` then `DROP ROLE match;`. **This cannot be undone.**
   4. **The Dev Server**, once `development` carries this change. The deploy run checks CI with the `deploy.sh` already in its checkout, which still requires a `match-server` check that the new commit never gets, so it waits for CI forever, a run by hand too. On the Dev Server, reset the checkout to the new tip and ask for a run:
      ```bash
      sudo git -C /srv/team/snu-now fetch origin development
      sudo git -C /srv/team/snu-now reset --hard FETCH_HEAD
      sudo systemctl start snu-now-redeploy
      ```
      That run's `compose up --remove-orphans` removes the `match-server` container. The Dev Server's `match` database and the `MATCH_*` values in its settings file can stay. They are harmless.

Doing step 3.3 before 3.1 breaks the Release: today's `release.sh` reads both SSM values and pushes a match-server image.

## Acceptance criteria

- [ ] `git grep -i -E "match[-_ ]?server|MATCH_DB|matching-requests|matching-changed|MatchServer"` outside `.scratch/` and the ADRs finds nothing.
- [ ] `git grep -i matchId` finds only the kept `schema.prisma` field and existing migrations.
- [ ] The main server starts without `MATCH_SERVER_URL` and `MATCH_SERVER_TOKEN`, and the Matching routes answer 404.
- [ ] Every CI job is green, including flow-tests with the new recruit-and-join path, and `app-fingerprint` reports no change.
- [ ] `kustomize build` of `targets/all` has no match-server object, and `manifests` is green.
- [ ] `release.bats`, `changes.bats`, `deploy.bats` and `bootstrap.bats` are green.
- [ ] Before merging, the pull request's Rollback Scenario says this is a one-way door after step 3.3, and lists the order of operations.
- [ ] After the merge, steps 3.1 to 3.3 are recorded under `## Comments` with the date and the result.

## Comments

### Decisions (2026-11-20)

- **The event flow's path.** `flow-tests/test/event.e2e.test.ts` takes the calls the app's 파티 모집 makes for an event (`mobile/src/screens/party/form/use-send.ts`):
  1. Minji attends the event with `POST /quests`.
  2. She opens her Quest with `PATCH /quests/:id` (`capacity: 2`, `joinPolicy: open`, `board: career`).
  3. Jun finds the Quest in `GET /quests/recruiting?globalEventId=` and joins it with `POST /quests/:questId/join`.
  
  The flow tests' caller gained `patch()` for step 2.
- **The cluster cleanup is `delete_retired`, called from `clean`.** It is exposed as `release.sh delete-retired` so that `release.bats` can test it with a fake kubectl. Because it lives there, the acceptance grep still finds `match-server` in `release.sh` and `release.bats`. Every other hit outside `.scratch/` and the ADRs is gone. A later change removes the step.
- **`release.bats`** also checks that the `match-*` parameters left in Parameter Store until step 3.3 reach no secrets file.
- **The Dev Server's container** goes through `compose up --detach --remove-orphans` in `deploy.sh`. The Dev Server still needs the step by hand (step 3.4 above, added after review), because its first gate runs the old `deploy.sh`.
- **`ROUND_INTERVAL_SECONDS`** was read only by the match server, so it was removed everywhere: Kubernetes, Compose, the Dev Server's settings, and the bootstrap.
- **`scripts/coverage-by-file-set.ts`** lost its `add` rule along with match-server's entries, because only match-server used it. Its tests moved to socket-server.
- **`main-server/test/database.integration.test.ts`** lost "keeps the main role out of the match database", because there is no `match` database.
- **The full test suite ran before the merge.** A working branch's run and the merge queue run only the unit tests, so the person agreed to push a temporary tag, `ci/a04-01-full`, for a full CI run. The tag starts CI but not the Release, and it was deleted afterwards. Run 44715568078 is green except for two tests that fail the same way on `4.0/Main`:
  - `quest-drop.integration.test.ts`;
  - `room-keyboard.integration.test.tsx`.
- **No tests ran locally.** bats and `terraform validate` ran only in CI: bats is not installed locally, and the disk was full.

### Agent usage (2026-11-20)

- Agent time: about 2 hours, an estimate. About 1 hour of it was waiting for CI runs, in one Claude Code session with no other worktree.
- Tokens, the main session and two review subagents together:
  - input: 54,071,961 in all, of which:
    - 53,586,429 cache reads;
    - 485,024 cache writes;
    - 508 uncached.
  - output: 128,329.
