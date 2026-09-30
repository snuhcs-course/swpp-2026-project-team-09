# 17: Ready for 1.0/Main

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01–16 (the rest of P04)

## What to build

Before P04 goes into `1.0/Main`, the whole task is reviewed against `1.0/Main` for what shows only once every ticket is in: docs that a later ticket made stale, migrations that record the tickets' steps instead of the schema, and the cause that ticket 15 removed from the main server's health tests but not from the other servers' tests.

## Acceptance criteria

- [x] The spec, the tickets, the READMEs and the code comments describe the code as it is.
- [x] The main database has one migration, which creates the same schema as the five migrations of the tickets.
- [x] No test takes a store away by stopping a container that a running server is connected to.
- [x] `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm build` and `pnpm test` pass in every project that has them.

## Comments

### Review (2026-10-01)

A Standards review and a Spec review of `git diff 1.0/Main...` ran apart, and each finding was checked in the code. Fixed here:

- The spec names the event that tells the socket server a session has ended as part of P04, and says that a refused refresh keeps its one answer, as ticket 07's known limits do.
- Ticket 11 no longer says that a connection stays open after its token expires.
- The idempotency store's comment gives the scope as the User's or the Administrator's id.
- The code, the tests and ticket 07 describe a token without `sid` as a token without a session.
- The mobile README asks for Node.js 24, `.nvmrc` and pnpm 12.6.0 as the other READMEs do.

Left as found:

- `next` stays at 16.3.7. 16.3.8, the security release, was published on 2026-09-30 and is taken after the merge, on a pull request of its own into `1.0/Main`. Ticket 12's criterion stays open until then.
- Tickets merged before the usage rule have no Agent usage section. Ticket 07 still lacks the usage of the sessions that ran on another machine.
- Judgement calls not taken up: `AccessTokenGuard` and `SignedInRequest` cover only Users; the Google claim checks of the two sign-ins have the same shape; the worker and match servers get no `.env` through Compose; the warning on an unreadable Google name logs the email address (ticket 08).

### One migration (2026-10-01)

- `20260928130509_init` replaces `enable_postgis`, `add_users_and_refresh_tokens`, `add_administrators`, `add_sessions` and `add_profile`. It is the output of `prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script`, with PostGIS enabled first, as ticket 02 decided. The diff's `CREATE SCHEMA IF NOT EXISTS "public"` is left out, because the database has the schema.
- It keeps the first migration's timestamp, so a migration recorded on top of P04 before this change still sorts after it.
- Checked on the test database image: a database migrated with the five migrations and one migrated with `init` give the same `pg_dump --schema-only`, apart from the order of the columns, which now follows `schema.prisma`. `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` finds no difference, and `prisma migrate status` finds the database up to date.
- A database that applied the five migrations is reset with `docker compose down -v`, then `pnpm db:migrate`.

### Stores taken away through a proxy (2026-10-01)

- Ticket 15 found that a container stopped while a server is connected to it leaves its port open for a moment on Docker Desktop, so that the server cannot close cleanly, and moved the main server's health tests to a proxy (`test/proxy.ts`). The health tests of the socket, worker and match servers and the main server's "Sessions with Redis down" still stopped a container of their own.
- They now reach the shared store through `test/proxy.ts`, copied from the main server, and stop the proxy once the server runs. They start no containers of their own.
- The failure was not reproduced in these tests. The change removes the cause that ticket 15 reproduced.
- The other servers' `startApp` does not listen on a port, unlike the main server's since ticket 07. Their tests send a few requests one after another, not the bursts that made the main server's tests fail.
- The four servers' suites each passed three runs in a row with the change.

### Agent usage (2026-10-01)

- Agent time: about 21 minutes, an estimate, for the one session that did the work, counted from its transcript up to the writing of this section. About 17 minutes waiting for answers are left out; time spent waiting for tests and subagents is kept. Its two subagents, the Standards and the Spec review of about 6 and 4 minutes, ran inside it, beside a run of every project's checks.
- Tokens, for the session and its two subagents, counted when this section was written:
  - Input: 24,433,090 in total, of which 23,850,762 were cache reads, 582,004 cache writes and 324 uncached.
  - Output: 72,918. The subagents' transcripts record only a few output tokens for most of their steps, so their share, 1,085, is a lower bound.
