# P04: Set up prototype repo, services and database

Status: ready-for-agent

## Problem Statement

Development restarts on a clean branch. There is no runnable server, no database and no shared convention. Three of the four team members are new to development and need a worked example they can copy. Nothing else in Iteration 1 can be built until a User can sign in and a server can recognise that User.

## Solution

A repository that holds six independent projects: four servers, the admin site and the mobile app. The four servers start with one command and report their health. A database and a message channel are available to them. Every project enforces the same strict quality rules through its own configuration. A User can sign in with an SNU Google account, stay signed in, sign out and edit a profile.

## User Stories

1. As a developer, I want to start every server and data store with one command, so that I can run the whole system on my laptop.
2. As a developer, I want each server to answer a health check, so that I can tell which part is down.
3. As a developer, I want each project to own its dependencies, lockfile and configuration, so that a change in one project never forces a change in another.
4. As a developer, I want every server to follow the same folder layout, so that I can find code in a server I have not opened before.
5. As a developer, I want lint errors to fail the check, so that loosely typed code does not reach review.
6. As a developer, I want code formatted at a width of 120 columns, so that lines are not broken needlessly.
7. As a developer, I want to run a project's tests with one command, so that I can check my change before opening a pull request.
8. As a developer, I want a server to refuse to start when a required setting is missing and to name that setting, so that I do not debug a half-configured server.
9. As a developer, I want an example settings file without secrets, so that I know which settings to provide.
10. As a developer, I want database changes recorded as migrations, so that every teammate ends up with the same schema.
11. As a developer, I want every record identified by a UUID v4, so that identifiers are uniform across servers.
12. As a developer, I want spatial functions available in the main database, so that the shuttle position can be computed along its route.
13. As a teammate new to development, I want the first server to serve as a pattern, so that I can set up the next server by following it.
14. As a teammate new to development, I want a short note on how to add a feature module, so that I can add one without asking.
15. As a developer, I want the mobile app and the admin site to start and show a placeholder screen, so that screen work can begin on a working base.
16. As an SNU student, I want to sign in with my SNU Google account, so that I do not need another password.
17. As a person with a Google account outside SNU, I want a clear refusal, so that I understand why I cannot enter.
18. As an SNU student, I want to stay signed in for weeks, so that I do not sign in every time I open the app.
19. As an SNU student, I want to sign out, so that nobody else can use my account on this phone.
20. As an SNU student, I want signing out to turn off my Location Sharing, so that my location is not shared after I leave.
21. As an SNU student, I want to view and edit my name, department, admission year and interest hashtags, so that others and Matching know who I am.
22. As an Administrator, I want the system to recognise me by my email address, so that I can manage Global Events without a separate account.
23. As a server other than the main server, I want to verify a User's token by myself, so that I do not call the main server on every request.
24. As an SNU student, I want a request that my phone sent twice to be carried out once, so that nothing I create appears twice.
25. As an SNU student, I want the repeat of a request to get the answer of the first one, so that the app shows the right result after a lost response.
26. As a developer, I want to make a handler safe to repeat with one decorator, so that every feature handles repeats the same way.

## Implementation Decisions

### Repository

- Six projects sit at the repository root: `main-server`, `socket-server`, `worker-server`, `match-server`, `admin` and `mobile`.
- Each project is independent. It has its own package manifest, lockfile, lint configuration, format configuration and test configuration. There is no root package manifest and no configuration file shared between projects. Identical settings are copied.
- The package manager is pnpm.

### Versions

| Tool | Version | Reason |
|---|---|---|
| Node.js | 24 LTS | Required by the NestJS CLI |
| NestJS | 12.1.x | Latest stable |
| TypeScript | 6.0.x | NestJS 12 and the lint tooling support up to 6 |
| Prisma | 7.10.0, pinned exactly | The registry's `latest` tag points at the 8.0 release candidate |
| Vitest | 4.1.x | The version the NestJS starter uses |
| `@nestjs/idempotency` | 0.0.1, pinned exactly | The official module; published 2026-09-25, so every upgrade is a deliberate step |
| PostgreSQL | 18 with PostGIS 3 | Latest stable |
| Redis | 8 | Latest stable |
| Next.js | 16.3.x, newest patch | Latest stable; a security release is announced for 2026-09-30 and is taken when it is out |
| Expo SDK | 57 | Most used SDK; no dependency forces an older one |

### Servers

- Each server is a NestJS project in standard mode, written as ES modules.
- A feature lives in its own module and its own folder directly under the source root, with its data transfer objects and entities inside that folder. Code shared across features of one server lives in a `common` folder.
- The main server is built first. The socket, worker and match servers are set up by following it.
- Each server validates its settings at startup against a schema and stops with a message naming the faulty setting.
- Each server exposes liveness and readiness checks.
- Servers talk to each other through NestJS messaging over Redis: events for signals and positions, request and response where an answer is needed. This task sets up the connection; the messages themselves belong to P07 and P08.

### Quality rules

- The linter is oxlint with type-aware rules. The categories correctness, suspicious, pedantic and perf are errors. Rules added on top include a ban on explicit `any`, explicit return types and a ban on non-null assertions.
- The rule that rewrites imports into type-only imports is off in the servers, because it can break dependency injection.
- The pedantic rule `prefer-readonly-parameter-types` is off. It requires deeply readonly parameter types, which framework and library classes cannot satisfy.
- The categories style and restriction are not enabled as a whole, because they contain rules that contradict each other.
- If type-aware linting does not run with TypeScript 6, the project runs the TypeScript compiler in strict mode as a separate check instead.
- TypeScript runs in strict mode.
- Prettier formats with a print width of 120, single quotes and trailing commas.
- Servers and the admin site test with Vitest. The mobile app tests with Jest.

### Data stores

- One PostgreSQL instance holds two databases with separate roles: one for the main server and one for the match server. No server reads or writes another server's database.
- PostGIS is enabled in the main database.
- The database image is built from the official PostgreSQL image with the PostGIS package added, so it runs without emulation on Apple Silicon. The official PostGIS image under emulation is the fallback.
- Identifiers are UUID v4 values generated by the database.
- One Redis instance serves messaging between servers and the latest locations.

### Sign-in and account

- The app obtains a Google ID token and sends it to the main server. The main server verifies the signature, the audience, the expiry, that the email is verified and that the hosted domain claim equals `snu.ac.kr`. The email address alone is not accepted as proof of the domain.
- A User is identified by the Google subject identifier. The first sign-in creates the User.
- The main server issues an access token valid for 1 hour and a refresh token valid for 30 days. Using a refresh token replaces it. Refresh tokens are stored hashed.
- Access tokens are signed with a private key held only by the main server. Other servers verify them with the public key.
- Signing out revokes the User's refresh tokens and turns the Master Switch off.
- An Administrator is a User whose email address is on a list in the main server's settings. The list is checked on every administrative request.
- The profile holds name, department, admission year and interest hashtags.

### Repeated requests

- A phone can send the same request twice without the User doing anything: the response was lost, or the network library resent it. The main server therefore makes creating requests safe to repeat.
- The main server uses NestJS's official idempotency module, configured as the official documentation describes, with the Redis store from that documentation.
- The client sends a key in the `Idempotency-Key` header. The server runs the handler once for each key and keeps the result for 24 hours.
- Answers to a repeat: a finished request gets the stored status and body with the header `Idempotent-Replayed: true`; a request that is still running gets 409 with `Retry-After`; the same key with a different body or address gets 422.
- A response with a server error is not stored, so the same key can be tried again.
- Keys are scoped to the User. Two Users can send the same key without meeting each other's results.
- Redis is configured never to evict records.
- The module's interceptor runs outside every other global interceptor, as the documentation requires.
- A handler is marked with the module's decorator. Handlers that create something a User would notice twice require the key and refuse a request without one. Which handlers these are is stated in P06, P08 and P12.
- The rules of each feature stay in force. The key removes repeats of one attempt; it does not replace rules such as one Party for each User.
- The module is new. If it proves unusable, the team writes an interceptor with the same header, the same answers and the same retention, so that clients do not change.

### Client projects

- The mobile app is created from the official Expo template with Expo Router. The admin site is created from the official Next.js template with the App Router, a source folder and Tailwind. Both replace the template's TypeScript version with 6.0.x.

## Testing Decisions

- A good test calls the server through its public API and checks the response and the stored result. It does not reach into modules or assert on internal calls.
- Tests run against a real PostgreSQL and a real Redis started in containers.
- The only replaced part is Google's token verification, swapped at the verifier's interface for one that accepts prepared tokens.
- The Redis store passes the contract tests that the idempotency module provides, with concurrency on.
- Repeated requests: the same key twice runs the handler once and returns the same response; two requests with the same key at the same moment; the same key with a different body; the same key from two Users; a key after a server error.
- Covered behaviour: sign-in accepted for an SNU account; refused for another domain, an unverified email, a wrong audience and an expired token; refresh replaces the token and the old one stops working; sign-out revokes; profile validation; Administrator recognised by the list; startup fails on a missing setting; health checks.
- There is no prior art on this branch. The earlier prototype's API-level tests are a reference for style only.

## Out of Scope

- Feature APIs. They belong to P06, P07, P08 and P12.
- A continuous integration workflow. The schedule places it in Iteration 2.
- Cloud deployment. Iteration 1 runs on a laptop behind an HTTPS tunnel.
- SNU single sign-on. The proposal allows SNU single sign-on or SNU Google accounts; this iteration uses Google accounts.
- A shared package for code used by several servers.

## Further Notes

- The repository conventions merged earlier (agent documents, code owners, pull request template) were preparatory work for this task.
- P16 adds a seventh project at the repository root for the tests that run the servers together.
- The schedule names 김태현 as the worker. 윤유상 builds the main server first as the pattern.
- To verify early: type-aware linting with TypeScript 6, the database image on Apple Silicon, and that a real SNU account's ID token carries the hosted domain claim while a Gmail account's does not.
- Backend work that the schedule's frontend tasks assume already exists is assigned as follows: sign-in, account and profile here; timetable and Private Events in P06; administration in P12; everything else in P07 and P08.
