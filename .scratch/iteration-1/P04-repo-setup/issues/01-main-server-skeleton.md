# 01: Main server skeleton

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

The main server exists as a runnable NestJS project that every later server copies. A developer installs its dependencies, starts it, and gets an answer from its liveness and readiness checks. Lint, format, type and test checks each run with one command and fail on a violation. The server refuses to start when a required setting is missing and names that setting. A short note tells a teammate new to development how to add a feature module.

Data stores and messaging are not part of this ticket; ticket 02 adds them.

## Acceptance criteria

- [x] `main-server` is its own project at the repository root with its own package manifest, pnpm lockfile, lint, format and test configuration. There is no root package manifest and no configuration shared with another project.
- [x] The project uses Node.js 24 LTS, NestJS 12.1.x in standard mode, ES modules and TypeScript 6.0.x in strict mode.
- [x] The package manifest declares the exact pnpm version, so that every developer runs the same pnpm, whether it is installed globally or run through corepack without installing it.
- [x] oxlint runs with type-aware rules. The categories correctness, suspicious, pedantic and perf are errors. Explicit `any`, missing explicit return types and non-null assertions are errors.
- [x] The rule that rewrites imports into type-only imports is off. The categories style and restriction are not enabled as a whole.
- [x] If type-aware linting does not run with TypeScript 6, the TypeScript compiler runs in strict mode as a separate check. The outcome is recorded under `## Comments` in this ticket.
- [x] Prettier formats with a print width of 120, single quotes and trailing commas.
- [x] Lint, format check, type check and tests each run with one command. A lint error makes the lint command fail.
- [x] Settings are validated at startup against a schema. A missing or invalid setting stops the server with a message naming that setting.
- [x] An example settings file without secrets lists every setting.
- [x] The server exposes a liveness check and a readiness check.
- [x] Each feature lives in its own module and its own folder directly under the source root, with its data transfer objects and entities inside that folder. Code shared across features lives in a `common` folder. The health checks are the first feature module and follow this layout.
- [x] A short note explains how to add a feature module, step by step, for a teammate new to development.
- [x] Tests call the server through its public API: both health checks answer, and startup fails with the setting's name when a required setting is missing.

## Comments

### Type-aware linting with TypeScript 6 (2026-09-28)

Type-aware linting runs on this TypeScript 6 project. `oxlint --type-aware` (oxlint 1.85.0) hands the type-aware rules to oxlint-tsgolint 7.0.2003. tsgolint brings its own type checker, built on typescript-go (TypeScript 7), and does not use the project's `typescript` package. It reads the project's `tsconfig.json` (TypeScript 6.0.3) without errors. A probe file with a floating promise and an unsafe `any` return was reported by `typescript/no-floating-promises` and `typescript/no-unsafe-return`, and `pnpm lint` exited with code 1.

The TypeScript compiler still runs in strict mode as the separate `pnpm typecheck` command (`tsc --noEmit`). It is one of the four one-command checks anyway, and it is the only check that uses TypeScript 6 itself.

### oxlint rule options for NestJS (2026-09-28)

Two pedantic rules stay errors but take options, because NestJS code cannot meet them as written. The socket, worker and match servers copy these options.

- `typescript/no-extraneous-class` with `allowWithDecorator: true`: every Nest module is an empty class carrying `@Module`.
- `typescript/prefer-readonly-parameter-types` with `checkParameterProperties: false`: Nest injects services through constructor parameter properties. A `Readonly<>` type there emits `Object` as the injection token, and injection fails. Handler parameters are still checked. Wrapping a DTO class in `Readonly<>` would hide it from validation pipes in the same way, so revisit this option when the first DTO arrives. Ticket 02 added `ConfigService` to the rule's `allow` list (2026-09-29), so that Nest's documented `useFactory: (configService: ConfigService) => …` works as written.
