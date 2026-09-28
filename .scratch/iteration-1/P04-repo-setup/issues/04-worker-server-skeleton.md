# 04: Worker server skeleton

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: 02 (Data stores and main server connection)

## What to build

The worker server is set up by following the main server. A developer who has not opened it before finds the same layout, quality rules, settings validation and health checks. It is connected to NestJS messaging over Redis and starts with the one command together with the rest of the system. It keeps no data of its own.

The schedules, the collectors and the messages it sends to the main server belong to P07.

## Acceptance criteria

- [ ] `worker-server` is its own project at the repository root with its own package manifest, pnpm lockfile, lint, format and test configuration. Settings identical to the main server's are copied, not shared.
- [ ] Versions, lint rules, format rules and the one-command checks match the main server's. Lint, format, type and test checks pass.
- [ ] The folder layout follows the main server's feature module note.
- [ ] Settings are validated at startup against a schema, a missing setting stops the server with its name, and an example settings file without secrets lists every setting.
- [ ] The server exposes a liveness check and a readiness check. Readiness reports Redis.
- [ ] The server is connected to NestJS messaging over Redis, for request and response.
- [ ] The server has no database.
- [ ] The one command that starts the system also starts the worker server.
- [ ] Tests call the server through its public API: both health checks answer, and startup fails with the setting's name when a required setting is missing.
- [ ] Wherever the main server's feature module note was unclear while following it, the note is improved.
