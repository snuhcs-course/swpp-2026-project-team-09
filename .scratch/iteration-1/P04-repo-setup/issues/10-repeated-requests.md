# 10: Make creating requests safe to repeat

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: 06 (Sign in with an SNU Google account)

## What to build

A phone can send the same request twice without the User doing anything, because the response was lost or the network library resent it. With this ticket, a request sent twice is carried out once, and the repeat gets the answer of the first attempt. A developer makes a handler safe to repeat with one decorator, so that every feature handles repeats the same way.

Which handlers use it is decided in P06, P08 and P12.

## Acceptance criteria

- [ ] `@nestjs/idempotency` is pinned exactly at 0.0.1 and configured as the official documentation describes, with the Redis store from that documentation.
- [ ] The Redis store passes the contract tests that the module provides, with concurrency on.
- [ ] The client sends a key in the `Idempotency-Key` header. The handler runs once for each key, and the result is kept for 24 hours.
- [ ] A repeat of a finished request gets the stored status and body with the header `Idempotent-Replayed: true`.
- [ ] A repeat while the first request is still running gets 409 with `Retry-After`.
- [ ] The same key with a different body or address gets 422.
- [ ] A response with a server error is not stored, so the same key can be tried again.
- [ ] Keys are scoped to the User. Two Users can send the same key without meeting each other's results.
- [ ] The module's interceptor runs outside every other global interceptor.
- [ ] A handler is marked with the module's decorator. The decorator can require the key, and a marked handler that requires it refuses a request without one.
- [ ] A short note beside the feature module note explains how to make a handler safe to repeat.
- [ ] Tests through the public API cover: the same key twice runs the handler once and returns the same response; two requests with the same key at the same moment; the same key with a different body; the same key from two Users; a key after a server error. Until feature handlers exist, the tests may use a marked handler that exists only in the tests.
- [ ] If the module proves unusable, a team-written interceptor replaces it with the same header, the same answers and the same retention, so that clients do not change. The decision is recorded under `## Comments` in this ticket.
