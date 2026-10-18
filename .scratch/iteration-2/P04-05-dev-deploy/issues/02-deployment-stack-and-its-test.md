# 02: The deployment stack: override, Caddy, and the test that starts it

Parent: [P04-05 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (the stack driver that starts a second stack)
Touches: the repository root (the deployment override), the proxy's configuration folder, and one new test file in flow-tests. Not flow-tests' shared modules, not the laptop Compose file.

## What to build

Laying the deployment override over the laptop Compose file gives the stack the Dev Server runs (spec: "What runs", "The proxy", "Settings and secrets"). Caddy is the only service that publishes a port, on 80: `/socket.io/*` reaches the socket server with WebSocket upgrades, `/deploy-status` serves the status file, `/apk/*` lists the APK folder, and everything else reaches the main server. With the demo profile on, `demo-seed` and `demo-walker` run and `demo-menus` does not. Every service restarts unless stopped and keeps at most 10 MB × 3 of logs. The services take their settings from one settings file through the override's `environment:` blocks, by the names of their example settings files, and `DATABASE_URL` carries the generated passwords. The main server's and socket server's host ports are gone. The laptop flow (`docker compose up --build` with the base file alone) is untouched.

A test file in `flow-tests` starts this stack as a project of its own, with a settings file it writes through ticket 01's function and a test-only override that moves Caddy's published port to an ephemeral loopback port, checks the behaviour below through the proxy, and takes the stack down with its volumes.

## Shared contract

Fixed here so that tickets 03 and 04 match without seeing this ticket: the override is `compose.deploy.yaml` at the repository root; the proxy's configuration lives in `infra/proxy`; the override takes the status folder and the APK folder from the variables `DEPLOY_STATUS_DIR` and `DEPLOY_APK_DIR` of the settings file; the status file is `status.json` in the status folder; the demo profile is turned on by `COMPOSE_PROFILES=demo` in the settings file.

## Acceptance criteria

- [ ] Through the proxy, `/health/ready` answers 200 from the main server.
- [ ] Through the proxy, `/socket.io/?EIO=4&transport=polling` answers an engine.io handshake, and a socket.io client connecting over the WebSocket transport with a bad token receives the socket server's connection error, which shows the upgrade reached it.
- [ ] Through the proxy, `/deploy-status` serves a JSON file placed in the status folder, and `/apk/` lists a file placed in the APK folder.
- [ ] Through the proxy, an unknown path gets the main server's 404 body, not Caddy's.
- [ ] `docker compose config` with the demo profile lists `demo-seed` and `demo-walker` and not `demo-menus`; without the profile it lists none of the three.
- [ ] `docker compose config` shows the proxy as the only service with a published port, every service with `restart: unless-stopped`, and the json-file log limits on every service.
- [ ] The test starts and removes its own project and leaves no container or volume behind; `pnpm test` in `flow-tests` passes with the flows and this file, and lint, format and typecheck pass.
- [ ] The laptop Compose file is unchanged; `docker compose config` on it alone is the same as before this ticket.
- [ ] The Caddyfile states that the main server defines no route under `/apk/` or `/deploy-status`.
- [ ] Every new source file (the override, the Caddyfile, the test) starts with the AI-generated box (`CLAUDE.md`).
- [ ] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.
