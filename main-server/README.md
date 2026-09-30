# main-server

The main SNU Now server. The other servers copy its layout, settings and checks.

## Run it

You need Node.js 24 and Docker. With nvm, `nvm install` and `nvm use` read `.nvmrc` at the repository root. The
commands below use pnpm 12.6.0, the version declared in `package.json`. If `pnpm -v` prints another version, type
`npx pnpm@12.6.0` wherever this file says `pnpm`: npm fetches it into its cache without a global install.

First create your settings file in `main-server/`. The second command appends a new access token key pair of your own
to it; `.env` is never committed, so the private key stays on your laptop:

```bash
pnpm install
cp .env.example .env
pnpm keys:generate >> .env
```

`.env.example` already holds the team's Google client IDs in `GOOGLE_APP_CLIENT_ID` and `GOOGLE_ADMIN_CLIENT_ID` (see
[Sign-in](#sign-in)). Replace the example address in `INITIAL_ADMINISTRATOR_EMAILS` with your own (see
[Administrators](#administrators)).

To run the whole system, in the repository root:

```bash
docker compose up --build
```

This starts PostgreSQL, Redis and every server. The main server takes its settings from `main-server/.env` and brings
its database up to the current schema before it starts. `docker compose down` removes the containers and keeps the
database; `docker compose down -v` deletes it too.

While you work on the main server, start only the data stores in the repository root and run the server yourself in
`main-server/`:

```bash
docker compose up -d postgres redis
```

```bash
pnpm db:migrate
pnpm start:dev
```

The server answers two health checks:

- `GET http://localhost:3000/health/live`: liveness, the process is up.
- `GET http://localhost:3000/health/ready`: readiness, the database and Redis can be reached. It answers 503 and names
  the store when one cannot.

If a setting in `.env` is missing or invalid, the server stops and names it, for example
`Config validation error: PORT: Invalid input: expected string, received undefined`.

The server also stops at startup when it cannot reach the database or Redis, and its log names the address it tried,
for example `Can't reach database server at localhost:5432`. It waits at most 5 seconds for the database to answer.
Start them first with `docker compose up -d postgres redis`.
Once the server is running, a store that goes down makes readiness answer 503 instead.

## Sign-in

The app signs in with Google and sends the ID token it gets to the main server:

- `POST /auth/google` with `{ "idToken": "..." }` answers `200 { "accessToken": "...", "refreshToken": "..." }` for a
  Google account that has a User.
- An account without a User gets 422 with `"code": "PROFILE_REQUIRED"` and stores nothing. The body's `suggestion`
  holds `{ "name": ..., "department": ... }` read from the Google account's name, which for an SNU account reads
  `홍길동 / 학생 / 컴퓨터공학부`; each is `null` when it cannot be read. The app's onboarding starts from it and then
  sends `{ "idToken": "...", "profile": { "name": "...", "department": "..." } }`, which creates the User and answers
  200 as above. `profile` is checked like the rest of the body, and on an account that has a User it changes nothing.
- Only SNU accounts get in: the token's hosted domain claim must be `snu.ac.kr` and its email address verified. Another
  account gets 403. An invalid or expired ID token, or one issued to another client than the app's
  (`GOOGLE_APP_CLIENT_ID`), the admin site's included, gets 401.
- The access token is valid for 1 hour, and its audience is `snu-now-app`. It names the User (`sub`) and the session
  (`sid`). Send it as `Authorization: Bearer <accessToken>`. `GET /users/me` answers the signed-in User. The refresh
  token is valid for 30 days, and only its hash is stored.
- A User has one session: the app signed in on one phone. A sign-in ends the session before it, on whatever phone. The
  ended session's refresh token gets 401, and its access tokens get 401 from the next request on, with
  `"code": "SESSION_REPLACED"` in the body, so that the app can tell the User that a sign-in on another phone signed
  them out.
- Once the access token has expired, `POST /auth/refresh` with `{ "refreshToken": "..." }` and no access token answers
  with new tokens of the same session, in the same form. The refresh token is used up: the answer holds a new one,
  valid for 30 days from the refresh. An unknown, expired or revoked refresh token gets 401.
- A used refresh token that comes back within 60 seconds of its use gets new tokens of the same session, so a refresh
  whose answer was lost, or two refreshes sent at the same moment, keep the User signed in. Later the server takes it
  for a stolen copy: it ends the session, and the app has to sign in again.
- `POST /auth/sign-out` with the access token answers 204. It ends the session and revokes its refresh tokens. The
  session's access tokens then get the plain 401, a second sign-out included, so the app takes a 401 to sign-out as
  done.
- Sessions are kept in the database, and every User's request reads its session, so an access token stops working as
  soon as its session ends. The main server then tells the socket server, which disconnects the session's connections.

`GOOGLE_APP_CLIENT_ID` and `GOOGLE_ADMIN_CLIENT_ID` are the OAuth client IDs of the app and the admin site; startup
stops when they are the same. They are not secrets. Access tokens are signed with ES256 and
`ACCESS_TOKEN_PRIVATE_KEY`. Another server that checks them is given only `ACCESS_TOKEN_PUBLIC_KEY`, never the private
key; the socket server is the first, in ticket 11. It accepts a User's access token only, disconnects the connections
of a session that ends, and closes each connection when its access token expires.

## Profile

A User reads and edits their own profile. The routes name no User, so they never reach another User's profile.

- `GET /users/me/profile` answers `{ "name": ..., "department": ..., "admissionYear": ..., "hashtags": [...] }`. A new
  User has the name and department given at [sign-in](#sign-in), no admission year (`null`) and no hashtags (`[]`).
- `PATCH /users/me/profile` with some of these fields changes only those and answers with the whole profile. `null`
  empties `admissionYear`, and `[]` empties `hashtags`. The name and the department cannot be emptied.
- A value outside these limits gets 400 with a message that starts with the field, and nothing changes. Spaces around
  text are dropped first. The limits are set in `src/users/dto/update-profile.dto.ts`, and the sign-in's `profile`
  follows the same ones.
  - `name`: 1 to 30 characters.
  - `department`: 1 to 50 characters. A double major is written out, such as `컴퓨터공학부, 경제학부`.
  - `admissionYear`: a whole number from 1946, when SNU was founded, to this year in Korea.
  - `hashtags`: at most 20. Each is kept without the `#` in front, in the case sent, and then has 1 to 30 characters
    without whitespace. None may appear twice, whatever the case.

## Administrators

An Administrator is not a User, even when the same person also uses the app. Administrators sign in to the admin site,
are kept in their own table and get access tokens of their own. They never appear among Users, and a User's access
token and an Administrator's are each refused where the other belongs.

Signing in and out:

- `POST /admin/auth/google` with `{ "idToken": "..." }` answers `200 { "accessToken": "..." }`. The ID token must be
  issued to the admin site's client (`GOOGLE_ADMIN_CLIENT_ID`); one issued to the app's gets 401. Any Google domain is
  accepted, but the email address must be verified and registered; otherwise 403. Signing in creates no User.
- The first sign-in binds the Google account to the registered address. After it the Administrator is recognised by the
  account, and another account with the same address gets 403.
- The access token has the audience `snu-now-admin`, the Administrator's id and no email address. It is valid for 8
  hours and comes without a refresh token: when it expires, the admin site sends the person through Sign in with Google
  again. There is no idle timeout; ticket 14 says why.
- `POST /admin/auth/sign-out` answers 204 and ends every access token issued to that Administrator so far, in every
  browser. A new sign-in works afterwards.

Registering and removing:

- When the server starts with no Administrator registered, as on a new database, it registers the addresses in
  `INITIAL_ADMINISTRATOR_EMAILS`. After that the setting registers nobody, but it must still hold valid addresses.
- `GET /admin/administrators` lists the Administrators as `{ id, email, signedIn }`, ordered by email address.
- `POST /admin/administrators` with `{ "email": "..." }` registers an address of any Google domain and answers 201 with
  the Administrator. Case is ignored. Registering an address that is already registered changes nothing and answers 201
  with the existing record.
- `DELETE /admin/administrators/:id` removes an Administrator, the caller included, and answers 204. An unknown id gets
  404 and an id that is not a UUID 400. Removing the last one gets 409, also when two Administrators remove each other
  at the same moment.

Mark an administrative route, or a whole controller, with `@AdministratorOnly()` from
`src/common/administrator-only.decorator.ts`, and put its path under `/admin`:

```ts
@AdministratorOnly()
@Controller('admin/events')
export class AdminEventsController {
```

- It needs an Administrator's access token in `Authorization: Bearer <accessToken>`. A request without one, or with a
  User's access token or a Google ID token, gets 401.
- Every request reads the Administrator, so a removed Administrator, or a token issued before their last sign-out, gets
  401 at once.
- A handler reads the signed-in Administrator with `@CurrentAdministrator() administrator: SignedInAdministrator`, as
  `src/auth/administrator-auth.controller.ts` does.
- In a test, `signInAsAdministrator(app)` from `test/sign-in.ts` signs in as `admin@example.com`, the initial
  Administrator of the test settings, and `signInAsNewAdministrator(app)` registers a new one and signs in as them. The
  test files share one database, so sign out or remove only a new one.

## Checks

Each command fails when it finds a problem. Run all four before opening a pull request.

| Command             | Checks                                       |
| ------------------- | -------------------------------------------- |
| `pnpm lint`         | oxlint with type-aware rules                 |
| `pnpm format:check` | Prettier formatting (`pnpm format` fixes it) |
| `pnpm typecheck`    | TypeScript in strict mode                    |
| `pnpm test`         | Vitest tests in `test/`                      |

`pnpm test` needs Docker running. It starts its own PostgreSQL and Redis containers and removes them afterwards.

## Folder layout

```text
prisma/
├── schema.prisma                    database schema
└── migrations/                      every schema change, applied in order
src/
├── main.ts                          starts the server and connects it to messaging
├── app.module.ts                    root module, imports every feature module
├── common/                          code shared by two or more features
│   ├── settings.ts                  settings schema, checked at startup
│   ├── prisma.module.ts             makes PrismaService available to every feature
│   ├── prisma.service.ts            the main database
│   ├── messaging.module.ts          makes the messaging client available to every feature
│   ├── messaging.ts                 options for NestJS messaging over Redis
│   ├── redis.module.ts              makes a Redis client available to every feature
│   ├── redis-idempotency.store.ts   keeps the results of requests safe to repeat in Redis
│   ├── route-access.ts              who may call a route: anyone, a User or an Administrator
│   ├── public.decorator.ts          @Public(): opens a route to requests without an access token
│   ├── administrator-only.decorator.ts  @AdministratorOnly(): gives a route to Administrators
│   ├── current-user.decorator.ts    @CurrentUser(): the signed-in User in a handler
│   └── current-administrator.decorator.ts  @CurrentAdministrator(): the signed-in Administrator
├── generated/                       Prisma Client, generated by `pnpm install` (not committed)
├── health/                          a feature: the liveness and readiness checks
├── auth/                            a feature: app and admin site sign-in, refresh, sign-out, the access token checks
├── users/                           a feature: the signed-in User and their profile
└── administrators/                  a feature: the Administrators, who register and remove each other
scripts/                             commands run by hand, such as `pnpm keys:generate`
test/                                tests, run against PostgreSQL and Redis in containers
```

## Database

The main server keeps its records in its own database, `main`, under its own role, `main`. That role cannot reach the
match server's database.

To change the schema, with the data stores running and `.env` in place:

1. Edit `prisma/schema.prisma`.
2. Record the change as a migration and apply it to your database. Name it after what it does:

   ```bash
   pnpm exec prisma migrate dev --name add-parties
   ```

3. Regenerate Prisma Client, so that the code sees the new schema:

   ```bash
   pnpm exec prisma generate
   ```

4. Commit `schema.prisma` and the new folder in `prisma/migrations/` together.

`pnpm db:migrate` brings any database up to the current schema by applying the migrations it has not seen yet.

Prisma is pinned at 7.10.0. Ignore the message that suggests updating to Prisma 8.

## Adding a feature module

The steps add a feature named `party`. Use a short lowercase name, with dashes between words (`global-event`).

1. Create the module. It lands in `src/party/` and is added to `AppModule`:

   ```bash
   pnpm exec nest g module party
   ```

2. Create the controller, which holds the HTTP routes, and the service, which holds the logic. Both are registered in
   `PartyModule`. `--no-spec` skips unit test files, because this project tests through HTTP (step 8):

   ```bash
   pnpm exec nest g controller party --no-spec
   pnpm exec nest g service party --no-spec
   ```

3. Every route is exactly one of three kinds. Unmarked, it is a User's: it needs a User's access token, and a request
   without one gets 401. Mark a route, or a whole controller, with `@Public()` to open it to anyone, or with
   `@AdministratorOnly()` to give it to [Administrators](#administrators). A marking on a handler replaces its
   controller's, so mark a handler with one of them at most. A handler reads the signed-in User with
   `@CurrentUser() user: SignedInUser`, as `src/users/users.controller.ts` does.
4. Put request and response shapes in `src/party/dto/`. Describe a request body as a zod schema and give it to the
   decorator, as `src/auth/dto/sign-in.dto.ts` and `AuthController` do: `@Body({ schema: signInSchema })`. A body that
   does not match gets 400 with a message naming the field. A stored record is a model in `prisma/schema.prisma`
   (step 5), and the code uses the type that Prisma Client generates for it:
   `import { Party } from '../generated/prisma/client.js'`. That type exists only at compile time, so add a class to
   `src/party/entities/` only when a record is needed as a class, for example to put decorators on its fields:
   `class PartyEntity implements Party`. Everything else that belongs to the feature stays inside `src/party/`.
5. If the feature stores records, add its models to `prisma/schema.prisma` and record a migration (see
   [Database](#database)). Read and write them by injecting `PrismaService`. Every record is identified by a UUID v4
   generated by the database:

   ```prisma
   id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
   ```

6. If another feature needs `PartyService`, add it to `exports` in `PartyModule` and add `PartyModule` to the
   other module's `imports`. Code shared by two or more features goes in `src/common/`.
7. If the feature needs a new setting, add it to the schema in `src/common/settings.ts`, to `.env.example`, to your own
   `.env` and to the settings in `test/global-setup.ts`. Compose passes `.env` to the server. Add the setting to the
   `main-server` service's `environment` in `compose.yaml` only when it needs another value inside Compose, as the
   database and Redis addresses do. Read it by injecting `ConfigService<Settings, true>` and calling
   `get('NAME', { infer: true })`.
8. Write `test/party.e2e-spec.ts`. Start the server with `startApp` from `test/start-app.ts` and call its routes
   with `supertest`, as `test/health.e2e-spec.ts` does. `signIn` from `test/sign-in.ts` signs in a new User and
   returns its tokens, and `signInAsAdministrator` signs in an Administrator. oxlint's `max-lines` (300) and
   `max-lines-per-function` (50) apply to tests too: split a long file by route, as `test/refresh.e2e-spec.ts` and
   `test/sign-out.e2e-spec.ts` split the auth tests, and a long `describe` into several.
9. Run `pnpm format`, then the four checks.

Import classes with a plain `import { PartyService } from ...`, never `import type`. Nest looks the class up at
runtime to inject it. An interface in a handler's parameters is the exception: TypeScript requires
`import { CurrentUser, type SignedInUser } from ...`.

## Making a handler safe to repeat

A phone sends a request again when the response was lost. Mark a handler that creates something a User would notice
twice with `@Idempotent()` from `@nestjs/idempotency`
([documentation](https://docs.nestjs.com/reliability/idempotency)):

```ts
@Post()
@Idempotent({ required: true })
create(@Body({ schema: createPartySchema }) body: CreatePartyDto, @CurrentUser() user: SignedInUser) {
```

- The app creates a key, such as a UUID, when the User acts, and sends it in the `Idempotency-Key` header with every
  retry of that action. With `required: true`, a request without one gets 400 `IDEMPOTENCY_KEY_REQUIRED`.
- The handler runs once for each key and each User or Administrator. For 24 hours, a repeat gets the stored status and
  body with `Idempotent-Replayed: true`. A repeat while the first request is still running gets 409
  `IDEMPOTENCY_KEY_IN_USE` with `Retry-After`, and the same key with another body or address gets 422
  `IDEMPOTENCY_KEY_REUSED`.
- A server error (5xx) is not stored, so the same key can be tried again. A 4xx answer is stored like a success.
- Keys are kept apart by the signed-in User or Administrator, so do not mark a `@Public()` route: without one, every
  caller would share one set of keys.
- The key removes repeats of one attempt. Keep the feature's own rules, such as one Party for each User: two taps
  send two keys.
- Register a global interceptor (`APP_INTERCEPTOR`) in the feature's module, which `AppModule` imports after
  `IdempotencyModule`, never in `AppModule`'s providers, so that the idempotency interceptor runs outside it.
- In a test, send the key with `.set('Idempotency-Key', randomUUID())`, as `test/idempotency.e2e-spec.ts` does.

The results are kept in Redis by `src/common/redis-idempotency.store.ts`.
