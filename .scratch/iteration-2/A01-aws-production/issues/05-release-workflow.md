# 05: The Release workflow

Parent: [A01 spec](../spec.md)
Status: resolved
Blocked by: 03 (the confirmed `DATABASE_URL` form and the database output), 04 (the manifests and the admin image), 09 (the shared part and the per-server parts it applies). Tickets 01 and 02 come before 03.
Touches: `.github/workflows/release.yml` (new). Nothing else.

## What to build

Pushing a tag named `snunow/<target>/YY.MM.DD-N` deploys that target at that commit to Production, and the run in the Actions tab shows whether it worked (spec: "The Release workflow", "Images and ECR", "Workloads", and "Settings"). The target is one server, `main-server`, `socket-server`, `worker-server`, `match-server`, or `admin`, or `all` for all five.

1. **Trigger and name check.** The workflow starts on a pushed tag matching `snunow/**` except `snunow/app/**`, and on `workflow_dispatch`. Its first step checks the full name of the ref: a target from the six above, a two-digit year, month 01 to 12, day 01 to 31, and N from 1. Any other name fails the run, including a run by hand on a branch or on an app tag.
2. **The gate.** The workflow does not run or call CI. Before any AWS step, it reads the jobs of CI's runs on the tagged commit through GitHub's API, with `actions: read`, and judges them as `infra/deploy/deploy.sh` judges the Dev Server's five server checks, but over every CI job: one successful run of a job is enough; while a job without a success still has a run queued or running, or one cancelled by a newer push to its branch, it waits; a job whose runs all failed, or no successful run of a job within a time limit longer than CI takes, fails the run. CI runs on the tag push too, since its `on: push` takes tags.
3. **AWS access.** `aws-actions/configure-aws-credentials@v6` assumes the deploy role, and `aws-actions/amazon-ecr-login@v2` logs in to ECR. The permissions are `id-token: write`, `contents: read`, and `actions: read`. The role trusts `sub` like `repo:snuhcs-course@139540821/swpp-2026-project-team-09@1374366029:ref:refs/tags/snunow/*`, which `infra/production/terraform/deploy_role.tf` already sets.
4. **Build and push.** Only the target's images, all five for `all`, are built for `linux/arm64` on GitHub's arm64 runners and pushed with two tags: the commit SHA, and the tag's name without `snunow/` and with `/` as `-`, for example `main-server-26.11.13-1` or `all-26.11.13-2`. An image whose commit-SHA tag is already in its repository is not built again, but still gets the Release's tag. The admin image takes its two public build arguments from repository variables.
5. **Deploy.** Each server the Release deploys gets a job of its own, so an `all` Release runs five.
   - With the deploy role, the job reads the parameters under `/snunow/production/` (spec: "Settings") with `aws ssm get-parameters-by-path --path /snunow/production --with-decryption`. AWS authorizes that call against the path in the request, and the role's permission names exactly `/snunow/production`, without a trailing slash.
   - It writes them into the three files that ticket 09's `secretGenerator` reads: `secrets.env`, with each server's `DATABASE_URL` assembled from its password, the database endpoint, and `?sslmode=verify-full`, and the access-token key pair as two PEM files with real line breaks.
   - Kustomize sets the server's image to the commit SHA in its server's target from ticket 09, and that render, the shared part and the server's part, is applied.
   - `kubectl rollout status` waits on that server's Deployment only, with a time limit longer than the 5-minute startup probe; one that does not become ready fails the run.
   - After a successful rollout, the generated ConfigMaps and Secrets that no pod uses any more are deleted. They are found by the names the generators give them, `settings` or `secrets` and the hash, so a Secret made by hand, such as the database Job's, is never touched.
6. **One at a time per server.** Each server's job runs in a fixed concurrency group of its own, for example `release-main-server`, with `cancel-in-progress`, so a newer Release of a server cancels that server's running one, and different servers deploy at once. An `all` Release runs each server's job in that server's group. The gate, the build, and the deploy of a server all run inside its group, so an older Release still waiting in the gate cannot start after a newer one and cancel it.
7. **Deploying an earlier Release again.** `workflow_dispatch`, run from the Actions tab on that Release's tag, deploys the tag's target at its commit.

The workflow reads the Region, the role ARN, the cluster name, the registry, the database endpoint, and the admin site's two public build arguments from repository variables, and every secret value from Parameter Store, so GitHub holds no Production secret. It creates no GitHub release page.

## Acceptance criteria

- [x] The name check accepts `snunow/main-server/26.11.13-1` and `snunow/all/26.11.13-12`, and refuses `snunow/web/26.11.13-1`, `snunow/main-server/26.13.01-1`, `snunow/main-server/26.11.32-1`, `snunow/main-server/26.11.13-0`, `snunow/main-server/26.11.13`, and `snunow-26.11.13-1`. `## Comments` says how this was checked.
- [x] A tag under `snunow/app/` starts no run of the workflow; `## Comments` says how this was checked, and ticket 08 confirms it with the first app tag.
- [x] The gate reads CI's results for the tagged commit and never runs or calls CI. It waits while CI is running and goes on only once every CI job has passed; a job whose runs all failed, or no success within its limit, stops the run before any AWS step. A job that failed on the branch's push but still runs on the tag's is waited for.
- [x] The permissions are `id-token: write`, `contents: read`, and `actions: read`, and nothing more.
- [x] No AWS key and no Production secret is stored in GitHub; the only AWS access is the OIDC role, and the secret values come from Parameter Store.
- [x] A Release builds only its target's images; the build step skips an image whose commit is already pushed and still tags it with the Release's tag, for example `main-server-26.11.13-1`.
- [x] A server's Release applies the shared part and that server's part with only that server's image set, and waits only on that server's Deployment; a Deployment that does not finish rolling out within its limit fails the run.
- [x] An `all` Release runs one job per server, each in its server's group, and its jobs do not fail on each other when they apply the same shared objects, on the first deploy too, when none of them exists yet.
- [x] After a successful rollout, only generated ConfigMaps and Secrets that no pod uses are deleted, never one that a Release running at the same time has just applied.
- [x] The secrets files keep the PEM line breaks; neither they nor the values read from Parameter Store are printed to the log, and the files are never uploaded as an artifact.
- [x] Two Releases of one server pushed close together never deploy at once, and the newer one deploys, even when the older one is still waiting in the gate; Releases of different servers deploy at once.
- [x] `workflow_dispatch` on a Release tag deploys that tag's target at its commit.
- [x] `actionlint` reports nothing on `release.yml`.
- [x] The first real run happens in ticket 08, since CI cannot reach AWS; `## Comments` lists the repository variables and the parameters the workflow reads, for ticket 07's runbook.
- [x] `release.yml` carries the `#` AI-generated box with a row for this change (`CLAUDE.md`).
- [x] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.

## Comments

- **2026-10-22:** The workflow reads Production's secret values from Parameter Store, not from GitHub: parameters under `/snunow/production/` named `main-db-password`, `match-db-password`, `access-token-private-key`, `access-token-public-key`, `worker-token`, `match-server-token`, `kakao-rest-api-key`, `openrouter-api-key`, and `initial-administrator-emails`, each a `SecureString` but the last, a `String`. `deploy_role.tf` already lets the deploy role read them.
- **2026-10-22:** A Release is a tag `snunow/<target>/YY.MM.DD-N` that deploys one server, or all five with `all`. The workflow reads the results CI already produced for the tagged commit, and every CI job gates a Release. The deploy role trusts `refs/tags/snunow/*`.

### Built (2026-10-22)

- **Files.** `.github/workflows/release.yml` keeps to the steps; their logic is in `.github/release/release.sh`, one
  command per step (`check-name`, `gate`, `push-image`, `write-secrets`, `deploy`, and `clean`), with its tests in
  `.github/release/test/` (bats, with `gh` faked on `PATH`). A new CI job, `release-script`, runs shellcheck and the
  tests, so it gates Releases like every other CI job.
- **Jobs.** The `name check` job runs the name check on `ubuntu-latest` and gives the servers and the images' Release
  tag. One `release <server>` job per server then runs on `ubuntu-24.04-arm` in the group `release-<server>` with
  `cancel-in-progress`: the gate, the AWS login, the build, the secrets, the deploy, and the cleanup, in that order. A
  run is named after its tag.
  Its image includes the AWS CLI, `kubectl`, `kustomize`, `jq`, `gh`, and Docker Buildx.
- **The gate.** It lists `ci.yml`'s runs of the tagged commit and each run's jobs through GitHub's API every 60
  seconds, and judges each job as `infra/deploy/deploy.sh` judges a check. It passes once every job listed has a
  success, and fails on a job whose runs all failed. A job that is queued or running, cancelled, or not yet listed by a
  run that has not finished keeps it waiting, and so does a job without a success while GitHub has not yet listed the
  run of the tag's own push (`head_branch` is the tag's name). It fails after 45 minutes without a pass.
- **Images.** Built with `docker buildx build --platform linux/arm64 --push` and both tags. When the commit's tag is
  already in the repository, `aws ecr batch-get-image` and `aws ecr put-image` add the Release's tag to that image,
  ECR's own way to retag. An admin image built earlier for the same commit keeps the build variables it was built
  with, so a change to those two variables reaches the site with the next commit's admin image.
- **Secrets.** The step pipes `aws ssm get-parameters-by-path --path /snunow/production --with-decryption` into
  `write-secrets`, which writes `infra/production/k8s/parts/shared/secrets/` with mode 600 and prints no value. The two
  passwords are percent-encoded in the `DATABASE_URL`s. A missing parameter, a key without real line breaks, an env
  value of more than one line, or an empty database endpoint stops the job, naming the parameter.
- **Deploy.** `kustomize edit set image <server>=<registry>/<server>:<commit>` in `targets/<server>`, then `kubectl
  apply --server-side --force-conflicts --field-manager=release --kustomize targets/<server>`, sent up to three times,
  then `kubectl rollout status deployment/<server> --timeout=10m`. Every job applies under the one field manager, so
  the jobs of an `all` Release agree on the shared objects.
- **Cleanup.** After the rollout, `clean` lists the ConfigMaps and Secrets in `snunow`, then the Deployments and pods,
  and deletes each `settings-<hash>` ConfigMap and `secrets-<hash>` Secret that no Deployment's pod template and no pod
  names and that is older than 10 minutes, with `--ignore-not-found`. Only names and creation times are kept from the
  listing.

### Repository variables and parameters, for ticket 07's runbook (2026-10-22)

| Repository variable | Set from |
|---|---|
| `PRODUCTION_REGION` | `terraform output -raw region` |
| `PRODUCTION_DEPLOY_ROLE_ARN` | `terraform output -raw deploy_role_arn` |
| `PRODUCTION_CLUSTER_NAME` | `terraform output -raw cluster_name` |
| `PRODUCTION_ECR_REGISTRY` | `terraform output -raw ecr_registry` |
| `PRODUCTION_DATABASE_ENDPOINT` | `terraform output -raw database_endpoint` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | The admin Google client's ID (the ConfigMap's `GOOGLE_ADMIN_CLIENT_ID`) |
| `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY` | The Kakao JavaScript key; the only one that may be left unset, as `admin/.env.example` says |

The workflow reads the parameters under `/snunow/production/`, `SecureString` except the `String`
`initial-administrator-emails`: `main-db-password`,
`match-db-password`, `access-token-private-key`, `access-token-public-key`, `worker-token`, `match-server-token`,
`kakao-rest-api-key`, `openrouter-api-key`, and `initial-administrator-emails`. Each must hold a value, and the two
keys must be PEM with real line breaks.

### How each criterion was checked (2026-10-22)

- **Name check.** `.github/release/test/release.bats` runs `release.sh check-name` on each name the criterion lists,
  as `refs/tags/...`, and on a few more: month 00, day 00, a four-digit year, N written `01`, an app tag, a branch named
  like a Release tag, a branch, and a name with a further segment. The two accepted names give their servers and
  Release tags (`main-server-26.11.13-1`, `all-26.11.13-12`); every other one fails, naming the ref.
- **App tags.** The trigger lists `snunow/**` and then `!snunow/app/**`; by GitHub's filter rules, a negative pattern
  after a matching one leaves the tag out, and `actionlint` checks both patterns. The name check refuses an app tag
  as well, so a run started by hand on one fails before any AWS step. Ticket 08 confirms it with the first app tag.
- **Gate.** The bats tests serve CI's runs and jobs from a faked `gh`: every job passed goes on after one poll and
  sends only the two GET requests; a job that failed in both runs stops it; a job that failed on the branch's run and
  runs on the tag's is waited for, and the gate goes on once it passes there, with the other jobs' success from the
  branch's run; a run that lists no jobs yet keeps a job that failed elsewhere waiting, and so does a tag's run that
  GitHub has not listed yet; no run at all, or a run cancelled by a newer push, waits until the limit and then fails;
  GitHub not answering is waited for. The workflow runs the gate before `configure-aws-credentials`.
- **Secrets files.** The bats tests feed `write-secrets` Parameter Store's answer and compare the three files: the env
  file holds the seven keys with both `DATABASE_URL`s assembled and a password with `/`, `+`, `=`, and `@`
  percent-encoded, the PEM files match the stored keys line for line, and the output holds no value. Further tests
  check each refusal above. Locally, the files written from a real ES256 key pair rendered `targets/main-server` with
  `kubectl kustomize`, and the Secret's `ACCESS_TOKEN_PRIVATE_KEY` decoded to the original PEM.
- **Cleanup.** A bats test gives `unused-generated` ConfigMaps and Secrets: of the generated ones, it picks only the
  old ones that neither the Deployment nor the pod names, and leaves one created two minutes earlier, the database
  Job's `database-setup`, and `kube-root-ca.crt`.
- **Images and the set image.** `push-image` ran with stand-ins for `aws` and `docker`: an image already pushed gets
  only `put-image` with the Release's tag, also when that tag is already there; a new one gets one `buildx build` with
  both tags; the admin image gets its two build arguments and is refused without the Google client's. `kustomize edit
  set image` in each server's target gave a render whose server Deployment carries the ECR image and whose `redis`
  keeps `redis:8`.
- **Permissions, concurrency, and dispatch.** Read from `release.yml`: the three permissions at the workflow level and
  none in the jobs; each server's job in `release-<server>` with `cancel-in-progress`, the gate inside it; the name
  check and the checkout both take the ref the run was started on, so a run by hand on a Release tag deploys that
  tag's target at its commit. The name check runs outside the groups, so two Releases of one server pushed within the
  few seconds that job takes may enter the group in either order. GitHub shows **Run workflow** only for workflows on
  the default branch, `main`, so a run by hand from the Actions tab needs `release.yml` there.
- **Not run against AWS or the cluster.** The role's OIDC login, the ECR push and retag, the Parameter Store call,
  server-side apply from several jobs at once, the rollout limit, and the cleanup's `kubectl` calls are first run by
  ticket 08's first `all` Release. The arm64 runner image lists kubectl 1.35, two minors behind the cluster's 1.37 and
  outside kubectl's supported skew; the calls use stable APIs, and a pinned kubectl in the job is the fix if that run
  shows otherwise.
- **Lint.** `actionlint` 1.7.12 reports nothing on `release.yml` and `ci.yml`; shellcheck reports nothing on the
  script and the tests; the 13 bats tests pass in Ubuntu 24.04's `bats`, as the CI job installs it.

### Agent usage (2026-10-22)

- Agent time: about 1 hour 15 minutes, an estimate, summed over its implementer and its reviewer, and the agents that rewrote the design for Parameter Store and per-server Releases and reviewed it.
- Tokens, subagents included: input 548 new, 41.3 million read from the cache, and 1.27 million written to the cache; output 40 thousand.
