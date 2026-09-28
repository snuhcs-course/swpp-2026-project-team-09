# worker-server

The SNU Now worker server. It follows the main server's layout, settings and checks. It keeps no data of its own.

## Run it

You need Node.js 24, pnpm and Docker. pnpm switches itself to the version declared in `package.json`.

To run the whole system, in the repository root:

```bash
docker compose up --build
```

While you work on the worker server, start only Redis in the repository root and run the server yourself in
`worker-server/`:

```bash
docker compose up -d redis
```

```bash
pnpm install
cp .env.example .env
pnpm start:dev
```

The server answers two health checks:

- `GET http://localhost:3002/health/live`: liveness, the process is up.
- `GET http://localhost:3002/health/ready`: readiness, Redis can be reached. It answers 503 and names Redis when it
  cannot.

If a setting in `.env` is missing or invalid, the server stops and names it, for example
`Config validation error: PORT: Invalid input: expected string, received undefined`.

The server also stops at startup when it cannot reach Redis. Start it first with `docker compose up -d redis`.
Once the server is running, Redis going down makes readiness answer 503 instead.

## Checks

Each command fails when it finds a problem. Run all four before opening a pull request.

| Command             | Checks                                       |
| ------------------- | -------------------------------------------- |
| `pnpm lint`         | oxlint with type-aware rules                 |
| `pnpm format:check` | Prettier formatting (`pnpm format` fixes it) |
| `pnpm typecheck`    | TypeScript in strict mode                    |
| `pnpm test`         | Vitest tests in `test/`                      |

`pnpm test` needs Docker running. It starts its own Redis container and removes it afterwards.

## Folder layout

```text
src/
├── main.ts                          starts the server and connects it to messaging
├── app.module.ts                    root module, imports every feature module
├── common/                          code shared by two or more features
│   ├── settings.ts                  settings schema, checked at startup
│   ├── messaging.module.ts          makes the messaging client available to every feature
│   └── messaging.ts                 options for NestJS messaging over Redis
└── health/                          a feature: the liveness and readiness checks
test/                                tests, run against Redis in a container
```

## Adding a feature module

The steps add a feature named `menu`. Use a short lowercase name, with dashes between words (`shuttle-stop`).

1. Create the module. It lands in `src/menu/` and is added to `AppModule`:

   ```bash
   pnpm exec nest g module menu
   ```

2. Create the controller, which holds the HTTP routes, and the service, which holds the logic. Both are registered in
   `MenuModule`. `--no-spec` skips unit test files, because this project tests through HTTP (step 6):

   ```bash
   pnpm exec nest g controller menu --no-spec
   pnpm exec nest g service menu --no-spec
   ```

3. Put request and response shapes in `src/menu/dto/`. There is no `entities/` folder, because the worker server
   stores no records. Everything that belongs to the feature stays inside `src/menu/`.
4. If another feature needs `MenuService`, add it to `exports` in `MenuModule` and add `MenuModule` to the other
   module's `imports`. Code shared by two or more features goes in `src/common/`.
5. If the feature needs a new setting, add it to the schema in `src/common/settings.ts`, to `.env.example`, to your own
   `.env`, to the `worker-server` service in `compose.yaml` at the repository root and to the settings in
   `test/global-setup.ts`. Read it by injecting `ConfigService<Settings, true>` and calling
   `get('NAME', { infer: true })`.
6. Write `test/menu.e2e-spec.ts`. Start the server with `startApp` from `test/start-app.ts` and call its routes with
   `supertest`, as `test/health.e2e-spec.ts` does.
7. Run `pnpm format`, then the four checks.

Import classes with a plain `import { MenuService } from ...`, never `import type`. Nest looks the class up at runtime
to inject it.
