# socket-server

The SNU Now socket server. It will push signals and positions to the apps over Socket.IO. It holds no data. It follows
the [main server](../main-server/README.md): the same layout, settings and checks.

## Run it

You need Node.js 24, pnpm and Docker. pnpm switches itself to the version declared in `package.json`.

To run the whole system, in the repository root:

```bash
docker compose up --build
```

While you work on the socket server, start only Redis in the repository root and run the server yourself in
`socket-server/`:

```bash
docker compose up -d redis
```

```bash
pnpm install
cp .env.example .env
pnpm start:dev
```

The server answers two health checks:

- `GET http://localhost:3001/health/live`: liveness, the process is up.
- `GET http://localhost:3001/health/ready`: readiness, Redis can be reached. It answers 503 and names Redis when it
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
│   └── messaging.ts                 options for NestJS messaging over Redis
└── health/                          a feature: the liveness and readiness checks
test/                                tests, run against Redis in a container
```

## Adding a feature module

The steps add a feature named `signal`. Use a short lowercase name, with dashes between words (`location-sharing`).

1. Create the module. It lands in `src/signal/` and is added to `AppModule`:

   ```bash
   pnpm exec nest g module signal
   ```

2. Create the controller, which holds the HTTP routes, and the service, which holds the logic. Both are registered in
   `SignalModule`. `--no-spec` skips unit test files, because this project tests through HTTP (step 6):

   ```bash
   pnpm exec nest g controller signal --no-spec
   pnpm exec nest g service signal --no-spec
   ```

3. Put request and response shapes in `src/signal/dto/`. There is no `entities/` folder, because the socket server
   stores no records. Everything that belongs to the feature stays inside `src/signal/`.
4. If another feature needs `SignalService`, add it to `exports` in `SignalModule` and add `SignalModule` to the other
   module's `imports`. Code shared by two or more features goes in `src/common/`.
5. If the feature needs a new setting, add it to the schema in `src/common/settings.ts`, to `.env.example`, to your own
   `.env`, to the `socket-server` service in `compose.yaml` at the repository root and to the settings in
   `test/global-setup.ts`. Read it by injecting `ConfigService<Settings, true>` and calling
   `get('NAME', { infer: true })`.
6. Write `test/signal.e2e-spec.ts`. Start the server with `startApp` from `test/start-app.ts` and call its routes with
   `supertest`, as `test/health.e2e-spec.ts` does.
7. Run `pnpm format`, then the four checks.

Import classes with a plain `import { SignalService } from ...`, never `import type`. Nest looks the class up at
runtime to inject it.
