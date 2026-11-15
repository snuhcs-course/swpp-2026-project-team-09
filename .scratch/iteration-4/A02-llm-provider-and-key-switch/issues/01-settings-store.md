# 01: Global settings, registered in code, kept in the database and copied into each pod

Parent: [A02 spec](../spec.md) ("The settings store", "The in-memory copy in each pod")
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

The main server keeps global settings in a generic `settings` table, with a history of every change and a one-row revision. The settings are registered in code. Each pod loads them into memory at start and, every minute at second 0, reloads them when the revision changed. The store is generic: ticket 02 registers A02's one setting, `llm.key`.

## Acceptance criteria

- [ ] A registry in code: each setting's name, type (`STRING`, `INTEGER`, `BOOLEAN`), default and allowed values. Allowed values may be known only at start, as `llm.key`'s are (the names of the keys the pod has, ticket 02). The tests register settings of their own.
- [x] Prisma models `Setting` (table `settings`: `name` unique, `value_type` enum `SettingValueType`, `value` text, `updated_at`), `SettingChange` (table `setting_changes`: name, old value, new value, Administrator, time) and a one-row revision table, with one migration.
- [x] A save checks the name against the registry and the value against its type and allowed values, and writes the setting, its history row and the revision's increment in one transaction. The service takes an extra check from the caller, so that ticket 02 can refuse a key name the pod has no key for.
- [x] At start (`onModuleInit`), each pod loads every row and the revision. A pod that cannot load them does not start. A setting with no row reads as its default.
- [x] `@nestjs/schedule` added to main-server (the same major as worker-server's). `@Cron('0 * * * * *')` reads only the revision and reloads all rows when it changed. A failed check keeps the last copy and logs.
- [x] Reads come from the copy, with no query. A save is not seen by any pod, the saving one included, before the next minute's check.
- [x] The service gives the history newest first, and, for the admin page, the time a save applies (the next minute at second 0).
- [x] No Redis is used. The existing env switches in `main-server/src/common/settings.ts` are unchanged.
- [x] Tests (ADR 0007): unit tests of the registry's checks; integration tests of the one transaction, the start-up load, the minute check reloading on a new revision and not otherwise, a failed check keeping the copy, and a save not read before the check.
- [x] `main-server/README.md` says what the settings are, how to register one, and that a change applies at the next minute.
- [x] Each changed source file has its AI-generated row; lint, format, type checks and the touched tests pass.

## Comments

### Agent usage (2026-11-15)

- Agent time: about 30 minutes in one session (Opus 5.5, worktree `/workspace/a02-01`). An estimate.
- Tokens, estimated: input about 3.3M, of which about 3.1M cache reads and 0.15M cache writes; output about 30k. No
  subagents.
