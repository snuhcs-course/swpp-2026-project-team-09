# 01: Settings an Administrator changes, kept in the database and copied to Redis every minute

Parent: [A02 spec](../spec.md) ("The settings store", "The one-minute copy to Redis")
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

The main server keeps settings in a generic `settings` table, with a history of every change. Once a minute, a job in the main server copies every setting into Redis, with the time of the copy. A read takes the setting from Redis, or from the database when Redis is empty. Saving a setting writes only the database: Redis is written by the job alone. Nothing uses the store yet except A02's two names, `llm.key` and `llm.backupKey`.

The job also copies the list of keys (ticket 03 mounts them, ticket 02 reads them). This ticket gives it a slot for that list, filled by a function that returns the env keys only (`OPENROUTER_API_KEY` as `default`, `ANTHROPIC_API_KEY` as `default-anthropic` when set); ticket 02 adds the mounted folder.

## Acceptance criteria

- [ ] Prisma models `Setting` (table `settings`: `name` unique, `value_type` enum `SettingValueType` of `STRING`, `INTEGER`, `BOOLEAN`, `value` text, `updated_at`) and `SettingChange` (table `setting_changes`: name, old value, new value, Administrator or empty, cause `ADMINISTRATOR` or `AUTOMATIC_SWITCH`, time), with one migration.
- [ ] A settings service: read a setting (Redis first, then the database, then the name's default), save a setting (the row and its history row in one transaction, the value checked against its type), and list the history newest first. `llm.key` defaults to `default`, `llm.backupKey` to empty.
- [ ] `@nestjs/schedule` added to main-server (the same major as worker-server's). A job runs every minute and writes into Redis, through the global `REDIS` token, every setting, the key list (names, provider, last 4, added date, never a value) and the copy's time. The copy is written whole, so the 2 replicas both running it do no harm.
- [ ] Saving a setting does not write Redis. A read right after a save still returns Redis's old value until the next copy.
- [ ] The service says, for each setting, whether Redis's copy equals the database's value, and the copy's time, for the admin page's "waiting / applied".
- [ ] The existing env switches in `main-server/src/common/settings.ts` are unchanged.
- [ ] Tests (ADR 0007): integration tests for the transaction, the copy, the read with Redis empty (database), the read before and after a copy, and the waiting/applied answer; unit tests for the type checks.
- [ ] `main-server/README.md` says what the settings store is and that a change shows within a minute.
- [ ] Each changed source file has its AI-generated row; lint, format, type checks and the touched tests pass.

## Comments
