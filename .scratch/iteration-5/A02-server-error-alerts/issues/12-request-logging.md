# 12: Each main-server request leaves one line with a request ID, and an unexpected error one error line with its stack

Parent: [A02 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

Native files: none. Releases: the main server; a `terraform apply` puts the changed pipeline in place.

## What happens now

The main server logs no request. Nothing ties a warning in `#team9-main-server-error` to the request that caused it, so `kubectl logs` gives no way to find the other lines of that request. An unexpected 500 is logged by NestJS's default handler, with no method, path or User. A request refused with 400, 401, 404 or 429 leaves no line at all.

## What to build

- **A request context.** Node's `AsyncLocalStorage` holds `{ reqId, userId?, startedAt }` for each request, in a global module of its own with no other main-server dependency, so the socket and worker servers can take it over later.
- **A request ID.** The server makes one per request (`crypto.randomUUID()`), never takes the client's, and answers it in an `X-Request-Id` header on every response.
- **The guards** write the User's or the Administrator's ID into the request context, beside `request.user` and `request.administrator`. Who passes does not change.
- **The logger** adds `req_id` and `user_id` to each JSON line written in a request. The text format does not change. Fields of one line (`req_body`, `res_body`) are passed as a plain object, which `ConsoleLogger`'s `flattenParams` puts on the line.
- **A middleware on every route** logs one info line when the response finishes: `<method> <path> <status> <ms>ms`, the path without its query string, and the request and response bodies as `req_body` and `res_body`. `/health/live` and `/health/ready` are not logged.
- **Requests that leave no body**, listed in one constant (`BODILESS_ROUTES`), because the app promises Users that what they carry is not kept: positions (`/positions`, `/walking-route`), the profile (`/users/me/profile`, `/lobby`, a room request's companions), the timetable picture (`/timetable/readings`) and the Assistant (`/assistant/*`). Their line keeps the method, the path, the status, the time, `req_id` and `user_id`. The four kinds were decided on review of PR 542; `/lobby`, the companions and `/walking-route` were found to carry the same values.
- **The bodies** pass one function, apart from the middleware: the value of any field whose name holds `token`, `password`, `secret` or `authorization` (any case, any depth) becomes `"[masked]"`, the text is cut at 2 KB with `…(truncated)`, and a body that is not JSON is written as its type and size only.
- **A global exception filter.** An `HttpException` is answered as now and logged nowhere. Any other error answers `500 { statusCode, message: "Internal server error", requestId }` and logs one error line, `<method> <path> 500 <ms>ms - <name>: <message>`, with the whole stack; NestJS's default handler does not log it again.
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
- [ ] A 400, 404 or 429 thrown on purpose answers as before and logs no error line; an unexpected error answers 500 with `requestId` equal to the header and logs exactly one error line with its stack. (Integration test.)
- [ ] The pipeline test passes, with `req_id` kept and `req_body` and `res_body` dropped. (bats.)
- [ ] For each kind of request that leaves no body, a request carrying a made-up value leaves its line without bodies, and no line holds the value. (Integration test, and a unit test of the list.)
- [ ] The tests that read log lines are listed in the PR's Test Results: which break and which change meaning.

## Out of scope

- Storing the Assistant's conversations for monitoring: its own table, a retention period and a notice to Users, as separate later work.

## Comments
