# Production on AWS

Status: needs-triage

## Problem Statement

From mid-November, people outside the team use SNU Now:

- user testing on 11/16 and 11/18;
- the beta test from 11/25 to 12/02;
- the final demo on 12/14.

The only shared system is the Dev Server (`GLOSSARY.md`), and it cannot carry them:

- It changes every time `development` moves, and it carries Demo Data.
- It answers in plain HTTP at the one host name that the course's ingress routes to its server. So the admin site cannot be deployed, because Google sign-in needs HTTPS.
- Its course server cannot run Kubernetes (ADR 0004).

The team wants a separate system with four properties:

- it changes only when the team decides;
- it runs on Kubernetes;
- it is built with Terraform;
- a CI/CD pipeline deploys it through Amazon ECR.

Two team members have new-account AWS credits, and a card pays beyond them.

## Solution

**Production** (`GLOSSARY.md`) runs on Amazon EKS in AWS's Seoul Region, as ADR 0006 records.

- **Infrastructure.** Terraform builds the network, the cluster, the database, the image registries, the certificate, and the access rules.
- **Releases.** A **Release** (`GLOSSARY.md`) is a tag named `snunow/<target>/YY.MM.DD-N` on a reviewed commit of the iteration branch, for example `snunow/main-server/26.11.13-1`.
  - The target is one of the five servers, `main-server`, `socket-server`, `worker-server`, `match-server`, or `admin` (the admin site), and the Release deploys only that one. Or it is `all`, which deploys all five at that commit.
  - The date is the day in Korea, and N is the target's order that day, from 1.
  - The servers are separate services, so different servers may run different commits.

  Pushing the tag starts a GitHub Actions workflow that:
  1. waits for CI's results on the tagged commit, and goes on only once every CI job has passed;
  2. builds the target's arm64 images and pushes them to ECR;
  3. applies the shared manifests and the target's own to the cluster;
  4. waits until the Deployments it deployed have rolled out.
- **Addresses.** Phones reach `https://api.snunow.com`. Administrators use the admin site at `https://admin.snunow.com`.
- **Data.** Production starts with only the seed data every system needs, the Places and the shuttle's stops. It never carries Demo Data.
- **Access.** Every team member has their own AWS login and cluster access, and works with kubectl, kubectx, k9s, and Freelens (the open-source Lens).
- **Cost.** About $144 per 30 days on one team member's account, paid from credits and then a card. If the money runs short, the whole system moves to the other team member's account without losing data or changing its addresses.
- **The Dev Server** and the laptop flow do not change.

## User Stories

1. As a participant in user testing, I want the app to reach one fixed HTTPS address that stays the same across test days, so that the APK I installed keeps working.
2. As a beta tester, I want my sign-in, my position, and my messages encrypted on the way to the servers, so that others on the same Wi-Fi cannot read them.
3. As a beta tester, I want to see only real people, Quests, and Events, so that what I try is what the service is.
4. As a developer, I want a Release to be one tag that any team member pushes on a reviewed commit of the iteration branch, naming the server it deploys or `all`, so that shipping takes one command.
5. As a developer, I want to release one server without deploying the others, so that a change to one server ships without restarting the rest.
6. As a developer, I want a Release whose commit has not passed every CI job not to deploy, so that a broken commit never reaches testers.
7. As a developer, I want to follow a Release's build and deployment in the Actions tab, with a failed rollout marking the run failed, so that I know whether Production runs my change.
8. As a developer, I want the tag's name to tell me what it deployed, the day it shipped, and its order among that day's Releases of the same target, so that I can tell Releases apart at a glance.
9. As a developer, I want to fix a bad Release with a new Release, and in an emergency to deploy a server's earlier Release again from the Actions tab, so that I can recover quickly.
10. As a developer, I want a Release to replace the servers without failed requests in between, so that testers do not notice it.
11. As a team member, I want my own AWS login with MFA, and no long-lived AWS key on my laptop, so that nobody shares a password and a lost laptop leaks nothing lasting.
12. As a team member, I want my own cluster access through `aws eks update-kubeconfig`, so that kubectl, kubectx, k9s, and Lens work against Production.
13. As a team member, I want one guide that installs and connects the tools, so that I set up my laptop without asking.
14. As a team member, I want to read a pod's logs and restart it from Lens, so that I can look into a problem at night.
15. As an Administrator, I want to open `admin.snunow.com` in any browser and sign in with Google as today, so that I can publish a Global Event from anywhere.
16. As an Administrator, I want the admin routes unreachable from the internet except through the admin site, so that nobody can call them directly.
17. As the team member who changes infrastructure, I want every AWS resource that the system needs in Terraform, applied from my laptop with shared state and a lock, so that two team members never apply at once and the system can be rebuilt.
18. As the team member who changes infrastructure, I want CI to check Terraform's format and validity, so that a broken configuration is caught in review.
19. As the team, I want neither an AWS key nor any of Production's secret values stored in GitHub, so that nothing leaked from GitHub reaches the account or Production.
20. As the team, I want a cost alert at every $50 actually spent, credits included, so that the credits never run out unnoticed.
21. As the team, I want the database backed up every day and restorable to any moment of the last 7 days, so that a bad migration does not lose the week's data.
22. As the team, I want EKS to replace a failed node by itself, so that a hardware fault during the beta stops the app for minutes at most.
23. As the team, I want to change the node size with one variable, so that a shortage of memory is a one-line fix.
24. As the team, I want to move Production to the other team member's AWS account without losing data or changing its addresses, so that the second account's credits can pay for it.
25. As a tester, I want each Production APK on a GitHub release page, so that I can install it from my phone.
26. As a developer, I want the Dev Server and the laptop Compose flow unchanged, so that day-to-day work goes on as before.
27. As a reviewer, I want the manifests rendered in CI, so that a Release does not fail on a mistake that review could catch.
28. As a reader of the repository, I want the root README to point to Production's runbook, so that I find it from the place I already read.

## Implementation Decisions

### Accounts and money

- **Account A** is a team member's account on the Paid plan with $200 of credits. Production lives there from the start.
- **Account B** is the other team member's account, used only if the money runs short.
  - It signs in with a root user, so it was made through the sign-up flow that lets the Region be chosen. (The newer flow pins Korean accounts to Sydney.)
  - It switches to the Paid plan before Production moves there.
- **Plans.** The Paid plan keeps the credits and bills a card beyond them. The Free plan is not used: EKS on it is undocumented, and it suspends the account when the credits run out.
- **No AWS Organizations.** A Free Tier account that joins one loses its credits, and an organization benefits from one account's credits only.
- **Region:** `ap-northeast-2`.
- **Budget alert.** One AWS Budgets cost budget that counts gross spend, not net of credits (`include_credit` off). Its period runs from the first apply to 2026-12-31, so that it does not reset each month. It sends actual-cost alerts at $50, $100, $150, $200, $250, and $300 to all four team members. Reaching $150 is the cue to decide whether to move.
- **Domain.** `snunow.com`, registered by hand in Route 53 in account A before the first apply, and paid by card ($16 a year; credits cannot pay for domain registration). Registration creates the hosted zone, which stays in A. Terraform reads the zone and never creates it. The registrant's email is verified within 15 days, or the domain is suspended.

Expected cost per 30 days, at Seoul's prices on 2026-10-22:

| Part | Cost | Note |
|---|---|---|
| EKS control plane | $72.00 | Control-plane logging and the module's KMS key are turned off |
| 2 × `t4g.small` | $14.98 | The T4g free trial is expected to cover one node until 2026-12-31; $29.95 without it |
| 2 node public IPv4 addresses | $7.20 | |
| 2 × 20 GB node root volumes | $3.65 | |
| ALB and its 2 public IPv4 addresses | $23.40 | |
| ALB capacity units | about $1 | |
| RDS `db.t4g.micro` and 20 GB | $20.62 | |
| ECR and the hosted zone | about $1 | |
| **Total** | **about $144** | about $159 without the free trial |

Account A's credits last until about 12/07. The rest of the course then costs about $30 on the card, unless Production moves to account B.

### Network

- **VPC.** One VPC over two Availability Zones, `a` and `c`:
  - a public subnet in each, for the nodes and the load balancer, tagged for the load balancer controller and set to give each instance a public IPv4 address (`map_public_ip_on_launch`);
  - a database subnet in each, with no route to the internet.
- **No NAT gateway.** Each node's public IPv4 address lets it pull from ECR and reach Kakao, Google, OpenRouter, and the SNU sites that the worker reads.
- **Security groups.**
  - The nodes accept traffic only from the load balancer, from the cluster, and from each other.
  - The database accepts port 5432 only from the nodes.
- **Why two zones.** EKS needs its cluster subnets in two zones, and an ALB and an RDS subnet group need two as well.

### Cluster

- **Version.** EKS on a Kubernetes version under standard support, 1.36 or newer, so that the cluster never pays the extended-support fee.
- **API endpoint.** Public, so that team members' laptops and GitHub's runners reach it.
- **Authentication mode:** access entries.
  - Each team member's IAM user has an entry with `AmazonEKSClusterAdminPolicy`.
  - The Release workflow's role has an entry with `AmazonEKSAdminPolicy` limited to the `snunow` namespace. So the manifests the workflow applies contain no cluster-wide objects: Terraform creates the namespace.
- **Turned off.** Control-plane logging and the module's KMS key for Secrets are off. Both cost money, and the course needs neither.
- **Nodes.**
  - One managed node group of two on-demand `t4g.small` nodes, one in each zone.
  - They use the ARM64 Amazon Linux 2023 AMI type and 20 GB root volumes.
  - Node auto repair is on, so EKS also replaces a node that stops reporting Ready, not only one whose instance fails.
  - The instance type is a single Terraform variable. EKS cannot change a node group's instance type in place, so a change replaces the node group. The module creates the new group before it deletes the old one.
- **Add-ons:** `vpc-cni`, `coredns`, `kube-proxy`, and `metrics-server`, so that `kubectl top` and Lens show memory.
- **AWS Load Balancer Controller.** Terraform installs it with one replica. Its IAM role comes through IRSA, because EKS Pod Identity would add an agent pod on every node, and a `t4g.small` holds 11 pods.
- **Pod budget.**
  - Two nodes leave 18 pod slots after the per-node daemons.
  - The steady state is 13 pods: 8 of the app, 2 of `coredns`, 2 of `metrics-server`, and the controller.
  - Deploying `main-server`, `socket-server`, and `admin` adds one surge pod each, which makes 16 when all three deploy at once. `worker-server` and `match-server` use the `Recreate` strategy, so a Release never runs two of them.
- **Losing a node.** One `t4g.small` cannot hold every pod.
  - The two-replica servers keep one pod on the surviving node.
  - The single-replica pods on the lost node, for example Redis, wait until EKS replaces the node, usually within minutes.
  - If that proves too long, the instance type is raised.
- **Readiness gates.** Terraform labels the `snunow` namespace `elbv2.k8s.aws/pod-readiness-gate-inject: enabled` when it creates it. A new pod then counts as ready only once the ALB finds it healthy, so a rollout never leaves the load balancer without a healthy target.
- **Namespace:** the app runs in `snunow`.

### Database

- **Engine and size.** RDS for PostgreSQL 18, at its newest minor version, on `db.t4g.micro`. Single-AZ, placed in zone `a`, with 20 GB of gp3 storage.
- **Backups.** Automated, kept 7 days (set explicitly; the API's default is 1), with point-in-time restore. There are no snapshots before Releases. Destroying the instance keeps a final snapshot.
- **Access.** The database is not publicly accessible. Terraform generates the master password and keeps it in the state.
- **Setup.** A one-off Kubernetes Job creates the `main` and `match` roles and databases, as `infra/postgres/init-databases.sh` does on laptops.
  - A team member runs it by hand from the runbook, as the master user.
  - The master user on RDS is not a superuser. Before each `CREATE DATABASE … OWNER`, the Job grants the new role to the master user, which PostgreSQL 16 and later require.
  - It also creates the PostGIS extension in `main`. Creating an extension needs `rds_superuser`, which only the master user has. The main server's first migration then finds PostGIS present.
  - The Job is kept apart from every Kustomize target, because the workflow's role cannot run it and it runs once per database.
- **TLS.** RDS for PostgreSQL 15 and later requires TLS by default. The main and match servers connect through two clients that read `DATABASE_URL` differently:
  - At run time, `@prisma/adapter-pg` (node-postgres) treats `sslmode=require` and `verify-full` alike: it verifies against Node's CA list, which lacks the RDS CAs.
  - `prisma migrate` runs Prisma's schema engine, which knows only `disable`, `prefer`, and `require`.
  - So the main and match images include the RDS global CA bundle, and `NODE_EXTRA_CA_CERTS` points at it. `DATABASE_URL` ends in `?sslmode=verify-full`. node-postgres then verifies the certificate and host name, and the schema engine falls back to `prefer`, which still negotiates TLS.
  - The database ticket confirms the form by starting a main-server pod (migration, seed, ready) against the real instance before the workflow ticket writes it.
- **Migrations.** The main and match servers keep migrating when they start, as today, and the main server keeps loading the seed.
  - With two main-server pods, the second waits on Prisma's advisory lock for up to 10 seconds, then exits and is restarted. That is safe.
  - A pod that starts before the database answers also exits and is restarted. That restart is the retry ADR 0004 asks for.
  - A migration killed halfway leaves Prisma refusing to start (P3009). The runbook says how to resolve it with `prisma migrate resolve` from a one-off pod.

### Workloads

**Manifest layout**

The manifests live in `infra/production/k8s/`, written for Kustomize in parts:

- **The shared part:** the ConfigMap and the Secret that the generators make, the Ingresses, and Redis.
- **A part per server:** its Deployment and Service, for each of the five servers.
- **Six targets.** Each server's target renders the shared part and that server's part. `all` renders everything, which the five jobs of an `all` Release apply between them. A server's Release applies its target, so the shared part goes out with every Release.
- **Generated names.** The ConfigMap's and the Secret's names carry a hash of their content, and every reference in a render uses that name.
  - A server takes up a changed setting or secret value when it is next deployed, and an `all` Release rolls the change to every server.
  - After a successful rollout, the generated ConfigMaps and Secrets that no pod uses any more are deleted.
- **The database Job** stays outside every target (see "Database").

**What runs**

| Deployment | Replicas | Port | Strategy | Notes |
|---|---|---|---|---|
| `main-server` | 2 | 3000 | rolling | |
| `socket-server` | 2 | 3001 | rolling | |
| `worker-server` | 1 | 3002 | `Recreate` | One worker instance, as the worker's README requires |
| `match-server` | 1 | 3003 | `Recreate` | |
| `redis` | 1 | 6379 | rolling | `redis:8` with `noeviction` and no volume, as on the Dev Server; its image does not change with Releases |
| `admin` | 1 | 3100 | rolling | The port the site uses in the repository |

- **Services.** Each Deployment has a ClusterIP Service of the same name, so that the in-cluster addresses match Compose's.
- **Service links off.** Pods set `enableServiceLinks: false`. Otherwise the Service named `redis` would inject `REDIS_PORT=tcp://…` into every pod.
- **Probes.**
  - All five are live on `/health/live` and ready on `/health/ready`. The admin site gains these two routes (below).
  - Each server also has a startup probe that allows 5 minutes, so that a first migration and seed are never killed by the liveness probe.
- **Stopping.** Each server sleeps a few seconds in a `preStop` hook, so that the ALB stops sending to it before it exits.
- **Placement.** The two-replica Deployments spread over the two zones.
- **Memory.** Each container sets a memory request and limit that keep the system inside two `t4g.small` nodes. The first week's `kubectl top` decides whether to raise them or the node size.
- **No demo services.** `demo-seed`, `demo-walker`, and `demo-menus` do not run in Production.
- **Starting empty.** The worker collects nothing when it starts. So after the first Release a team member runs each Source's collection once by hand, from the runbook.

**Settings**

- **Per Deployment:** `PORT`.
- **Shared values.** Values that are not secret live in a ConfigMap in the repository:
  - `PUBLIC_URL=https://api.snunow.com`;
  - `REDIS_HOST=redis` and `REDIS_PORT=6379`;
  - `MAIN_SERVER_URL=http://main-server:3000` and `MATCH_SERVER_URL=http://match-server:3003`;
  - `ROUND_INTERVAL_SECONDS=60` and `ASSISTANT_MODEL`;
  - `GOOGLE_APP_CLIENT_ID` and `GOOGLE_ADMIN_CLIENT_ID`, the team's;
  - `ANDROID_CERTIFICATE_FINGERPRINTS`, the debug key's fingerprint, since the APK is debug-signed.
- **Secret values** live in AWS Systems Manager Parameter Store in the account that runs Production, as `SecureString` parameters under the path `/snunow/production/`, encrypted with the AWS managed key `aws/ssm` at no cost:
  - `main-db-password` and `match-db-password`, the `main` and `match` database passwords;
  - `access-token-private-key` and `access-token-public-key`, the access-token key pair, stored as PEM with real line breaks (a Kubernetes Secret passes `\n` through literally, and Node rejects that key);
  - `worker-token` and `match-server-token`, for `WORKER_TOKEN` and `MATCH_SERVER_TOKEN`;
  - `kakao-rest-api-key` and `openrouter-api-key`, for `KAKAO_REST_API_KEY` and `OPENROUTER_API_KEY`;
  - `initial-administrator-emails`, for `INITIAL_ADMINISTRATOR_EMAILS`.
- **Entering them.** A team member puts each value in by hand with `aws ssm put-parameter --type SecureString`, and `--overwrite` replaces one. Terraform never holds them; it only lets the deploy role read the path. They stay out of Terraform for three reasons: `terraform destroy` does not delete them, moving to account B copies the same values, and the Kakao and OpenRouter keys are entered by hand in any case.
- **Writing the Secret.** On each Release, the workflow reads the path with the deploy role and writes the values to the files that Kustomize's `secretGenerator` reads, which make the Secret. The Secret's name carries a hash of its content, so a server takes up a changed value when it is next deployed, and an `all` Release rolls it to every server. No External Secrets Operator runs in the cluster, because its three pods would bring a Release to 19, over the 18 pod slots (see "Pod budget"). Rotating a secret is `aws ssm put-parameter --overwrite`, then an `all` Release.
- **Database addresses.** The workflow assembles each server's `DATABASE_URL` from its password, the database endpoint, and the TLS setting above.
- **Own values.** Production generates its own values, never the Dev Server's, the way the Dev Server's bootstrap does: `openssl rand` for the tokens and passwords, and `openssl genpkey` for the ES256 key pair.

**Admin site**

- **Health routes.** The site gains `/health/live` and `/health/ready`, two Route Handlers that answer `GET` without a session, as the worker's do:
  - `/health/live` answers 200 while the process runs.
  - `/health/ready` answers 200 when the main server's `/health/live` answers, and 503 otherwise, since every page of the site reads from the main server.
  - Both answer in the servers' JSON shape (`status` `ok` or `error`) and are never cached.
- **Build.**
  - A new `admin/Dockerfile` builds the Next.js site with standalone output on `node:24-slim`. This needs `output: 'standalone'` in `admin/next.config.ts`, copies `public` and `.next/static` into the image, and adds an `admin/.dockerignore` like the servers' ones.
  - `NEXT_PUBLIC_GOOGLE_CLIENT_ID` and `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY` are build arguments, read from repository variables. Both are public values, fixed at build time.
- **Run time.**
  - `MAIN_SERVER_URL=http://main-server:3000`, so that the site reaches the main server inside the cluster, never through the load balancer.
  - `HOSTNAME=0.0.0.0`, because Kubernetes sets `HOSTNAME` to the pod's name and the standalone server binds to it.
  - The site's `__Host-` session cookie needs HTTPS, which `admin.snunow.com` has.

### Entry: load balancer, domain, and certificate

- **One internet-facing ALB.** The AWS Load Balancer Controller creates it from the Ingress resources, which share one IngressGroup, with IP targets.
  - Port 80 redirects to 443.
  - On port 443, the controller finds the ACM certificate from the Ingress hosts, so the manifests carry no certificate ARN. Terraform requests one certificate for `api.snunow.com` and `admin.snunow.com` and validates it in the zone.
- **Rules for `api.snunow.com`**, in this order:
  1. `/socket.io/*` goes to `socket-server`.
  2. Every path under `/admin/` gets a fixed 404.
  3. Everything else goes to `main-server`.
- **Case-sensitive admin routes.** ALB path patterns are case-sensitive, but Express routes are not by default. So the main server turns on case-sensitive routing, and `/ADMIN/...` cannot reach the admin routes past the 404 rule. The Administrator token check stays the routes' real guard.
- **Rules for `admin.snunow.com`:** everything goes to `admin`.
- **Health checks.** The ALB checks every target on `/health/ready`.
- **WebSockets.** The app opens socket.io with the WebSocket transport only (`mobile/src/live/connection.ts`), so two socket-server pods need no sticky sessions. The ALB's 60-second idle timeout is longer than socket.io's 25-second ping.
- **DNS records.** `api` and `admin` are alias records to the ALB in the zone.
  - The controller creates the ALB at the first Release, so the records come in a second apply. A Terraform variable that is off on the first apply turns on the ALB lookup (by the IngressGroup's tag) and the two records.
  - An Ingress deleted and created again gives a new ALB, and the same apply points the records at it.
- **Set by hand once.**
  - `https://admin.snunow.com` is added to the admin Google client's authorized JavaScript origins, and to the Kakao JavaScript key's site domains.
  - The Kakao REST key has no allowed-IP list, because node addresses change whenever a node is replaced.
  - The Google OAuth consent screen is published, so that accounts outside the team can sign in.

### Images and ECR

- **Repositories.** Five private ECR repositories: `main-server`, `socket-server`, `worker-server`, `match-server`, and `admin`.
- **Which images.** A Release builds only its target's images: one for a server, all five for `all`.
- **Tags.** Each image is tagged with its commit SHA and with the Release's tag name without `snunow/` and with `/` as `-`, since ECR tags cannot hold `/`: for example `main-server-26.11.13-1`, or `all-26.11.13-2` on each of the five images.
- **Cleanup.** A lifecycle rule keeps the newest 10 images in each repository.
- **Architecture.** Images are built for `linux/arm64` on GitHub's arm64 runners. The manifests ticket checks that every image, and every native dependency in it, runs on arm64.

### The Release workflow

- **Trigger.** `.github/workflows/release.yml` starts on a pushed tag matching `snunow/**`, except `snunow/app/**`, which marks a Production APK (below). It also runs by hand (see "Deploying an earlier Release again").
- **Name check.** Its first step checks the full name, `snunow/<target>/YY.MM.DD-N`:
  - the target is `main-server`, `socket-server`, `worker-server`, `match-server`, `admin`, or `all`;
  - the year has two digits, the month runs from 01 to 12, and the day from 01 to 31;
  - N counts from 1.

  A name that does not match fails the run, for example `snunow/web/26.11.13-1` or `snunow/main-server/26.11.13`.
- **Which commits.** Tags go on reviewed commits of the iteration branch. This is a team rule; the workflow does not check it.
- **Order across servers.** Different servers may run different commits. So a change that spans servers is released in an order that keeps the old and new versions working together, for example the main server's new route before the match server that calls it, or as one `all` Release.
- **The gate.** The workflow does not run or call CI. Before any AWS step, it reads the results that CI produced for the tagged commit, as the Dev Server's deploy does (`infra/deploy/deploy.sh`):
  - Every CI job counts: the server projects, `admin`, `mobile`, `flow-tests`, and the rest of `ci.yml`'s jobs.
  - One successful run of a job is enough, since a commit pushed to a branch and then tagged has a CI run for each push.
  - While a job is still queued or running, the gate waits.
  - A job that failed with no successful run, or no result within a time limit, fails the run.

  CI runs on the tag push too, because its `on: push` takes tags, so a tagged commit always gets results. CI gains no trigger and no input for Releases.
- **AWS access.**
  - The workflow assumes the deploy role with `aws-actions/configure-aws-credentials@v6` and logs in to ECR with `aws-actions/amazon-ecr-login@v2`. Its permissions are `id-token: write`, `contents: read`, and `actions: read`, the last to read CI's results.
  - The deploy role trusts `token.actions.githubusercontent.com` with `aud` equal to `sts.amazonaws.com` and `sub` like `repo:snuhcs-course@139540821/swpp-2026-project-team-09@1374366029:ref:refs/tags/snunow/*` (`StringLike`). This repository uses GitHub's immutable subject claims.
  - The role may get an ECR login token, which cannot be limited to repositories; describe and push images in the five repositories; read the parameters under `/snunow/production/`; and describe the cluster. Its cluster rights come from its access entry.
  - The AWS managed key `aws/ssm` lets every principal in the account decrypt, so the role needs no KMS permission to read the parameters.
- **Build and push.** The workflow builds the target's images and pushes each with the two tags of "Images and ECR". An image whose commit-SHA tag is already in its repository is not built again, but still gets the Release's tag.
- **Deploy.** Each server that the Release deploys gets a job of its own, so an `all` Release runs five. Each job:
  1. reads the parameters under `/snunow/production/` and generates the Secret from them;
  2. sets its server's image to the commit SHA with Kustomize, and applies its server's target, the shared part and that server's part;
  3. waits on `kubectl rollout status` for its server's Deployment only, with a time limit longer than the startup probe's; a Deployment that does not become ready fails the run;
  4. after a successful rollout, deletes the generated ConfigMaps and Secrets that no pod uses any more.
- **One at a time per server.** Each server has a fixed concurrency group, for example `release-main-server`, with `cancel-in-progress`.
  - A newer Release of a server cancels that server's running one, and different servers deploy at once.
  - An `all` Release runs each server's job in that server's group, so a later Release of one server cancels only that server's job.
  - Cancelling never cuts a migration, which runs in the pods, not in the workflow.
- **Deploying an earlier Release again.** A team member runs the workflow by hand from the Actions tab on that Release's tag (`workflow_dispatch`), which has no age limit. It deploys the tag's target at the tag's commit. The shared part goes out with it, so that commit's Ingresses and Redis come back too. Migrations only move forward, so after a Release with a migration, a fix is a new Release instead.
- **Settings the workflow reads.** It reads its AWS settings from repository variables: the Region, the role ARN, the cluster name, the registry, and the database endpoint. A team member sets them from `terraform output`, and moving accounts changes them. The admin site's two public build arguments are repository variables too. Every secret value comes from Parameter Store, so GitHub holds no Production secret.
- **GitHub release pages.** The workflow does not create GitHub release pages. The only ones are the Production APKs', made by hand (below).

### Terraform

- **Layout.** One root configuration in `infra/production/terraform/`:
  - Terraform 1.11 or newer and the AWS provider v6;
  - `terraform-aws-modules/eks` v21 and `terraform-aws-modules/vpc` v6;
  - the Helm provider, which installs the load balancer controller.
- **State.** An S3 bucket per account, with `use_lockfile`. A short bootstrap in the runbook creates the bucket once.
- **Files per account.**
  - Each account has a committed backend settings file.
  - It also has a variables file that is not committed, because it names people: the team members' IAM users and the budget's email addresses. The runbook keeps a copy of it in the state bucket.
- **Who applies.** Any team member applies from a laptop with their own IAM user, which is in the access list. The lock file stops two applies at once.
- **What Terraform holds:**
  - the VPC;
  - the cluster with its node group, add-ons, controller, namespace, and access entries;
  - the database;
  - the ECR repositories;
  - the deploy role and its GitHub OIDC provider;
  - the certificate and, in the account that holds the zone, the DNS records;
  - the budget.
- **IAM users.** They are not in Terraform, so that no password or key lands in the state. A move or a teardown never deletes them either.
- **Secret values.** They are not in Terraform either (see "Settings"); it only lets the deploy role read their path.
- **Outputs:** what the repository variables and the database Job need.
- **CI.** A `terraform` job runs `terraform fmt -check` and `terraform validate` without a backend or AWS credentials.

### Access and tools

- **IAM users.**
  - The account's owner creates an IAM user for each team member by hand: `AdministratorAccess`, a console password that must be changed at first sign-in, and MFA required.
  - Each team member signs in to the CLI with `aws login` (AWS CLI 2.32 or newer), which keeps short-lived credentials from the console sign-in. No long-lived access key sits on a laptop. The guide ticket confirms that Terraform's AWS provider reads that session, and otherwise exports it with `aws configure export-credentials`.
- **Tools.** All are free for the team:
  - the AWS CLI v2, kubectl, kubectx and kubens, and k9s are open source;
  - Terraform's licence allows a team's use for its own infrastructure;
  - Freelens is the default desktop app: open source (MIT), maintained, and with no account;
  - Lens Personal is free for students too, but every team member would need a Lens ID.
- **Versions.** kubectl stays within one minor version of the cluster, so each laptop updates it when the cluster's version is raised. Terraform's version and the providers' versions are pinned in the configuration and its committed lock file.
- **Tool guide.** A guide in the runbook covers:
  - installing the tools on macOS and Windows: the AWS CLI from AWS's installer, the rest from Homebrew or winget;
  - `aws login`, then `aws eks update-kubeconfig` with the context alias `snunow-production`;
  - switching to it with kubectx, and setting `snunow` as its namespace with kubens;
  - opening it in Freelens;
  - reading logs, restarting a Deployment, and forwarding a port.
- **Rules.** The guide also states how Production is changed:
  - looking and restarting from Freelens, k9s, or kubectl is fine;
  - manifests change only through a pull request and a Release, since a Release overwrites changes made by hand;
  - infrastructure changes through a pull request, then `terraform apply`;
  - secret values change with `aws ssm put-parameter --overwrite`, then an `all` Release rolls them to every server;
  - adding a team member is an IAM user, an entry in the variables file, and an apply; removing one reverses those steps.
- **Logs.** A pod's logs last only as long as the pod: a Release replaces the pods and their logs, and `kubectl logs --previous` shows only the last crash. The guide says so, so that a tester's report is looked into the same day.

### Moving to account B

Only if the money runs short, and at a quiet time, not during user testing or the beta. The runbook lists:

1. Switch B to the Paid plan. Create the state bucket and B's variables file.
2. In B, `terraform apply` with B's files. B's apply requests its certificate without waiting for validation, and outputs the validation record. Add that record to A's zone by hand, and wait until the certificate is issued.
3. Lower the `api` and `admin` records' TTL to 60 seconds, a few days ahead.
4. Copy every parameter under `/snunow/production/` from A to B: read them in A with `aws ssm get-parameters-by-path --with-decryption`, and put each in B with `aws ssm put-parameter --type SecureString`.
5. Run the database Job in B; the runbook's steps for it put B's new database passwords over the copied ones. Set the repository variables to B's outputs, push an `all` Release, which deploys all five servers to B at one commit, and scale B's servers to zero once it has rolled out.
6. Scale A's servers to zero. Dump A's two databases with `pg_dump -Fc` from a `postgres:18` pod in A's cluster. Copy the dumps through a laptop into a pod in B's cluster, and `pg_restore` them there. Then scale B's servers up. The app is down for 10 to 30 minutes, and no write is lost.
7. In A's zone, point `api` and `admin` at B's ALB, by hand. With the validation record, the move edits three records by hand.
8. In A, remove the two records from Terraform's state with `terraform state rm`. Delete the Ingress, then `terraform destroy`. The hosted zone, the domain, and A's parameters stay. Account A stays open, because closing it deletes the domain, and its owner edits the zone from then on.

Sessions live in the database, and the token keys stay the same because the parameters are copied, so Users stay signed in. Redis starts empty, as after any restart.

### Production APK

- A team member builds the APK by hand, as today, with `EXPO_PUBLIC_MAIN_SERVER_URL` and `EXPO_PUBLIC_SOCKET_SERVER_URL` set to `https://api.snunow.com`, and with debug signing.
- They tag the commit it was built from `snunow/app/YY.MM.DD-N`, where N is the app's order that day, and attach the APK to a GitHub release page created for that tag. The APK is named after the tag with `/` as `-`, for example `snunow-app-26.11.13-1.apk`.
- The app tag deploys nothing. The Release workflow does not run for it, and it is not a Release.
- `usesCleartextTraffic` stays on, because the Dev Server is HTTP.

### Repository additions

- `infra/production/`:
  - `terraform/`;
  - `k8s/`, with the shared part, a part per server, the six targets, and, apart from them, the one-off database Job;
  - `README.md`, the runbook and the tool guide.
- The admin site's `Dockerfile` and `.dockerignore`, `output: 'standalone'` in its Next.js configuration, and its two health routes.
- Case-sensitive routing in the main server.
- `.github/workflows/release.yml`.
- `.github/workflows/ci.yml`: a `terraform` job, and a `manifests` job that renders every target. Its trigger stays as it is.
- **The root README:**
  - a Production paragraph in the Deployment section, pointing to the runbook;
  - `infra/` and `.github/` in the Repository layout;
  - the admin site's address in the limitations.
- `https://admin.snunow.com` among the origins that `admin/README.md` lists.

### Repository rules

- **AI-generated boxes.** Every new or changed source file carries the AI-generated box of dated rows that `CLAUDE.md` describes.
  - Terraform, YAML, the Dockerfile, and shell files use `#`.
  - Markdown files and `.terraform.lock.hcl`, a lockfile, get none.
- **Usage.** When a ticket is finished, its agent time and tokens go under the ticket's `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.

## Testing Decisions

A good test drives a piece the way it is used: it renders the manifests the cluster would receive, or it checks Terraform the way `apply` would read it. It does not assert on a file's text.

**In CI on every push**

- `terraform fmt -check` and `terraform validate`.
- `kubectl kustomize` renders each of the six targets, each server's and `all`, without error.
- The admin site's health routes, tested against the built site with a fake main server, as its other tests run: `/health/live` answers 200 without a cookie; `/health/ready` answers 200 while the fake main server is live and 503 once it stops.
- The existing server and flow tests keep guarding the code that a Release ships.

**Checked by hand in the operations tickets**

The first apply, real Releases, and the console settings happen against AWS, which CI does not reach.

- **Before building.** Account A's service quotas allow four `t4g.small` instances at once (a node group replacement) and an ALB.
- **First setup.** The first apply, the database Job, the first Release (`all`), and the second apply that adds the DNS records.
- **From a phone off the campus network:**
  - `https://api.snunow.com/health/ready` answers;
  - the app signs in;
  - a walking route and an Assistant answer work;
  - a WebSocket stays open for more than three minutes.
- **From a laptop outside AWS:**
  - `https://api.snunow.com/admin/administrators` and `/ADMIN/administrators` answer 404;
  - `admin.snunow.com` signs an Administrator in and publishes a Global Event.
- **Collections.** Every Source's collection, run once by hand in the worker pod, succeeds from AWS's addresses.
- **Access.** Each team member reaches the cluster with kubectl and Lens.
- **Releases.**
  - A Release of one server causes no failed request while its pods change, and leaves the other servers' pods as they were.
  - A Release whose commit's CI fails does not deploy.
  - A tag with a malformed name fails at the name check, before any AWS step.
  - An app tag starts no Release.
- **Budget.** The budget's first alert reaches the team.

## Out of Scope

- **The Dev Server:** any change to it, to its runbook's procedures, or to the laptop Compose flow.
- **APKs:** building the APK in CI, release signing, and store distribution.
- **Extra login layers:** a gate in front of the admin site, such as Cognito or Cloudflare Access.
- **Deployment and capacity alternatives:**
  - Argo CD or any pull-based deployment;
  - a NAT gateway and private nodes;
  - Spot instances, Fargate, ECS, and autoscaling.
- **Managed or redundant data:** ElastiCache, Multi-AZ RDS, and snapshots before Releases.
- **Monitoring stacks:** Prometheus, Grafana, and CloudWatch Container Insights.
- **Approvals and enforcement:** GitHub environments with required approvals, and rulesets that enforce which commits may be tagged.
- **Invite Links and Android App Links.**

## Further Notes

- **Schedule.** This is Iteration 2's unexpected task A1 (folder `A01`), and its implementation continues into Iteration 3. The workers are 윤유상 and 김태현. Production must answer before the user-testing submission on 11/13.
- **Tickets.** The nine tickets in `issues/` are built together on one integration branch with `/implement-spec` and merged as one pull request. Ticket 03's steps by hand (the first apply and the database check in account A) come before ticket 05, and ticket 08 is the operations ticket after the merge; both need a team member with account A's access.
- **Later, when wanted:**
  - lower the cost after the beta by scaling the nodes to zero and stopping the database until the final demo;
  - raise the node size if memory runs short, or if a lost node stops the app for too long;
  - add a GitHub environment with required reviewers, or a tag ruleset;
  - build the APK in CI.
- **Sources.** The facts and prices behind this spec, with their sources, are in `.scratch/research/aws-production.md`.
