# 05: Match server skeleton and match database

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: 02 (Data stores and main server connection)

## What to build

The match server is set up by following the main server, including its database pattern. A developer who has not opened it before finds the same layout, quality rules, settings validation and health checks. It keeps its schema as migrations in its own match database under its own role. It is connected to NestJS messaging over Redis and starts with the one command together with the rest of the system.

Matching requests, matches and the messages exchanged with the main server belong to P08.

## Acceptance criteria

- [ ] `match-server` is its own project at the repository root with its own package manifest, pnpm lockfile, lint, format and test configuration. Settings identical to the main server's are copied, not shared.
- [ ] Versions, lint rules, format rules and the one-command checks match the main server's. Lint, format, type and test checks pass.
- [ ] The folder layout follows the main server's feature module note.
- [ ] Settings are validated at startup against a schema, a missing setting stops the server with its name, and an example settings file without secrets lists every setting.
- [ ] The server connects to the match database with the match role. It cannot read or write the main database.
- [ ] Prisma is pinned exactly at 7.10.0. Schema changes are recorded as migrations, and one command brings an empty match database up to the current schema.
- [ ] The server exposes a liveness check and a readiness check. Readiness reports the match database and Redis.
- [ ] The server is connected to NestJS messaging over Redis, for request and response.
- [ ] The one command that starts the system also starts the match server.
- [ ] Tests run against a real PostgreSQL and a real Redis started in containers. Both health checks answer, and startup fails with the setting's name when a required setting is missing.
- [ ] Wherever the main server's feature module note was unclear while following it, the note is improved.
