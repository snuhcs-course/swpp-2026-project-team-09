# 07: The runbook, the tool guide, and the README changes

Parent: [A01 spec](../spec.md)
Status: resolved
Blocked by: 01, 02, 03, 04, 05, 06, 09, 10 (the names and commands the runbook describes)
Touches: `infra/production/README.md` (beyond ticket 01's, ticket 03's, and ticket 10's sections), the root `README.md`, and `admin/README.md`.

## What to build

A team member with an IAM user and no memory of the spec can set up their laptop and run Production from the runbook alone (spec: "Access and tools", "Moving to account B", "Production APK", and "Repository additions"):

- **The tool guide.** Installing the AWS CLI v2 from AWS's installer and kubectl, kubectx and kubens, k9s, Terraform, and Freelens from Homebrew or winget, on macOS and Windows. Signing in with `aws login` (AWS CLI 2.32 or newer), and how Terraform then gets the session, as ticket 03 found. `aws eks update-kubeconfig` with the context alias `snunow-production`, switching to it with kubectx, and `snunow` as its namespace with kubens. Opening it in Freelens, with Lens Personal as the alternative that needs a Lens ID. Reading logs, restarting a Deployment, and forwarding a port. kubectl kept within one minor version of the cluster.
- **The rules** for changing Production, as the spec lists them, and adding or removing a team member.
- **Logs** last only as long as their pod, so a tester's report is looked into the same day.
- **First setup**, in order: what ticket 03 did; the repository variables from `terraform output`; the parameters under `/snunow/production/` that ticket 03's database section did not put, each with `aws ssm put-parameter` as a `SecureString` (the Administrators' addresses as a `String`) and Production's own values (`openssl rand` for the tokens, `openssl genpkey` for the ES256 key pair, stored as PEM with real line breaks); the settings made by hand once in Google's and Kakao's consoles; the first Release, an `all` Release; the second apply with the records variable on; each Source's collection run once by hand in the worker pod.
- **Releases.**
  - Naming and tagging a reviewed commit of the iteration branch as `snunow/<target>/YY.MM.DD-N`: the five server targets, `main-server`, `socket-server`, `worker-server`, `match-server`, and `admin`, and `all`, which deploys all five at one commit and is used for the first deploy, a change that spans servers, and rolling a changed setting or secret value to every server.
  - Different servers may run different commits, so a change that spans servers is released in an order that keeps old and new versions working together, or with `all`.
  - Following the run in the Actions tab, including its wait for CI, which must pass in full on the tagged commit.
  - Fixing a bad Release with a new one; deploying an earlier Release again from the Actions tab, which deploys that tag's target at its commit and puts back that commit's shared part, never across a migration.
  - Rotating a secret with `aws ssm put-parameter --overwrite`, then an `all` Release.
- **Capacity.** Reading `kubectl top`, and raising the memory settings or the node size.
- **The Production APK**, built by hand with both server addresses set to `https://api.snunow.com` and debug signing; its commit tagged `snunow/app/YY.MM.DD-N`, which deploys nothing; and the APK, named after the tag with `/` as `-` (for example `snunow-app-26.11.13-1.apk`), attached to that tag's GitHub release page.
- **Moving to account B**, the spec's eight steps with the real commands, including the copy of every parameter under `/snunow/production/` from A to B.
- **Network policies.** Ticket 10's section of the runbook, kept in step with the rest: every pod that the runbook starts by hand and that reaches the database carries the label `database-client=true`, as psql (`kubectl run --labels=database-client=true`), the P3009 copy (labelled after `kubectl debug` makes it, since the copy keeps none of the pod's labels), and the database Job (`app=database-setup` and `database-client=true` in its pod template) already do. That includes the move's `pg_dump` and `pg_restore` pods. A pod that only needs a server's allowances is a `kubectl exec` into that server's pod, such as each Source's collection run by hand. A new connection is a change to the policies and to `k8s/test/allowed-connections.txt` in a pull request, then an `all` Release or a Release of each end's server, since a server's Release applies only the shared policies and its own.
- **Tearing down:** delete the Ingress before `terraform destroy`, or the ALB is left behind and keeps billing.
- **What CI does not cover**, with ticket 08 as where each item is checked.
- **The root README:** a Production paragraph in the Deployment section that points to the runbook; `infra/` and `.github/` in the Repository layout; the admin site's address in the limitations.
- **`admin/README.md`:** `https://admin.snunow.com` among the origins it lists.

Route 53 alias records have no TTL of their own; they answer with the ALB's 60 seconds. So step 3 of the spec's move, lowering the records' TTL to 60 seconds a few days ahead, has nothing to change for `api` and `admin`. The runbook confirms this against AWS's documentation and says so in place of that step.

## Acceptance criteria

- [x] Every command in the runbook names the real files, variables, outputs, repository variables, parameters, workflow, Kustomize targets, Job, and policy labels of tickets 01 to 06, 09, and 10, checked against the code.
- [x] Every pod that the runbook starts by hand and that reaches the database (psql, the P3009 copy, the database Job, and the move's `pg_dump` and `pg_restore` pods) carries `database-client=true`.
- [x] The tool guide covers each item above for both macOS and Windows, and states how Terraform reads the `aws login` session.
- [x] The move section has the spec's eight steps in order, with the TTL step handled as above, and says Users stay signed in and Redis starts empty.
- [x] The root README's changes and `admin/README.md`'s origin are in place, and the README's table of contents stays consistent.
- [x] Markdown files get no AI-generated box (`CLAUDE.md`).
- [x] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.

### Agent usage (2026-10-22)

- Agent time: about 15 minutes, an estimate, for the writer of the runbook and the README changes, and the orchestrating session's additions after tickets 05 and 10.
- Tokens, subagents included: input 106 new, 8.2 million read from the cache, and 208 thousand written to the cache; output 4 thousand.
