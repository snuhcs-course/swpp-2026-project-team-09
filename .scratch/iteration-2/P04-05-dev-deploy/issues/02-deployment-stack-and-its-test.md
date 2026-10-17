# 02: The deployment stack: override, Caddy, and the test that starts it

Parent: [P04-05 spec](../spec.md)
Status: done
Blocked by: 01 (the stack driver that starts a second stack)
Touches: the repository root (the deployment override), the proxy's configuration folder, and one new test file in flow-tests. Not flow-tests' shared modules, not the laptop Compose file.

## What to build

Laying the deployment override over the laptop Compose file gives the stack the Dev Server runs (spec: "What runs", "The proxy", "Settings and secrets"). Caddy is the only service that publishes a port, on 80: `/socket.io/*` reaches the socket server with WebSocket upgrades, `/deploy-status` serves the status file, `/apk/*` lists the APK folder, and everything else reaches the main server. With the demo profile on, `demo-seed` and `demo-walker` run and `demo-menus` does not. Every service restarts unless stopped and keeps at most 10 MB × 3 of logs. The services take their settings from one settings file through the override's `environment:` blocks, by the names of their example settings files, and `DATABASE_URL` carries the generated passwords. The main server's and socket server's host ports are gone. The laptop flow (`docker compose up --build` with the base file alone) is untouched.

A test file in `flow-tests` starts this stack as a project of its own, with a settings file it writes through ticket 01's function and a test-only override that moves Caddy's published port to an ephemeral loopback port, checks the behaviour below through the proxy, and takes the stack down with its volumes.

## Shared contract

Fixed here so that tickets 03 and 04 match without seeing this ticket: the override is `compose.deploy.yaml` at the repository root; the proxy's configuration lives in `infra/proxy`; the override takes the status folder and the APK folder from the variables `DEPLOY_STATUS_DIR` and `DEPLOY_APK_DIR` of the settings file; the status file is `status.json` in the status folder; the demo profile is turned on by `COMPOSE_PROFILES=demo` in the settings file.

## Acceptance criteria

- [x] Through the proxy, `/health/ready` answers 200 from the main server.
- [x] Through the proxy, `/socket.io/?EIO=4&transport=polling` answers an engine.io handshake, and a socket.io client connecting over the WebSocket transport with a bad token receives the socket server's connection error, which shows the upgrade reached it.
- [x] Through the proxy, `/deploy-status` serves a JSON file placed in the status folder, and `/apk/` lists a file placed in the APK folder.
- [x] Through the proxy, an unknown path gets the main server's 404 body, not Caddy's.
- [x] `docker compose config` with the demo profile lists `demo-seed` and `demo-walker` and not `demo-menus`; without the profile it lists none of the three.
- [x] `docker compose config` shows the proxy as the only service with a published port, every service with `restart: unless-stopped`, and the json-file log limits on every service.
- [x] The test starts and removes its own project and leaves no container or volume behind; `pnpm test` in `flow-tests` passes with the flows and this file, and lint, format and typecheck pass.
- [x] The laptop Compose file is unchanged; `docker compose config` on it alone is the same as before this ticket.
- [x] The Caddyfile states that the main server defines no route under `/apk/` or `/deploy-status`.
- [x] Every new source file (the override, the Caddyfile, the test) starts with the AI-generated box (`CLAUDE.md`).
- [x] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.

## Comments

### What ticket 02 decided (2026-10-17)

- The proxy is built, not mounted: `infra/proxy/Dockerfile` is `FROM caddy:2.11.7` (released 2026-10-03), copies the Caddyfile in and runs `caddy validate`. Compose recreates a container only when its image or its configuration changes and Caddy does not watch its file, so a mounted Caddyfile would keep the old routes after a deploy; in the image, a Caddyfile change recreates the proxy, and a broken one fails the build while the running proxy stays. This is the one file in `infra/proxy` beside the Caddyfile.
- `demo-menus` gets `profiles: !override [demo-menus]`: it runs only when that profile is named, so `COMPOSE_PROFILES=demo` starts `demo-seed` and `demo-walker` alone.
- The proxy has no `depends_on`, so `/deploy-status` and `/apk/` answer while a server is down. It mounts the status and APK folders, not files, so a `status.json` replaced by a rename (ticket 03 does that) is seen.
- Every service's `env_file` is reset: on the server the settings come from the settings file alone. The override passes `ROUND_INTERVAL_SECONDS` to the match server, which requires it (ticket 04 writes 60), and builds the main, match and demo-seed `DATABASE_URL`s from the generated passwords, which are hex and so URL-safe.
- The test runs the stack with the demo profile on, as the server does. Its override (`flow-tests/compose.deploy.test.yaml`) moves the proxy to `127.0.0.1::80`, gives the socket server the flow stack's health check so `up --wait` waits for it, and maps the worker's Source hosts to `127.0.0.1`, so a scheduled Collection fails at once instead of calling the real sites. The main server needs nothing from outside to start; no flow-stack piece (sources container, TLS) is used. The config checks run on `compose.yaml` and `compose.deploy.yaml` alone, as on the server.
- `flow-tests/README.md`: the folder layout now lists `settings.ts`, `stack.flow.ts` and this ticket's files, and "Run it" says `pnpm test` also starts the deployment stack as `snu-now-deploy-test`.
- Checked by hand, not in the test: a socket.io connection with a valid token stayed open through the proxy for 6.5 minutes, until the script closed it.
- `docker compose config` on `compose.yaml` alone, with and without `--profile demo`, is byte for byte the same before and after (SHA-256 `d08a6271…` and `4055767f…`). After `pnpm test`, `docker ps -a` and `docker volume ls` list what they listed before.

### Agent usage (2026-10-17)

- Agent time: about 27 minutes, an estimate (one implementer subagent), including a 6.5-minute WebSocket hold run by the agent.
- Tokens: input 16,125,000 in all (cache reads 15,934,000, cache writes 191,000, uncached under 1,000), output 12,000. Measured from the transcript a few steps before the end.
