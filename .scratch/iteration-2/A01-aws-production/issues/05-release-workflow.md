# 05: The Release workflow

Parent: [A01 spec](../spec.md)
Status: ready-for-agent
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

- [ ] The name check accepts `snunow/main-server/26.11.13-1` and `snunow/all/26.11.13-12`, and refuses `snunow/web/26.11.13-1`, `snunow/main-server/26.13.01-1`, `snunow/main-server/26.11.32-1`, `snunow/main-server/26.11.13-0`, `snunow/main-server/26.11.13`, and `snunow-26.11.13-1`. `## Comments` says how this was checked.
- [ ] A tag under `snunow/app/` starts no run of the workflow; `## Comments` says how this was checked, and ticket 08 confirms it with the first app tag.
- [ ] The gate reads CI's results for the tagged commit and never runs or calls CI. It waits while CI is running and goes on only once every CI job has passed; a job whose runs all failed, or no success within its limit, stops the run before any AWS step. A job that failed on the branch's push but still runs on the tag's is waited for.
- [ ] The permissions are `id-token: write`, `contents: read`, and `actions: read`, and nothing more.
- [ ] No AWS key and no Production secret is stored in GitHub; the only AWS access is the OIDC role, and the secret values come from Parameter Store.
- [ ] A Release builds only its target's images; the build step skips an image whose commit is already pushed and still tags it with the Release's tag, for example `main-server-26.11.13-1`.
- [ ] A server's Release applies the shared part and that server's part with only that server's image set, and waits only on that server's Deployment; a Deployment that does not finish rolling out within its limit fails the run.
- [ ] An `all` Release runs one job per server, each in its server's group, and its jobs do not fail on each other when they apply the same shared objects, on the first deploy too, when none of them exists yet.
- [ ] After a successful rollout, only generated ConfigMaps and Secrets that no pod uses are deleted, never one that a Release running at the same time has just applied.
- [ ] The secrets files keep the PEM line breaks; neither they nor the values read from Parameter Store are printed to the log, and the files are never uploaded as an artifact.
- [ ] Two Releases of one server pushed close together never deploy at once, and the newer one deploys, even when the older one is still waiting in the gate; Releases of different servers deploy at once.
- [ ] `workflow_dispatch` on a Release tag deploys that tag's target at its commit.
- [ ] `actionlint` reports nothing on `release.yml`.
- [ ] The first real run happens in ticket 08, since CI cannot reach AWS; `## Comments` lists the repository variables and the parameters the workflow reads, for ticket 07's runbook.
- [ ] `release.yml` carries the `#` AI-generated box with a row for this change (`CLAUDE.md`).
- [ ] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.

## Comments

- **2026-10-22:** The workflow reads Production's secret values from Parameter Store, not from GitHub: `SecureString` parameters under `/snunow/production/` named `main-db-password`, `match-db-password`, `access-token-private-key`, `access-token-public-key`, `worker-token`, `match-server-token`, `kakao-rest-api-key`, `openrouter-api-key`, and `initial-administrator-emails`. `deploy_role.tf` already lets the deploy role read them.
- **2026-10-22:** A Release is now a tag `snunow/<target>/YY.MM.DD-N` that deploys one server, or all five with `all`, in place of one `snunow-YY.MM.DD-N` tag that deployed everything. The workflow reads the results CI already produced for the tagged commit, and every CI job gates a Release, in place of calling CI through a `workflow_call` trigger with a project input that left out the admin and mobile checks. The deploy role's trust moved to `refs/tags/snunow/*`.
