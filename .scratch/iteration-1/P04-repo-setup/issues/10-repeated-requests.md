# 10: Make creating requests safe to repeat

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: 06 (Sign in with an SNU Google account)

## What to build

A phone can send the same request twice without the User doing anything, because the response was lost or the network library resent it. With this ticket, a request sent twice is carried out once, and the repeat gets the answer of the first attempt. A developer makes a handler safe to repeat with one decorator, so that every feature handles repeats the same way.

Which handlers use it is decided in P06, P08 and P12.

## Acceptance criteria

- [x] `@nestjs/idempotency` is pinned exactly at 0.0.1 and configured as the official documentation describes, with the Redis store from that documentation.
- [x] The Redis store passes the contract tests that the module provides, with concurrency on.
- [x] The client sends a key in the `Idempotency-Key` header. The handler runs once for each key, and the result is kept for 24 hours.
- [x] A repeat of a finished request gets the stored status and body with the header `Idempotent-Replayed: true`.
- [x] A repeat while the first request is still running gets 409 with `Retry-After`.
- [x] The same key with a different body or address gets 422.
- [x] A response with a server error is not stored, so the same key can be tried again.
- [x] Keys are scoped to the User. Two Users can send the same key without meeting each other's results.
- [x] The module's interceptor runs outside every other global interceptor.
- [x] A handler is marked with the module's decorator. The decorator can require the key, and a marked handler that requires it refuses a request without one.
- [x] A short note beside the feature module note explains how to make a handler safe to repeat.
- [x] Tests through the public API cover: the same key twice runs the handler once and returns the same response; two requests with the same key at the same moment; the same key with a different body; the same key from two Users; a key after a server error. Until feature handlers exist, the tests may use a marked handler that exists only in the tests.
- [x] If the module proves unusable, a team-written interceptor replaces it with the same header, the same answers and the same retention, so that clients do not change. The decision is recorded under `## Comments` in this ticket.

## Comments

### The module and its Redis store (2026-09-29)

The module is usable, so no team-written interceptor replaces it. `@nestjs/idempotency` is pinned at `0.0.1` and set up
as [the documentation](https://docs.nestjs.com/reliability/idempotency) describes (its source,
`content/reliability/idempotency.md` in `nestjs/docs.nestjs.com`, last changed on 2026-09-25) and as the package's code
does.

- **Store**: the package ships no Redis store; the documentation writes one for the app to add, four Lua scripts that
  Redis runs atomically. It is `src/common/redis-idempotency.store.ts`, as written there apart from the import of
  `REDIS`, a return type, formatting, a header comment and the lint directive (see Lint below). It registers itself with `IdempotencyStorage` in its constructor and is a
  provider of `AppModule`. At startup the server logs `IdempotencyStorage: RedisIdempotencyStore`.
- **Redis client**: the documentation's `RedisModule` is `src/common/redis.module.ts`, a global module with an ioredis
  client under `REDIS`, built from `REDIS_HOST` and `REDIS_PORT` and closed with `quit()` in
  `onApplicationShutdown()`. It is a second connection next to messaging's, so no setting was added. A record is a
  hash at `idem:<User id>:<key>`. Redis already runs with `noeviction` (ticket 02). The servers share one Redis, and
  the documentation asks each service that keeps idempotency records there for a key prefix of its own; `idem:` is
  enough while only the main server keeps them.
- **Contract tests**: `test/redis-idempotency-store.e2e-spec.ts` runs `idempotencyStoreContract()` with
  `concurrent: true` (16 callers per race) against the test Redis. It passes no `advanceTime`, because Redis expires
  records on its own clock, so the expiry cases wait in real time and the file takes about 11 seconds. The
  documentation ran this store only against an in-process fake and asks for a run against a real Redis; all 19 cases
  pass.
- **Options**: only `scope` is set. The defaults match the spec: the `Idempotency-Key` header, `ttl` 24 hours,
  `storeIf` status below 500, `retryAfter` 1 second (`Retry-After: 1`) and `lockTtl` 60 seconds. A test reads the
  stored record's lifetime in Redis, so a changed default would fail it. Stored responses are not encrypted; the spec
  does not ask for it. Turn on `encryption` (see "Encrypt stored receipts" in the documentation) before a handler
  stores personal data, if wanted.
- **Scope**: `scope: (request) => request.user?.id`. Guards run before interceptors, so `AccessTokenGuard` has set the
  User. A `@Public()` route has no User, and its keys would share one namespace without a warning, because a scope is
  set. The README therefore says not to mark a `@Public()` route.

### Where the interceptor runs (2026-09-29)

`IdempotencyModule` registers its interceptor as `APP_INTERCEPTOR`. Global interceptors run in the order they are
registered: those in `AppModule`'s own providers first, then those of the imported modules, in import order.
`IdempotencyModule` is imported before the feature modules, and `AppModule` has no `APP_INTERCEPTOR`, so the idempotency
interceptor runs outside every other global interceptor. There is no other one yet. The module warns at startup when a
global interceptor runs outside it and refuses to start when that one is `ClassSerializerInterceptor`. `app.module.ts`
and the README say where to register one.

The interceptor reaches HTTP handlers only. `main.ts` connects the Redis listener without `inheritAppConfig`, so no
global enhancer applies to message handlers: not `AccessTokenGuard`, not the validation pipe, not this interceptor.
`@Idempotent()` on a `@MessagePattern()` handler therefore does nothing yet. P08 plans that the main server handles a
match identifier once; it has to choose between `inheritAppConfig` and `@UseInterceptors(IdempotencyInterceptor)` on
that handler, with a key from the payload (`keyFrom`) and a `scope` for `rpc`.

### Tests (2026-09-29)

No feature marks a handler yet, so `test/idempotency.e2e-spec.ts` passes a controller of its own to `startApp`, which
takes test-only controllers as a new second parameter. Its handler counts its runs, and the test with two requests at
the same moment holds the first run until the second one has been answered 409, instead of waiting a fixed time. The
documentation's "Testing" section replaces the store with `InMemoryIdempotencyStore` in end-to-end tests; these keep
the Redis store, because the spec runs the tests against a real Redis.

Breaking the setup made the matching tests fail: storing server errors (`storeIf: () => true`), removing the owner
check from the store's `COMPLETE` script (6 contract cases), leaving out `scope` (the second User got the first User's
stored response) and leaving out the store (no record in Redis).

### Lint (2026-09-29)

The documentation's store breaks three rules: `no-non-null-assertion` (`response!`), `no-unsafe-type-assertion`
(`as AcquireReply`) and `no-unsafe-assignment` (`JSON.parse`). 윤유상 chose a file-level `oxlint-disable` for these
three rules, so that the store stays as the documentation writes it; other rules still apply in that file.
`.oxlintrc.json` is unchanged.

When Redis cannot be reached, the new client logs `[ioredis] Unhandled error event` on each reconnection attempt,
because the documentation's module attaches no error listener. The startup test that points Redis at port 1 shows it
once.
