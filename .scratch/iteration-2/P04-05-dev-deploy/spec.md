# P04-05: Deploy development to the Dev Server

Status: ready-for-agent

## Problem Statement

The servers run only on laptops. Checking the app against them means every tester starts Docker, fills in settings and points a phone at their own computer, and two testers never see the same data. The course gave the team two Ubuntu servers, A and B, in October 2026, and nothing runs on either yet. The schedule has two tasks for this: P4 "Connect backend to the server" (윤유상, integration) and P5 "Deploy to dev environment" (김태현). They are one piece of work, because the servers cannot be shown to run on the machine without the deployment that puts them there, and the deployment cannot be checked without the servers running. This spec covers both; the schedule's two rows get the same final commit.

## Solution

Server B becomes the **Dev Server** (`GLOSSARY.md`). It runs the four servers, PostgreSQL, Redis and a reverse proxy under Docker Compose, with Demo Data, at `http://swpp26t09.147-46-242-174.sslip.io`. It keeps itself current: every minute it looks at the `development` branch on GitHub and, when the tip has moved and that commit's server checks have passed, rebuilds and restarts what changed (ADR 0003). Nothing pushes to it. A phone with a development build or the dev APK reaches the main server and the socket server through that one address. Anyone on the team reads what is deployed at a status address, and anyone with ssh redeploys, inspects logs or restores the database by following a short runbook. The pieces are laid out so that a later move to Kubernetes translates them rather than redesigns them (ADR 0004).

## User Stories

1. As a tester with a phone, I want the app to reach shared servers at one fixed address, so that I do not run the servers on my computer.
2. As a tester, I want every teammate's phone to talk to the same servers, so that we see each other as Friends, in Parties and in Quests.
3. As a developer, I want a commit pushed to `development` to be running on the Dev Server within a few minutes, so that I check my change on a phone without a manual step.
4. As a developer, I want a commit whose server checks fail to stay off the Dev Server, so that a broken push does not take the shared servers down.
5. As a developer, I want a commit that changes only the app or the admin site not to be held back by their checks, so that a server change deploys even when a mobile lint fails.
6. As a developer, I want only the services whose image changed to restart, so that a socket-server change does not restart the database.
7. As a developer, I want to read which commit is deployed, when, and whether it is healthy, from my phone's browser, so that I know whether what I see is my change.
8. As a developer, I want to see why the Dev Server has not taken my commit (checks still running, checks failed, build failed), so that I know whether to wait or to fix.
9. As a teammate with ssh, I want one command to redeploy by hand, so that I can retry after a transient failure without waiting for a push.
10. As a teammate with ssh, I want the deployment's log in one place, so that I can see what the last run did.
11. As a teammate with ssh, I want a dump of the database before every deployment, so that a migration that goes wrong does not lose the week's data.
12. As a teammate with ssh, I want a written way to restore a dump or to empty the data and start again, so that I can recover without asking the person who built the deployment.
13. As the person who sets the server up, I want one script that installs Docker, lays out the folders, clones the repository and installs the timers, so that the setup is the same on a second server.
14. As the person who sets the server up, I want the generated secrets (database passwords, server tokens, the token key pair) made for me, so that I only fill in the values that a person must know.
15. As the person who sets the server up, I want the deployment to refuse to run while a placeholder is left in the secrets, so that a half-configured server never starts.
16. As a teammate, I want every file the deployment needs to be readable and writable by the team group, so that any of us can fix the server when the one who set it up is away.
17. As a developer, I want the laptop Compose flow to stay exactly as it is, so that the deployment does not change how I run the servers on my computer.
18. As a developer, I want the deployment's settings to use the same variable names as the servers' example settings files, so that the README's descriptions apply to the Dev Server too.
19. As a tester, I want Demo Data on the Dev Server, so that four people can try every feature.
20. As a tester, I want today's and this week's demo Events to stay current across quiet days, so that the demo does not drift into the past.
21. As a tester, I want the real menus that the worker collects, not the saved demo pages, so that the dining layer shows what the restaurants serve.
22. As a tester, I want to be a Demo Account, so that I receive demo Friends, Friend Requests, a Quest invitation and a Meetup after Onboarding.
23. As a tester without a development environment, I want to download the dev APK from the Dev Server with my phone, so that I install it without a cable or a build.
24. As a developer, I want the Dev Server's address written in the app's example settings, so that I build a development build against it in one step.
25. As a reviewer, I want the deployment's decisions (deploy, wait, skip, hold) covered by tests, so that I can review the logic without a server.
26. As a reviewer, I want the deployment stack's routing covered by a test that starts it, so that a proxy change that breaks the socket server fails in CI.
27. As an Administrator, I want my address registered as an Administrator on the Dev Server's first start, so that I can confirm and publish Global Events there.
28. As the future production operator, I want the Dev Server's layout to carry over to server A with a tag in place of a branch, so that production is a copy, not a second design.
29. As a reader of the repository, I want the deployment described in the README, so that I find the runbook from the place I already read.

## Implementation Decisions

### The Dev Server

- Server B of the course's pair, reached as `ssh swpp-b` by every team member with their own key. Server A stays empty.
- Public address `http://swpp26t09.147-46-242-174.sslip.io`, plain HTTP, port 80 only. The course's ingress routes only this exact host name to the server; sub-domains and the bare IP do not reach it. The ingress ends requests over 120 seconds; whether it passes WebSocket connections and whether it ends them at 120 seconds is unknown until tried (Further Notes).
- The server is an unprivileged Incus (LXC) container: Ubuntu 24.04, 8 cores (`nproc` says 38), 16 GiB, 40 GB, UTC. Docker works in it; Kubernetes does not (ADR 0004). Time comes from the host; the server cannot set its own clock, and the worker's schedules already name `Asia/Seoul`.
- The Dev Server follows `development` and nothing else. There is no setting to point it elsewhere.

### What runs

- The laptop Compose project, unchanged, with a **deployment override** laid over it. The override is the only Compose file this spec adds. It adds the proxy, removes the host ports of the main and socket servers (the proxy is the only service that publishes a port), gives every service `restart: unless-stopped`, caps each service's log at 10 MB × 3 files with the json-file driver, and carries the Dev Server's settings (below).
- The demo profile is on. `demo-seed` (watching) and `demo-walker` run; `demo-menus` does not, because the worker collects the real menus from the Sources and the two write the same days of the same Sources. The override keeps `demo-menus` from running even though the profile is on.
- Images are built on the server from the checkout. No registry is involved.

### The proxy

- Caddy, as a Compose service of the deployment override, listening on `0.0.0.0:80`. Its configuration file lives in the repository and is the only place that knows the routes.
- Routes, in this order: `/socket.io/*` to the socket server, WebSocket upgrades included; `/deploy-status` serves the status file (below); `/apk/*` serves the APK folder as a file listing; everything else to the main server. Caddy's upstream timeouts are long enough for a WebSocket to live until the ingress ends it.
- The main server never defines a route under `/apk/` or `/deploy-status`. The constraint is written in the proxy's configuration and here.

### Settings and secrets

- One settings file on the server, outside the checkout, holds every value the deployment needs. Compose reads it as its `--env-file`, and the deployment override's `environment:` blocks hand each service the variables it takes, by the names in that service's example settings file. The base Compose file's `environment:` wins over a service's `env_file`, so the override sets `DATABASE_URL` for the main and match servers with the generated passwords.
- The file's folder and the file itself are owned by the team group and closed to others.
- Values the bootstrap generates with `openssl`: the PostgreSQL superuser password, the main and match database passwords, `WORKER_TOKEN`, `MATCH_SERVER_TOKEN`, and the ES256 access-token key pair (PKCS8 private key, SPKI public key, in the one-line PEM form the main server's key generator prints). The bootstrap never overwrites an existing file.
- Values a person fills in, left as `CHANGE_ME` by the bootstrap: `KAKAO_REST_API_KEY`, `INITIAL_ADMINISTRATOR_EMAILS` (the four members) and `DEMO_ACCOUNT_EMAILS` (the four members).
- Fixed values the bootstrap writes: `PUBLIC_URL` is the public address; `GOOGLE_APP_CLIENT_ID` and `GOOGLE_ADMIN_CLIENT_ID` are the team's, as in the example file; `ANDROID_CERTIFICATE_FINGERPRINTS` stays the debug key's, because the dev APK is signed with it; `COMPOSE_PROFILES=demo`.
- A deploy run that finds `CHANGE_ME` anywhere in the file stops before touching Docker and reports `secrets-missing`.

### The deploy run

A systemd timer at the system level starts the deploy service a minute after the previous run ended; systemd does not start it while it is running, which is the only lock. The service runs as root, in the checkout, and does these steps in order:

1. Fetch. If the remote tip of `development` equals the last deployed commit, write the status (`up-to-date`) and stop.
2. Gate on CI. Read the check runs of the new commit from GitHub's public API (no token; the call happens only when the tip moved). Required: the CI workflow's `main-server`, `socket-server`, `worker-server`, `match-server` and `flow-tests` checks, all `success`. Missing or still running → `waiting-for-ci`, try again next minute. Any of them failed → `ci-failed`; the commit is skipped and will not be looked at again. The admin and mobile checks are not consulted.
3. Dump. `pg_dumpall` through the running PostgreSQL container into the backups folder, named by time; keep the newest 7, delete the rest. Skipped when no database runs yet.
4. Check out. `git reset --hard` to the tip and `git clean -fdx`; nothing of value lives in the checkout.
5. Build and start. `docker compose up -d --build` with the laptop file and the deployment override. Compose recreates only the services whose image or configuration changed. On failure the old containers keep running; the same commit is retried on the next two runs (three attempts in all), then held (`held`) until a new commit arrives or a person starts the service by hand.
6. Smoke. Through the proxy on the loopback: `/health/ready` answers 200 within the main server's health-check budget, and `/socket.io/?EIO=4&transport=polling` answers an engine.io handshake. A failure is recorded as `unhealthy`; there is no automatic rollback.
7. Clean. Remove dangling images and build cache older than 7 days.
8. Status. Write the status file (below). Every step also logs to the journal, read with `journalctl -u snu-now-deploy`.

### Timers

- `snu-now-deploy`: one minute after the previous run, and two minutes after boot.
- `snu-now-demo-refresh`: daily at 19:00 UTC (04:00 KST), `docker compose --profile demo restart demo-seed`, which rewrites the Demo Data's days around today.
- Both unit files live in the repository; the bootstrap copies them into systemd and enables them.

### The status file

Written by every deploy run into the status folder and served by the proxy at `/deploy-status` as JSON:

- `trackedRef`: `development`.
- `checkedAt`: when this run ran.
- `result`: one of `up-to-date`, `deployed`, `waiting-for-ci`, `ci-failed`, `build-failed`, `held`, `unhealthy`, `secrets-missing`.
- `candidateCommit`: the tip the run looked at, and `attempt` (1 to 3) when it tried to build it.
- `deployedCommit` and `deployedAt`: the last commit that was built, started and smoke-checked.
- `checks`: the name and conclusion of each required check run of the candidate.
- `recreatedServices`: the services Compose recreated in the last deployment.

### Server layout

Under the team folder `/srv/team`, which the course gives the team group with a default ACL: the checkout (`snu-now`), the secrets folder (`snu-now-secrets`), the backups folder (`snu-now-backups`), the status folder (`snu-now-status`) and the APK folder (`snu-now-apk`). The bootstrap creates the four folders group-writable and the secrets folder closed to others. PostgreSQL's data is a named Docker volume.

### The bootstrap

One idempotent script, run with sudo on a fresh server and safe to run again: installs `docker.io`, `docker-compose-v2` and `docker-buildx` from Ubuntu's archive (Docker 29, Compose 2.40); creates the folders; clones the repository on `development` (public, no key); marks the checkout safe for git under root; writes the settings file with generated values and placeholders if it does not exist; installs and enables the two timers. It does not fill in the person-held values and does not deploy.

### The APK

- The person who builds the dev APK sets the app's main and socket server addresses to the public address, builds the release APK as the iteration-1 demo APK was built (debug signing), names it `snu-now-dev-YYYY-MM-DD.apk` and copies it into the APK folder with `scp`. The proxy lists the folder at `/apk/`, so a phone's browser downloads it directly.
- The app's example settings file gains a comment with the Dev Server's two addresses, so a teammate builds a development build against it by copying two lines.

### Repository additions

- The deployment override beside the laptop Compose file; the proxy's configuration; a deploy folder with the bootstrap script, the deploy script, the four unit files, an example of the settings file with its placeholders, and the runbook; shell tests and lint for the two scripts; a CI job for them; a test of the deployment stack in `flow-tests`; a short "Deployment" section in the root README that points to the runbook; the comment in the app's example settings.
- The deploy script separates deciding from doing. Its decisions (compare the commits, judge the check runs, count the attempt, choose the dumps to delete, compose the status) are functions that take plain inputs and print a verdict. The commands with side effects (`git`, `docker`, `curl`, `pg_dumpall`) are reached through variables, so a test replaces them.
- The runbook covers: first setup, filling the secrets, reading the status and the journal, redeploying by hand, restoring a dump, emptying the data and starting again, adding an APK, backing the secrets up before the course deletes the servers, and what changes for a production server on A (tag instead of branch, no demo refresh).

### Repository rules

- Every new source file (shell, YAML, the Caddyfile, the shell tests) starts with the AI-generated box of dated rows that `CLAUDE.md` describes; Markdown files get none.
- When a ticket is finished, its agent time and tokens go under the ticket's `## Comments` in an `### Agent usage (YYYY-MM-DD)` section, as `CLAUDE.md` describes.

## Testing Decisions

- A good test drives the deployment the way the server or a phone does: it gives the deploy script's decision functions real inputs and reads the verdict, or it starts the stack and sends HTTP through the proxy. It does not read the scripts' internals or assert on the shape of a Compose file beyond what `docker compose config` reports.
- **Seam 1, the deploy script, under bats with shellcheck.** The decision functions: tip equal to the last deployed commit → `up-to-date`; required checks all `success` → deploy; one missing or `in_progress` → `waiting-for-ci`; one `failure` → `ci-failed`; a mobile or admin failure alone → still deploy; attempts 1 and 2 after a failed build → retry, attempt 3 → `held`; a new commit clears the hold; nine dumps → the two oldest are named for deletion; the status JSON carries every field above with the right values. The do layer with the commands replaced by fakes on `PATH`: the order of the steps; no Docker call when `CHANGE_ME` is present; no dump when no database runs; the smoke check's two requests. The bootstrap's settings generation: a fresh file has every generated value and the placeholders; a second run leaves the file as it was; the key pair is a P-256 pair in one-line PEM. There is no shell test in the repository yet; this is the first, and the CI gets a job outside the pnpm matrix that installs `bats` and `shellcheck` from apt and runs them.
- **Seam 2, the deployment stack, in `flow-tests` under vitest.** A test file starts the laptop Compose file with the deployment override as its own Compose project, with a settings file it generates the way `flow-tests` already generates its own, and a test-only override that moves the proxy's published port off 80 onto an ephemeral loopback port, as `flow-tests`' override already does for the servers. Through the proxy: `/health/ready` answers 200 from the main server; `/socket.io/?EIO=4&transport=polling` answers an engine.io handshake; `/deploy-status` serves a file placed in the status folder; `/apk/` lists a file placed in the APK folder; an unknown path gets the main server's 404, not the proxy's. From `docker compose config` with the demo profile: the services include `demo-seed` and `demo-walker` and not `demo-menus`; the proxy is the only service with a published port. Prior art: `flow-tests`' stack driver and its test override.
- Not covered by a test, and checked by hand in the operations tickets (Further Notes): the bootstrap on the real Ubuntu server, the systemd units, the course ingress, and WebSocket through it.

## Out of Scope

- Server A, and any production deployment: tags (`v*`), a second environment, a registry (GHCR).
- Pointing the Dev Server at another branch or ref, and the `2.0/Main` branch. The Dev Server follows `development`; pull requests of Iteration 2 go to `development`.
- The admin site. Without HTTPS, Google's sign-in on it cannot be allowed for this host, and the host name cannot carry a second site. The admin site runs on a laptop with its main-server address set to the Dev Server.
- HTTPS, App Links (an Invite Link opens through the `snunow://` scheme only), and a custom domain.
- Notifications of a deployment to Slack or as a GitHub commit status.
- Running `flow-tests` against the Dev Server; that is P11.
- Automatic rollback after a failed migration or an unhealthy start.
- Kubernetes manifests of any kind (ADR 0004).

## Further Notes

- **Operations tickets.** The steps on the server happen after the pull request is merged into `development`, as tickets apart from the code tickets, so that the review of the code does not depend on the state of the server: run the bootstrap over ssh (an agent can do this); fill in the person-held values; watch the first deploy run through to `deployed` and open `/health/ready` and `/deploy-status` from a phone; build the dev APK, copy it to the APK folder and install it from `/apk/`; hold a WebSocket open from a phone off the campus network for more than three minutes and record in the runbook whether the ingress passes WebSockets and whether it ends them at 120 seconds. If it ends them, a follow-up ticket shortens socket.io's ping interval or allows the polling transport.
- **Branch and pull request.** One integration branch `2.0/P04-05-dev-deploy` from `development`, worked with `/implement-spec`, one pull request into `development`, reviewed by 윤유상. The schedule's P4 and P5 rows get the same final commit.
- **Later**, in the order they will likely come: Slack or GitHub status notifications of a deploy run (fifteen minutes once a webhook or token exists); images built in CI and pushed to GHCR, pulled by the server; server A as production, following `v*` tags with the same scripts and no demo refresh; HTTPS if the course opens 443 or a domain appears; `flow-tests` against the Dev Server (P11).
- **Facts that shaped the design**, found on 2026-10-17: ssh to the servers works only from the university's network, so GitHub's runners cannot push to them (ADR 0003); the team's GitHub role is `maintain`, and the repository's runner API refuses the team, so a self-hosted runner was not an option; outbound to GitHub, GHCR, Docker Hub and Ubuntu's archive is open; the ingress answers 503 for the host while nothing listens on 80, 404 for sub-domains and the guide page for the bare IP.
- The cost of the first deployment is a few minutes of building four Node images on 8 cores; later runs rebuild only the layers that changed.
