# main-server

The main SNU Now server. The other servers copy its layout, settings and checks.

## Run it

You need Node.js 24 and pnpm. pnpm switches itself to the version declared in `package.json`. In `main-server/`:

```bash
pnpm install
cp .env.example .env
pnpm start:dev
```

The server answers two health checks:

- `GET http://localhost:3000/health/live`: liveness, the process is up.
- `GET http://localhost:3000/health/ready`: readiness, the server can serve requests.

If a setting in `.env` is missing or invalid, the server stops and names it, for example
`Config validation error: PORT: Invalid input: expected string, received undefined`.

## Checks

Each command fails when it finds a problem. Run all four before opening a pull request.

| Command             | Checks                                       |
| ------------------- | -------------------------------------------- |
| `pnpm lint`         | oxlint with type-aware rules                 |
| `pnpm format:check` | Prettier formatting (`pnpm format` fixes it) |
| `pnpm typecheck`    | TypeScript in strict mode                    |
| `pnpm test`         | Vitest tests in `test/`                      |

## Folder layout

```text
src/
├── main.ts          starts the server
├── app.module.ts    root module, imports every feature module
├── common/          code shared by two or more features
│   └── settings.ts  settings schema, checked at startup
└── health/          a feature: the liveness and readiness checks
test/                tests that call the server over HTTP
```

## Adding a feature module

The steps add a feature named `profile`. Use a short lowercase name, with dashes between words (`global-event`).

1. Create the module. It lands in `src/profile/` and is added to `AppModule`:

   ```bash
   pnpm exec nest g module profile
   ```

2. Create the controller, which holds the HTTP routes, and the service, which holds the logic. Both are registered in
   `ProfileModule`. `--no-spec` skips unit test files, because this project tests through HTTP (step 6):

   ```bash
   pnpm exec nest g controller profile --no-spec
   pnpm exec nest g service profile --no-spec
   ```

3. Put request and response shapes in `src/profile/dto/` and stored records in `src/profile/entities/`. Everything
   that belongs to the feature stays inside `src/profile/`.
4. If another feature needs `ProfileService`, add it to `exports` in `ProfileModule` and add `ProfileModule` to the
   other module's `imports`. Code shared by two or more features goes in `src/common/`.
5. If the feature needs a new setting, add it to the schema in `src/common/settings.ts`, to `.env.example` and to your
   own `.env`. Read it by injecting `ConfigService<Settings, true>` and calling `get('NAME', { infer: true })`.
6. Write `test/profile.e2e-spec.ts`. Start the server with `startApp` from `test/start-app.ts` and call its routes
   with `supertest`, as `test/health.e2e-spec.ts` does.
7. Run `pnpm format`, then the four checks.

Import classes with a plain `import { ProfileService } from ...`, never `import type`. Nest looks the class up at
runtime to inject it.
