# 03: Socket server skeleton

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: 02 (Data stores and main server connection)

## What to build

The socket server is set up by following the main server. A developer who has not opened it before finds the same layout, quality rules, settings validation and health checks. It is connected to NestJS messaging over Redis and starts with the one command together with the rest of the system. It holds no data.

The Socket.IO connection and token verification are ticket 11. The signals it relays belong to P08.

## Acceptance criteria

- [x] `socket-server` is its own project at the repository root with its own package manifest, pnpm lockfile, lint, format and test configuration. Settings identical to the main server's are copied, not shared.
- [x] Versions, lint rules, format rules and the one-command checks match the main server's. Lint, format, type and test checks pass.
- [x] The folder layout follows the main server's feature module note.
- [x] Settings are validated at startup against a schema, a missing setting stops the server with its name, and an example settings file without secrets lists every setting.
- [x] The server exposes a liveness check and a readiness check. Readiness reports Redis.
- [x] The server is connected to NestJS messaging over Redis.
- [x] The server has no database.
- [x] The one command that starts the system also starts the socket server.
- [x] Tests call the server through its public API: both health checks answer, and startup fails with the setting's name when a required setting is missing.
- [x] Wherever the main server's feature module note was unclear while following it, the note is improved.

## Comments

### Following the main server (2026-09-29)

- These files are byte-for-byte copies of the main server's: `.oxlintrc.json`, `.prettierrc`, `.prettierignore`, `tsconfig.json`, `tsconfig.build.json`, `nest-cli.json`, `vitest.config.ts` and `test/start-app.ts`. The other files leave out what belongs to the database: the Prisma packages and scripts, Prisma's entries in `pnpm-workspace.yaml`, `src/generated` in the ignore files, `PrismaModule`, and the database in the readiness check and the test setup.
- The lockfile was resolved fresh. A copy of the main server's lockfile kept `@nestjs/terminus` resolved together with its optional peer `@prisma/client`, and installing it brought Prisma back. That install also wrote Prisma entries with the placeholder value `set this to true or false` into `pnpm-workspace.yaml`, because pnpm 12 lists every dependency whose install scripts it has not been told about; they were removed again. Every direct dependency in the fresh lockfile has the main server's version, and every package in it is also in the main server's lockfile.
- The socket server listens on port 3001, in `.env.example` and in `compose.yaml`, so that it runs next to the main server (3000) on one laptop.
- `main-server/README.md` now says that `docker compose up --build` starts "PostgreSQL, Redis and every server" instead of naming the main server, so that it stays true as the worker and match servers join.

### Messaging receives only (2026-09-29)

The socket server joins messaging as a receiver (`connectMicroservice` in `main.ts`), and readiness pings Redis with the same options. It has no messaging client like the main server's `MessagingModule`: in P08 the main server sends signals and positions to the socket server as events, and nothing goes back. When a message has to leave the socket server, add the client as the main server does. As in the main server, Nest's Redis server subscribes only to patterns that have a handler, so a message round trip can be checked once P08 adds handlers.

### Feature module note (2026-09-29)

The health module was created by following the main server's note: `pnpm exec nest g module health` and `pnpm exec nest g controller health --no-spec`. The generator wrote the `.js` import extensions that ES modules need and added the module to `AppModule`, so steps 1 and 2 work as written. The generated module lacked a trailing comma, which step 9's `pnpm format` fixes.

Two steps name things only the main server has: step 5 (the database) and step 7 (the `main-server` service in `compose.yaml`). `socket-server/README.md` carries its own copy of the note, without the database step and without an `entities/` folder, in the same words as the worker server's (ticket 04). Nothing else in the note was unclear, so the main server's note is unchanged.

### Startup and shutdown (2026-09-29)

- Startup stops when Redis cannot be reached, as in the main server.
- `main.ts` keeps the main server's order, `app.init()` before `startAllMicroservices()`, so that no message arrives before every module is ready.
- With `app.enableShutdownHooks()` and `init: true` in `compose.yaml`, `docker compose stop socket-server` took 0.5 seconds and the container ended with exit code 143: Nest raised SIGTERM again after its shutdown hooks. A forced stop would have taken 10 seconds and ended with 137.
