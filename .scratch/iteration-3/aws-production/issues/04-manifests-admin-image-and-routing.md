# 04: The manifests, the admin site's image and health routes, and case-sensitive routing

Parent: [spec](../spec.md)
Status: ready-for-agent
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

- [ ] `kubectl kustomize infra/production/k8s` renders without error, locally and in the new CI job, with a stand-in secrets file; a real secrets env file cannot be committed.
- [ ] The rendered output holds only namespaced objects in `snunow` (no Namespace or other cluster-wide object), since the deploy role's rights stop at the namespace.
- [ ] The rendered Deployments, Services, probes, `preStop` hooks, zone spread, memory settings, ConfigMap, and Secret are as above, and no demo service is rendered.
- [ ] The rendered Ingresses carry the rules in the spec's order, the redirect, the health check path, and the IngressGroup `snunow`, and no certificate ARN.
- [ ] Admin tests, against the built site with a fake main server as its other tests run: `/health/live` answers 200 without a cookie; `/health/ready` answers 200 while the fake main server is live and 503 once it stops; both answer `status` `ok` or `error` and are not cached.
- [ ] The admin image builds and serves the site on port 3100; `pnpm dev` and the admin site's lint, format, typecheck, and tests pass as before.
- [ ] A main-server e2e test: a signed-in Administrator gets 404 from `/ADMIN/administrators` and the list from `/admin/administrators`; the main server's checks pass.
- [ ] All five images build for `linux/arm64` and start there; `## Comments` lists the native dependencies checked.
- [ ] The laptop Compose file and the Dev Server's files are unchanged.
- [ ] Every new or changed source file (the manifests, the Dockerfile, the routes, the tests, the Next.js configuration, the main server's file, the CI workflow) carries the AI-generated box with a row for this change (`CLAUDE.md`).
- [ ] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.
