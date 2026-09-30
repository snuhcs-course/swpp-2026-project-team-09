# 04: Worker server skeleton

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: 02 (Data stores and main server connection)

## What to build

The worker server is set up by following the main server. A developer who has not opened it before finds the same layout, quality rules, settings validation and health checks. It is connected to NestJS messaging over Redis and starts with the one command together with the rest of the system. It keeps no data of its own.

The schedules, the collectors and the messages it sends to the main server belong to P07.

## Acceptance criteria

- [x] `worker-server` is its own project at the repository root with its own package manifest, pnpm lockfile, lint, format and test configuration. Settings identical to the main server's are copied, not shared.
- [x] Versions, lint rules, format rules and the one-command checks match the main server's. Lint, format, type and test checks pass.
- [x] The folder layout follows the main server's feature module note.
- [x] Settings are validated at startup against a schema, a missing setting stops the server with its name, and an example settings file without secrets lists every setting.
- [x] The server exposes a liveness check and a readiness check. Readiness reports Redis.
- [x] The server is connected to NestJS messaging over Redis, for request and response.
- [x] The server has no database.
- [x] The one command that starts the system also starts the worker server.
- [x] Tests call the server through its public API: both health checks answer, and startup fails with the setting's name when a required setting is missing.
- [x] Wherever the main server's feature module note was unclear while following it, the note is improved.

## Comments

### Following the main server (2026-09-29)

- The worker server is a copy of `main-server` with the database removed: no Prisma, no `DATABASE_URL`, and readiness reports Redis only. The lint, format, TypeScript, Nest and Vitest configuration, `src/common/messaging.module.ts` and the health module are byte-identical to the main server's.
- It listens on port 3002, in compose and in `.env.example`. The main server has 3000 and the socket server 3001; 3003 is left for the match server, in the spec's order.
- The lockfile was resolved afresh. The main server's copied lockfile kept `@nestjs/terminus`'s optional peer resolved to `@prisma/client`, which pulled Prisma back in, and pnpm refused Prisma's build scripts. Every direct dependency still resolves to the same version as in the main server.
- `docker compose up --build` starts the worker server with the rest. It answered both health checks, answered 503 naming Redis while Redis was stopped and recovered after, and stopped on SIGTERM in about 0.2 seconds with exit code 143, as the main server does.
- `compose.yaml` gains only the `worker-server` service, after the socket server's. `main-server/README.md` already says that the one command starts every server (ticket 03), so it is unchanged here.

### Messaging sends only (2026-09-29)

The worker server only sends. `MessagingModule` provides the client that P07 uses to send what it collected to the main server as requests. Nothing sends to the worker, so `main.ts` does not connect it to messaging as a receiver. This follows the socket server's rule of keeping only the side a server's role needs (ticket 03). The main server is unchanged: it receives the worker's requests and sends events to the socket server.

- The server starts even when Redis cannot be reached, and readiness answers 503 until it can. The main server's reason for stopping at startup concerns the receiving side, which subscribes to its channels only after its first connection succeeds, so it does not apply here. The startup test for Redis was removed.
- `test/start-app.ts` starts the app with `init()` alone, as Nest's testing page does. The main server's `try`/`catch` there only closes a receiving connection that would keep retrying.
- When a message has to reach the worker, add the receiving side as the main server does.

### The feature module note (2026-09-29)

The main server's note was followed in a scratch copy of the worker server with `nest g module`, `nest g controller --no-spec` and `nest g service --no-spec`. The generator writes imports ending in `.js`, lint and type checks pass, and step 8's `pnpm format` fixes the one formatting error the generator leaves (a missing trailing comma). Nothing was unclear, so the main server's note is unchanged. The worker server's README carries its own copy without the database step.
