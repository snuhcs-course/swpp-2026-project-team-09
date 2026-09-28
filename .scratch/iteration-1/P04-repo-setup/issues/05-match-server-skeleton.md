# 05: Match server skeleton and match database

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: 02 (Data stores and main server connection)

## What to build

The match server is set up by following the main server, including its database pattern. A developer who has not opened it before finds the same layout, quality rules, settings validation and health checks. It keeps its schema as migrations in its own match database under its own role. It is connected to NestJS messaging over Redis and starts with the one command together with the rest of the system.

Matching requests, matches and the messages exchanged with the main server belong to P08.

## Acceptance criteria

- [x] `match-server` is its own project at the repository root with its own package manifest, pnpm lockfile, lint, format and test configuration. Settings identical to the main server's are copied, not shared.
- [x] Versions, lint rules, format rules and the one-command checks match the main server's. Lint, format, type and test checks pass.
- [x] The folder layout follows the main server's feature module note.
- [x] Settings are validated at startup against a schema, a missing setting stops the server with its name, and an example settings file without secrets lists every setting.
- [x] The server connects to the match database with the match role. It cannot read or write the main database.
- [x] Prisma is pinned exactly at 7.10.0. Schema changes are recorded as migrations, and one command brings an empty match database up to the current schema.
- [x] The server exposes a liveness check and a readiness check. Readiness reports the match database and Redis.
- [x] The server is connected to NestJS messaging over Redis, for request and response.
- [x] The one command that starts the system also starts the match server.
- [x] Tests run against a real PostgreSQL and a real Redis started in containers. Both health checks answer, and startup fails with the setting's name when a required setting is missing.
- [x] Wherever the main server's feature module note was unclear while following it, the note is improved.

## Comments

### Following the main server (2026-09-29)

- These files are byte-for-byte copies of the main server's: `.dockerignore`, `.gitignore`, `.oxlintrc.json`, `.prettierignore`, `.prettierrc`, `nest-cli.json`, `tsconfig.json`, `tsconfig.build.json`, `vitest.config.ts`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `prisma7.config.ts`, `prisma/migrations/migration_lock.toml`, every file in `src/` except `prisma.service.ts` (its comment names the match database), `test/start-app.ts` and `test/settings.e2e-spec.ts`. `package.json` differs only in its name. `.oxlintrc.json` needed no change.
- The lockfile is the main server's, copied. The match server has exactly the main server's dependencies, so `pnpm install --frozen-lockfile` accepted it unchanged and every package has the main server's version. Tickets 03 and 04 resolved theirs afresh only because they removed Prisma.
- The remaining files name the match database, role and port instead of the main server's: `.env.example`, `Dockerfile`, `prisma/schema.prisma`, `README.md` and the tests' settings.
- The match server listens on port 3003, in `.env.example` and in `compose.yaml`. `compose.yaml` gains only the `match-server` service, after the worker server's. Like the main server, it runs with `init: true` and waits for PostgreSQL and Redis to be healthy.

### The match database (2026-09-29)

- The server connects with the `match` role to the `match` database that `infra/postgres/init-databases.sh` already creates. `infra/postgres/` is unchanged. `test/database.e2e-spec.ts` checks that the main database refuses the match role with `permission denied for database "main"`. Pointed at the match database instead, the same test failed, so it does check the separation. The main server's test checks the other direction.
- No migration yet: the schema has no models, so `prisma/migrations/` holds only `migration_lock.toml`. On an empty match database `pnpm db:migrate` prints `No migration found in prisma/migrations` and `No pending migrations to apply` and exits with 0, both in the tests' global setup and in the container. P08's first model records the first migration.
- The whole database cycle was tried in a scratch copy against the compose data stores: a model with the note's UUID identifier, `pnpm exec prisma migrate dev --name add-matching-request` under the match role, `pnpm exec prisma generate`, a service that injects `PrismaService`, and a test through HTTP. `migrate dev` added the first migration next to the lone `migration_lock.toml`, and its shadow database needed only the role's `CREATEDB`, since the match database has no PostGIS. `pnpm test` applied the migration to its empty database and passed. The scratch migration was then removed from the local match database.

### Messaging receives and sends (2026-09-29)

In P08 the main server sends Matching requests, withdrawals and status questions to the match server as requests, and the match server sends one request back, to create the Shared Quest, until the main server answers. The match server therefore keeps both sides, as the main server does: `main.ts` connects it to messaging as a receiver, and `MessagingModule` provides the client. Both files are byte-identical to the main server's.

- Startup stops when Redis cannot be reached, for the main server's reason: the receiving side subscribes to its channels only after its first connection succeeds. It also stops when the database cannot be reached or does not answer within 5 seconds. `test/startup.e2e-spec.ts` covers the three cases.
- As in the main server, Nest's Redis server subscribes only to patterns that have a handler, so a message round trip can be checked once P08 adds handlers.

### Running with the rest (2026-09-29)

- `docker compose up --build` started the match server with the rest. All four servers answered both health checks with 200, and the match server's readiness reported the database and Redis as up.
- `docker compose stop match-server` took 0.44 seconds and the container ended with exit code 143, as the other servers do.
- While it migrates, the image logs `prisma:warn Prisma failed to detect the libssl/openssl version to use`. The main server's image logs the same warning, because `node:24-slim` has no OpenSSL, and its migration runs regardless. It is left for a change that covers every image with Prisma.

### The feature module note (2026-09-29)

- The main server's note was followed in the scratch copy with `nest g module matching`, `nest g controller matching --no-spec` and `nest g service matching --no-spec`. Steps 1, 2 and 4 to 8 worked as written; `pnpm format` fixed the generator's missing trailing comma, as tickets 03 and 04 found.
- Step 3 was unclear. It put stored records in `entities/`, while step 4 puts them in `prisma/schema.prisma` as models, so it was not clear what an `entities/` file holds or where a record's type comes from. Step 3 in `main-server/README.md` now says that a stored record is a Prisma model, that the code uses the type Prisma Client generates (`import { Profile } from '../generated/prisma/client.js'`), and that `entities/` holds a class only when a record needs a shape of its own in responses (`class ProfileEntity implements Profile`). Such a class passed the lint and type checks in the scratch copy.
- `match-server/README.md` carries its own copy of the note, with the database steps and `matching` as the example.
- Left for P08: the note describes features reached over HTTP, with routes in the controller and tests through `supertest`. The match server's features are reached by messages from the main server, and the app never calls it. No message handler exists yet, so the note does not describe one; P08's first handler should add how to write and test one.
