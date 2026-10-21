# 05: The Release workflow and CI's call for it

Parent: [A01 spec](../spec.md)
Status: ready-for-agent
Blocked by: 03 (the confirmed `DATABASE_URL` form and the database output), 04 (the manifests and the admin image). Tickets 01 and 02 come before 03.
Touches: `.github/workflows/release.yml` (new) and `.github/workflows/ci.yml` (its trigger, its input, and which jobs run when called). Nothing else.

## What to build

Pushing a tag named `snunow-YY.MM.DD-N` deploys that commit to Production, and the run in the Actions tab shows whether it worked (spec: "The Release workflow", "Images and ECR", and "Settings"):

1. **Name check.** The first step checks the full name: a two-digit year, month 01 to 12, day 01 to 31, and N from 1. Any other name fails the run.
2. **Server checks.** The workflow calls CI for `main-server`, `socket-server`, `worker-server`, `match-server`, and `flow-tests` on the tagged commit and continues only if all of them pass. CI gains a `workflow_call` trigger with an input listing the projects; when the input is set, its matrix runs only those, and its other jobs are skipped.
3. **AWS access.** `aws-actions/configure-aws-credentials@v6` assumes the deploy role, and `aws-actions/amazon-ecr-login@v2` logs in to ECR. The permissions are `id-token: write` and `contents: read`.
4. **Build and push.** The five images are built for `linux/arm64` on GitHub's arm64 runners and pushed with two tags, the commit SHA and the Release's name. An image whose commit-SHA tag is already in its repository is not built again, but still gets the Release's tag. The admin image takes its two public build arguments from repository variables.
5. **Deploy.** The secret values come from the `PRODUCTION_` repository secrets into the env file that ticket 04's `secretGenerator` reads, with the access-token key pair as PEM with real line breaks, and each server's `DATABASE_URL` assembled from its password, the database endpoint, and `?sslmode=verify-full`. Kustomize sets the images to the commit SHA, and the result is applied. Then `kubectl rollout status` waits on each Deployment, with a time limit longer than the 5-minute startup probe; one that does not become ready fails the run.
6. **One at a time.** A concurrency group with its own fixed name, not CI's, that never cancels a running deploy, so a newer waiting Release replaces an older waiting one.
7. **Deploying an earlier Release again.** `workflow_dispatch`, run from the Actions tab on that Release's tag.

The workflow reads the Region, the role ARN, the cluster name, the registry, and the database endpoint from repository variables. It creates no GitHub release page.

## Acceptance criteria

- [ ] The name check accepts `snunow-26.11.13-1` and `snunow-26.11.13-12`, and refuses `snunow-26.13.01-1`, `snunow-26.11.32-1`, `snunow-26.11.13-0`, `snunow-26.11.13`, and `snunow-2026.11.13-1`. `## Comments` says how this was checked.
- [ ] On a push, CI runs the same jobs as before, and its check runs keep their names, which the Dev Server's deploy gate reads.
- [ ] Called with the project input, CI runs only those projects and skips its other jobs; a failing one stops the Release before any AWS step.
- [ ] No AWS key is stored in GitHub; the only AWS access is the OIDC role.
- [ ] The build step skips an image whose commit is already pushed and still tags it with the Release's name.
- [ ] The secrets env file keeps the PEM line breaks, is never printed to the log, and is never uploaded as an artifact.
- [ ] The deploy fails the run when any Deployment does not finish rolling out within its limit.
- [ ] Two Releases pushed close together never deploy at once, and the newest one deploys.
- [ ] `workflow_dispatch` on a Release tag deploys that tag's commit.
- [ ] `actionlint` reports nothing on both workflow files.
- [ ] The first real run happens in ticket 08, since CI cannot reach AWS; `## Comments` lists the repository variables and the `PRODUCTION_` secrets the workflow reads, for ticket 07's runbook.
- [ ] Both workflow files carry the `#` AI-generated box with a row for this change (`CLAUDE.md`).
- [ ] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.
