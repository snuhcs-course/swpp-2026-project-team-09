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

`.env.example` already holds the team's Google client IDs in `GOOGLE_CLIENT_IDS` (see [Sign-in](#sign-in)).

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

- `POST /auth/google` with `{ "idToken": "..." }` answers `200 { "accessToken": "...", "refreshToken": "..." }`. The
  first sign-in of a Google account creates its User.
- Only SNU accounts get in: the token's hosted domain claim must be `snu.ac.kr` and its email address verified. Another
  account gets 403. An invalid or expired ID token, or one issued to a client not in `GOOGLE_CLIENT_IDS`, gets 401.
- The access token is valid for 1 hour. Send it as `Authorization: Bearer <accessToken>`. `GET /users/me` answers the
  signed-in User. The refresh token is valid for 30 days, and only its hash is stored.
- Once the access token has expired, `POST /auth/refresh` with `{ "refreshToken": "..." }` and no access token answers
  with new tokens in the same form. The refresh token is used up: the answer holds a new one, valid for 30 days from
  the refresh. An unknown, expired or revoked refresh token gets 401.
- Send one refresh at a time. When a used refresh token comes back, even in a second request sent at the same moment,
  the server takes it for a stolen copy: it revokes the tokens that replaced it, and the app has to sign in again.
- `POST /auth/sign-out` with the access token answers 204. It revokes every refresh token of the User, on every phone,
  and turns the User's Master Switch off. An access token already issued stays valid until it expires.

`GOOGLE_CLIENT_IDS` lists the OAuth client IDs of the app and the admin site, separated by commas. They are not secrets.
Access tokens are signed with ES256 and `ACCESS_TOKEN_PRIVATE_KEY`. Another server that checks them is given only
`ACCESS_TOKEN_PUBLIC_KEY`, never the private key; the socket server is the first, in ticket 11.

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
│   ├── public.decorator.ts          @Public(): opens a route to requests without an access token
│   └── current-user.decorator.ts    @CurrentUser(): the signed-in User in a handler
├── generated/                       Prisma Client, generated by `pnpm install` (not committed)
├── health/                          a feature: the liveness and readiness checks
├── auth/                            a feature: sign-in, refresh, sign-out, and the access token check on every route
└── users/                           a feature: the signed-in User
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
   pnpm exec prisma migrate dev --name add-profile
   ```

3. Regenerate Prisma Client, so that the code sees the new schema:

   ```bash
   pnpm exec prisma generate
   ```

4. Commit `schema.prisma` and the new folder in `prisma/migrations/` together.

`pnpm db:migrate` brings any database up to the current schema by applying the migrations it has not seen yet.

Prisma is pinned at 7.10.0. Ignore the message that suggests updating to Prisma 8.

## Adding a feature module

The steps add a feature named `profile`. Use a short lowercase name, with dashes between words (`global-event`).

1. Create the module. It lands in `src/profile/` and is added to `AppModule`:

   ```bash
   pnpm exec nest g module profile
   ```

2. Create the controller, which holds the HTTP routes, and the service, which holds the logic. Both are registered in
   `ProfileModule`. `--no-spec` skips unit test files, because this project tests through HTTP (step 8):

   ```bash
   pnpm exec nest g controller profile --no-spec
   pnpm exec nest g service profile --no-spec
   ```

3. Every route needs a valid access token; a request without one gets 401. Mark a route, or a whole controller, with
   `@Public()` to open it. A handler reads the signed-in User with `@CurrentUser() user: SignedInUser`, as
   `src/users/users.controller.ts` does.
4. Put request and response shapes in `src/profile/dto/`. Describe a request body as a zod schema and give it to the
   decorator, as `src/auth/dto/sign-in.dto.ts` and `AuthController` do: `@Body({ schema: signInSchema })`. A body that
   does not match gets 400 with a message naming the field. A stored record is a model in `prisma/schema.prisma`
   (step 5), and the code uses the type that Prisma Client generates for it:
   `import { Profile } from '../generated/prisma/client.js'`. That type exists only at compile time, so add a class to
   `src/profile/entities/` only when a record is needed as a class, for example to put decorators on its fields:
   `class ProfileEntity implements Profile`. Everything else that belongs to the feature stays inside `src/profile/`.
5. If the feature stores records, add its models to `prisma/schema.prisma` and record a migration (see
   [Database](#database)). Read and write them by injecting `PrismaService`. Every record is identified by a UUID v4
   generated by the database:

   ```prisma
   id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
   ```

6. If another feature needs `ProfileService`, add it to `exports` in `ProfileModule` and add `ProfileModule` to the
   other module's `imports`. Code shared by two or more features goes in `src/common/`.
7. If the feature needs a new setting, add it to the schema in `src/common/settings.ts`, to `.env.example`, to your own
   `.env` and to the settings in `test/global-setup.ts`. Compose passes `.env` to the server. Add the setting to the
   `main-server` service's `environment` in `compose.yaml` only when it needs another value inside Compose, as the
   database and Redis addresses do. Read it by injecting `ConfigService<Settings, true>` and calling
   `get('NAME', { infer: true })`.
8. Write `test/profile.e2e-spec.ts`. Start the server with `startApp` from `test/start-app.ts` and call its routes
   with `supertest`, as `test/health.e2e-spec.ts` does. `signIn` from `test/sign-in.ts` signs in a new User and
   returns its tokens. oxlint's `max-lines` (300) and `max-lines-per-function` (50) apply to tests too: split a long
   file by route, as `test/refresh.e2e-spec.ts` and `test/sign-out.e2e-spec.ts` split the auth tests, and a long
   `describe` into several.
9. Run `pnpm format`, then the four checks.

Import classes with a plain `import { ProfileService } from ...`, never `import type`. Nest looks the class up at
runtime to inject it. An interface in a handler's parameters is the exception: TypeScript requires
`import { CurrentUser, type SignedInUser } from ...`.
