# 12: Each main-server request leaves one line with a request ID, and an unexpected error one error line with its stack

Parent: [A02 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

Native files: none. Releases: the main server; a `terraform apply` puts the changed pipeline in place.

## What happens now

The main server logs no request. Nothing ties a warning in `#team9-main-server-error` to the request that caused it, so `kubectl logs` gives no way to find the other lines of that request. An unexpected 500 is logged by NestJS's default handler, with no method, path or User. A request refused with 400, 401, 404 or 429 leaves no line at all.

## What to build

- **A request context.** Node's `AsyncLocalStorage` holds `{ reqId, userId?, startedAt }` for each request, in a file of its own with no other main-server dependency, so the socket and worker servers can take it over later.
- **A request ID**, made by a middleware on every path, before the guards, as NestJS's "Async Local Storage" recipe does: `crypto.randomUUID()`, never the client's, answered in an `X-Request-Id` header, and the request's context opened. The middleware logs nothing.
- **The guards** write the User's or the Administrator's ID into the request context, beside `request.user` and `request.administrator`. Who passes does not change.
- **The logger** adds `req_id` and `user_id` to each JSON line written in a request. The text format does not change. Fields of one line (`req_body`, `res_body`) are passed as a plain object, which `ConsoleLogger`'s `flattenParams` puts on the line.
- **One line per request, each piece where NestJS's documentation puts it.** A global interceptor (`next.handle().pipe(tap(...))`) writes the info line of a request its handler answered, `<method> <path> <status> <ms>ms`, the path without its query string, with the request body and the handler's answer as `req_body` and `res_body`; the status is the one the client gets, `@HttpCode` and `@Redirect()` included. It sits inside the idempotency interceptor, which must stay outermost, so a replayed answer leaves no line. `/health/live` and `/health/ready` are not logged.
- **Requests that leave no body**, listed in one constant (`BODILESS_ROUTES`), because the app promises Users that what they carry is not kept: positions (`/positions`, `/walking-route`, `/places/at`, a late report, a Plan made, changed or bettered, an invitation's card), the profile (`/users/me/profile`, `/lobby`, a room request's companions), the timetable picture (`/timetable/readings`) and the Assistant (`/assistant` and every path under it, the one prefix; every other route is an exact path); and the shuttles' positions (`/shuttle/vehicles`, `/shuttle/vehicles/collected`), of which Production keeps no history. Their line keeps the method, the path, the status, the time, `req_id` and `user_id`. The four kinds were decided on review of PR 542; `/lobby`, the companions and `/walking-route` were found to carry the same values.
- **The bodies** pass one function, apart from the interceptor and the filter: the value of any field whose name holds `token`, `password`, `secret` or `authorization` (any case, any depth) becomes `"[masked]"`, the text is cut at 2 KB with `…(truncated)`, and a body that is not JSON is written as its type and size only.
- **A global exception filter** writes the line of every request that ended in an exception, and nothing else logs it. An `HttpException` (a guard's 401 or 403, a validation's 400, a 404 for no route, a 429) is answered as now, with an info line whose `res_body` is that answer. Any other error answers `500 { statusCode, message: "Internal server error", requestId }`, and its one line is an error line, `<method> <path> 500 <ms>ms - <name>: <message>`, with the whole stack and the request's body; NestJS's default handler does not log it again.
- **Fluent Bit** keeps `req_id` on the main server's posts. `req_body` and `res_body` stay off its allowlist, and the pipeline test shows that a body never reaches the output.
- **Docs**: the main server's README "Logging" gives the lines, `X-Request-Id`, the masking and the filter's rules; the infra README gives the command that finds a request by `req_id`; the README sentences that promise no position or conversation reaches a log are reworded truthfully.

## Acceptance criteria

- [ ] The body function masks a nested `accessToken`, `refreshToken`, `idToken` and `password`, cuts a body over 2 KB, and writes a body that is not JSON as its type and size. (Unit test.)
- [ ] A JSON line written in a request context holds `req_id` and `user_id`; one written outside holds neither; the text format is unchanged. (Unit test.)
- [ ] Every response has an `X-Request-Id`, different for each request. (Integration test.)
- [ ] The request line holds the method, the path, the status, the time, `req_body` and `res_body`, and no query value. (Integration test.)
- [ ] After a sign-in and a refresh, no token value from their responses appears in any log line. (Integration test.)
- [ ] A 401 from a guard and a 404 for an unknown path each leave a request line; `/health/live` and `/health/ready` leave none. (Integration test.)
- [ ] A warning logged inside a handler has the same `req_id` as its request line. (Integration test, through the Log test route.)
- [ ] Each request leaves exactly one line, whether its handler answered it, a guard refused it or no route matched it; the line's status is the client's under `@HttpCode` and `@Redirect()`. (Integration test.)
- [ ] A 400, 404 or 429 thrown on purpose answers as before and leaves one info line with that answer as its body; an unexpected error answers 500 with `requestId` equal to the header and leaves exactly one line, an error line with its stack and the request's body. (Integration test.)
- [ ] The pipeline test passes, with `req_id` kept and `req_body` and `res_body` dropped. (bats.)
- [ ] For each kind of request that leaves no body, a request carrying a made-up value leaves its line without bodies, and no line holds the value. (Integration test, and a unit test of the list.)
- [ ] The tests that read log lines are listed in the PR's Test Results: which break and which change meaning.

## Out of scope

- Storing the Assistant's conversations for monitoring: its own table, a retention period and a notice to Users, as separate later work.

## Comments

### Agent usage (2026-11-27)

- Agent time: about 2 hours, an estimate. The session that built it (PR 542) recorded no figures in its stop note; this is read from that note and the PR's size.
- Tokens: not measured; that session's stop note gives none.
