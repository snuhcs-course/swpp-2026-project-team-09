# 04: The manifests, the admin site's image and health routes, and case-sensitive routing

Parent: [A01 spec](../spec.md)
Status: resolved
Blocked by: None (can start immediately)
Touches: the Kustomize base in `infra/production/k8s/`, the admin site (its Dockerfile, `.dockerignore`, Next.js configuration, two health routes, and their tests), the main server's routing setup and one test, and one new job in the CI workflow. Not the database Job in `infra/production/k8s/` (ticket 03), not the main-server and match-server Dockerfiles (ticket 03), not `admin/README.md` (ticket 07).

## What to build

`kubectl kustomize infra/production/k8s` renders everything a Release applies (spec: "Workloads", "Admin site", and "Entry: load balancer, domain, and certificate"):

- **Deployments and Services.** The six Deployments of the spec's table, with their replicas, ports, and strategies, `worker-server` and `match-server` on `Recreate`, and `redis` as `redis:8` with `noeviction` and no volume. Each has a ClusterIP Service of the same name, and every pod sets `enableServiceLinks: false`. No `demo-seed`, `demo-walker`, or `demo-menus`.
- **Probes and stopping.** All five app Deployments are live on `/health/live` and ready on `/health/ready`. Each server also has a startup probe that allows 5 minutes. Each server sleeps a few seconds in a `preStop` hook.
- **Placement and memory.** The two-replica Deployments spread over the two zones. Every container sets a memory request and limit that keep the system inside two `t4g.small` nodes.
- **Settings.** `PORT` per Deployment, the shared values of the spec's "Settings" in a ConfigMap, and the secret values in a Secret made by `secretGenerator` from an env file that exists only during a Release and is ignored by git. The env file carries each server's `DATABASE_URL` whole; ticket 05 writes it.
- **Images** are named so that ticket 05 sets the registry and the commit-SHA tag with Kustomize.
- **Entry.** Ingresses for `api.snunow.com` and `admin.snunow.com` in one IngressGroup, internet-facing, with IP targets, port 80 redirecting to 443, and `/health/ready` as the health check. On `api`: `/socket.io/*` to `socket-server`, then a fixed 404 for every path under `/admin/`, then everything else to `main-server`. On `admin`: everything to `admin`. No certificate ARN.
- **The admin site.** `/health/live` and `/health/ready` Route Handlers that answer `GET` without a session in the servers' JSON shape, never cached; ready only while the main server's `/health/live` answers. `output: 'standalone'`, an `admin/Dockerfile` on `node:24-slim` that copies `public` and `.next/static`, an `admin/.dockerignore` like the servers' ones, `NEXT_PUBLIC_GOOGLE_CLIENT_ID` and `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY` as build arguments, and `HOSTNAME=0.0.0.0` and `MAIN_SERVER_URL=http://main-server:3000` at run time.
- **The main server** turns on case-sensitive routing, so that `/ADMIN/...` cannot reach the admin routes past the ALB's 404 rule.
- **CI.** A job renders the base on every push, with a stand-in secrets env file.
- **arm64.** Every image, and every native dependency in it, runs on `linux/arm64`.

## Shared contract

Fixed here so that tickets 02, 03, and 06 match without seeing this ticket: everything runs in the namespace `snunow`, which Terraform creates; the IngressGroup is named `snunow`, and ticket 06 finds the ALB by its tag; the database Job lives in `infra/production/k8s/` outside the base's kustomization; the main-server and match-server images set `NODE_EXTRA_CA_CERTS` themselves.

## Acceptance criteria

- [x] `kubectl kustomize infra/production/k8s` renders without error, locally and in the new CI job, with a stand-in secrets file; a real secrets env file cannot be committed.
- [x] The rendered output holds only namespaced objects in `snunow` (no Namespace or other cluster-wide object), since the deploy role's rights stop at the namespace.
- [x] The rendered Deployments, Services, probes, `preStop` hooks, zone spread, memory settings, ConfigMap, and Secret are as above, and no demo service is rendered.
- [x] The rendered Ingresses carry the rules in the spec's order, the redirect, the health check path, and the IngressGroup `snunow`, and no certificate ARN.
- [x] Admin tests, against the built site with a fake main server as its other tests run: `/health/live` answers 200 without a cookie; `/health/ready` answers 200 while the fake main server is live and 503 once it stops; both answer `status` `ok` or `error` and are not cached.
- [x] The admin image builds and serves the site on port 3100; `pnpm dev` and the admin site's lint, format, typecheck, and tests pass as before.
- [x] A main-server e2e test: a signed-in Administrator gets 404 from `/ADMIN/administrators` and the list from `/admin/administrators`; the main server's checks pass.
- [x] All five images build for `linux/arm64` and start there; `## Comments` lists the native dependencies checked.
- [x] The laptop Compose file and the Dev Server's files are unchanged.
- [x] Every new or changed source file (the manifests, the Dockerfile, the routes, the tests, the Next.js configuration, the main server's file, the CI workflow) carries the AI-generated box with a row for this change (`CLAUDE.md`).
- [x] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.

## Comments

### Built (2026-10-22)

- **Files.** The base is `infra/production/k8s/kustomization.yaml` with one file per Deployment and its Service
  (`redis.yaml`, `main-server.yaml`, `socket-server.yaml`, `worker-server.yaml`, `match-server.yaml`, `admin.yaml`) and
  `ingress.yaml`. `infra/production/k8s/.gitignore` ignores `secrets/`, so a real secrets file cannot be added by
  `git add` (checked with `git check-ignore`).
- **Secrets as three files, not one env file.** Kustomize's env-file parser is line-based and keeps both surrounding
  quotes and `\n` literally (checked with kubectl v1.36.1, Kustomize v5.8.1), so a PEM with real line breaks cannot
  travel in it. The `secretGenerator` reads `secrets/secrets.env` (`MAIN_DATABASE_URL`, `MATCH_DATABASE_URL`,
  `WORKER_TOKEN`, `MATCH_SERVER_TOKEN`, `KAKAO_REST_API_KEY`, `OPENROUTER_API_KEY`, and
  `INITIAL_ADMINISTRATOR_EMAILS`) and the two keys from `secrets/access-token-private-key.pem` and
  `secrets/access-token-public-key.pem`. The rendered Secret holds both keys with real line breaks. Ticket 05 writes all
  three files.
- **Images.** The Deployments name the images `main-server`, `socket-server`, `worker-server`, `match-server`, and
  `admin`, as the ECR repositories; ticket 05 sets registry and tag with `kustomize edit set image`. `redis` stays
  `redis:8`.
- **Settings per container.** Each container takes only the values it reads, by `configMapKeyRef` and `secretKeyRef`,
  as `compose.deploy.yaml` does for the Dev Server; Kustomize rewrites the references to the hashed names.
- **Stopping.** Each server sleeps 10 seconds in a `preStop` `sleep` action (no `sleep` binary needed). The admin site
  sleeps too, since the load balancer sends to it as well.
- **Ingress.** `ingressClassName: alb`, the IngressClass that the controller's Helm chart creates by default (ticket
  02). The `/admin` rule is a fixed-response action that answers 404 with a JSON body. The controller (v3.6.0) turns a
  Prefix path `/p` into the patterns `/p` and `/p/*` and puts longer Prefix paths first, whatever their order in the
  Ingress, which gives the spec's order: `/socket.io`, `/admin`, then `/`.
- **The admin image.** The site has no `public` folder, so the build stage creates an empty one; the image copies it
  and `.next/static` beside `server.js`, so that a folder added later is served. Only `sharp` (for image optimization)
  is a native module in the standalone output. `pnpm start` still serves, but Next.js now warns that `next start` does
  not suit `output: 'standalone'`; ticket 07 may say so in `admin/README.md`.
- **Case-sensitive routes.** Express reads `case sensitive routing` only when it creates its router, and Nest's
  `ExpressAdapter` creates it in its constructor, so `app.set` after `NestFactory.create` has no effect. The main server
  now passes an Express instance with the setting on (`src/common/http-adapter.ts`), which needs `express` as a direct
  dependency (5.2.1, already in the lockfile through `@nestjs/platform-express`). The tests' `startApp` uses the same
  adapter, so `test/route-case.e2e-spec.ts` checks what `main.ts` runs. No route path or client path has a capital
  letter. The main server's lint, format check, typecheck, and build pass. Its whole suite passed but for three tests
  that hit the 5-second test timeout while the machine's load average was near 40 (`party-leader` and
  `shuttle-seed`); both files then passed on their own (24 tests).
- **CI.** The `manifests` job writes stand-ins for the three secrets files and runs `kubectl kustomize
  infra/production/k8s`. Its steps were run locally from a clean copy of the tracked files and rendered; `actionlint`
  reports nothing on `ci.yml`. Its first GitHub run comes with the push.

### arm64 and native dependencies (2026-10-22)

All five images were built with `docker build --platform linux/arm64` on an arm64 Mac, are `linux/arm64` by `docker
image inspect`, and were started together (PostgreSQL from `infra/postgres`, Redis 8) under their own Compose project.
Each answered 200 on `/health/live` and `/health/ready`, and `uname -m` in each was `aarch64`. The main server answered
404 to `/ADMIN/administrators` and 401 to `/admin/administrators` without a token.

Native code checked in each image:

| Image | Native code at run time | How it was checked |
|---|---|---|
| `main-server` | Prisma's schema engine (`@prisma/engines`, `linux-arm64-openssl-1.1.x`), used by `prisma migrate deploy` | the container applied all 17 migrations and loaded the seed |
| `match-server` | the same schema engine | the container applied its 3 migrations |
| `socket-server` | none | started and ready |
| `worker-server` | none | started and ready |
| `admin` | `sharp` with `@img/sharp-linux-arm64` and `libvips` 8.18.7 | `require('sharp')` rendered a PNG in the container |

The server images also carry arm64 builds of `rolldown`, `oxlint`, and `lightningcss`, which the build and the checks
use, not the running server. Ticket 03 changes the main-server and match-server Dockerfiles; this check ran on the
Dockerfiles before that change.

### Memory (2026-10-22)

Measured in the local run above, from the cgroup (`memory.stat` anon, and `memory.peak` including the migration and
page cache), idle and after a few hundred requests:

| Container | Anonymous memory | Peak | Request | Limit |
|---|---|---|---|---|
| `main-server` | 176 to 228 Mi | 248 Mi | 256 Mi | 512 Mi |
| `socket-server` | 80 Mi | 122 Mi | 128 Mi | 256 Mi |
| `worker-server` | 87 Mi | 128 Mi | 160 Mi | 320 Mi |
| `match-server` | 101 Mi | 334 Mi | 192 Mi | 384 Mi |
| `redis` | 15 Mi | 17 Mi | 64 Mi | 256 Mi |
| `admin` | 57 to 84 Mi | 90 Mi | 128 Mi | 256 Mi |

The requests come to 1,312 Mi at steady state, and 1,824 Mi during a Release with the surge pods of `main-server`,
`socket-server`, and `admin`. With about 540 Mi requested by `coredns` and `metrics-server`, that is about 2,360 Mi
against roughly 2,900 Mi allocatable on two `t4g.small` nodes (about 1,900 Mi each, less 376 Mi reserved for 11 pods and
100 Mi for eviction). The first week's `kubectl top` decides whether to raise them or the node size.

### Agent usage (2026-10-22)

- Agent time: about 50 minutes, an estimate, summed over its implementer and its reviewer, plus an even share of the session that orchestrated the tickets.
- Tokens, with the same shares and the subagents included: input 362 new, 34.2 million read from the cache, and 465 thousand written to the cache; output 24 thousand.
