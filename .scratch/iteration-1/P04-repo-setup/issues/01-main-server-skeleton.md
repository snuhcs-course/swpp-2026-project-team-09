# 01: Main server skeleton

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

The main server exists as a runnable NestJS project that every later server copies. A developer installs its dependencies, starts it, and gets an answer from its liveness and readiness checks. Lint, format, type and test checks each run with one command and fail on a violation. The server refuses to start when a required setting is missing and names that setting. A short note tells a teammate new to development how to add a feature module.

Data stores and messaging are not part of this ticket; ticket 02 adds them.

## Acceptance criteria

- [ ] `main-server` is its own project at the repository root with its own package manifest, pnpm lockfile, lint, format and test configuration. There is no root package manifest and no configuration shared with another project.
- [ ] The project uses Node.js 24 LTS, NestJS 12.1.x in standard mode, ES modules and TypeScript 6.0.x in strict mode.
- [ ] The package manifest declares the exact pnpm version, so that every developer runs the same pnpm, whether it is installed globally or run through corepack without installing it.
- [ ] oxlint runs with type-aware rules. The categories correctness, suspicious, pedantic and perf are errors. Explicit `any`, missing explicit return types and non-null assertions are errors.
- [ ] The rule that rewrites imports into type-only imports is off. The categories style and restriction are not enabled as a whole.
- [ ] If type-aware linting does not run with TypeScript 6, the TypeScript compiler runs in strict mode as a separate check. The outcome is recorded under `## Comments` in this ticket.
- [ ] Prettier formats with a print width of 120, single quotes and trailing commas.
- [ ] Lint, format check, type check and tests each run with one command. A lint error makes the lint command fail.
- [ ] Settings are validated at startup against a schema. A missing or invalid setting stops the server with a message naming that setting.
- [ ] An example settings file without secrets lists every setting.
- [ ] The server exposes a liveness check and a readiness check.
- [ ] Each feature lives in its own module and its own folder directly under the source root, with its data transfer objects and entities inside that folder. Code shared across features lives in a `common` folder. The health checks are the first feature module and follow this layout.
- [ ] A short note explains how to add a feature module, step by step, for a teammate new to development.
- [ ] Tests call the server through its public API: both health checks answer, and startup fails with the setting's name when a required setting is missing.
